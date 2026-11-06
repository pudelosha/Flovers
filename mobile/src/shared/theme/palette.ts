export type ThemeContrast = 'surface' | 'photo' | 'accent' | 'dark' | 'mask';
export type ColorRole = 'foreground' | 'background' | 'border' | 'gradient';
export const LIGHT_COLORS = {
  background: '#E5F2EC',
  surface: '#F8FCFA',
  surfaceAlt: '#EEF8F2',
  text: '#103D32',
  secondary: '#42675C',
  primary: '#0B7285',
  accent: '#078573',
  border: '#BCD9CB',
  modal: '#F2F8F4',
};
export const DARK_COLORS = {
  background: '#05261F',
  surface: '#183D33',
  surfaceAlt: '#244C40',
  text: '#FFFFFF',
  secondary: '#D0E1DA',
  primary: '#0B7285',
  accent: '#20C997',
  border: 'rgba(255,255,255,0.18)',
  modal: '#17382F',
};
type RGBA = { r: number; g: number; b: number; a: number };
function parse(value: string): RGBA | null {
  const v = value.trim().toLowerCase();
  if (v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (v === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if (v === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  if (/^#[0-9a-f]{3,4}$/.test(v))
    return parse(
      '#' +
        v
          .slice(1)
          .split('')
          .map(c => c + c)
          .join(''),
    );
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(v))
    return {
      r: parseInt(v.slice(1, 3), 16),
      g: parseInt(v.slice(3, 5), 16),
      b: parseInt(v.slice(5, 7), 16),
      a: v.length === 9 ? parseInt(v.slice(7, 9), 16) / 255 : 1,
    };
  const m =
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(
      v,
    );
  return m
    ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] }
    : null;
}
function rgba(c: RGBA) {
  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(
    c.b,
  )},${+c.a.toFixed(3)})`;
}
function luminance(c: RGBA) {
  const channel = (v: number) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}
export function contrastRatio(a: string, b: string) {
  const x = parse(a),
    y = parse(b);
  if (!x || !y) return 1;
  const p = luminance(x),
    q = luminance(y);
  return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05);
}
function readable(c: RGBA) {
  let out = { ...c, a: Math.max(0.65, c.a) };
  for (
    let i = 0;
    i < 16 && contrastRatio(rgba(out), LIGHT_COLORS.surface) < 4.5;
    i++
  )
    out = { ...out, r: out.r * 0.86, g: out.g * 0.86, b: out.b * 0.86 };
  return rgba(out);
}
/** Explicit legacy colour roles, not colour inversion. Dimensions and animations stay untouched. */
export function themeColor(
  value: unknown,
  role: ColorRole,
  isLight: boolean,
  contrast: ThemeContrast = 'surface',
): any {
  if (
    !isLight ||
    typeof value !== 'string' ||
    contrast === 'photo' ||
    contrast === 'dark' ||
    contrast === 'mask'
  )
    return value;
  const c = parse(value);
  if (!c || c.a === 0) return value;
  if (contrast === 'accent' && role === 'foreground') return value;
  const white = Math.min(c.r, c.g, c.b) >= 210,
    black = Math.max(c.r, c.g, c.b) <= 60;
  const greenDark = c.g >= c.r && c.g >= c.b && c.g < 115 && c.r < 75;
  if (role === 'foreground') {
    if (white || black) return rgba({ r: 16, g: 61, b: 50, a: c.a });
    return readable(c);
  }
  if (role === 'border')
    return white || black
      ? rgba({ r: 32, g: 105, b: 80, a: Math.min(0.3, c.a) })
      : value;
  if (role === 'gradient') {
    if (white) return c.a === 1 && c.r === 255 && c.g === 255 && c.b === 255
      ? LIGHT_COLORS.surface : value; // Keep existing translucent highlights.
    if (black || greenDark)
      return c.a < 0.05 ? value : c.a >= 0.65 ? LIGHT_COLORS.surface : `rgba(255,255,255,${c.a})`;
    return rgba({
      r: 230 + c.r * 0.08,
      g: 237 + c.g * 0.06,
      b: 232 + c.b * 0.07,
      a: c.a,
    });
  }
  if (contrast === 'accent') return value;
  if (white)
    return c.a > 0.8
      ? LIGHT_COLORS.surface
      : rgba({ r: 15, g: 115, b: 85, a: Math.min(0.18, c.a * 0.65) });
  if (black)
    return c.a < 0.4
      ? rgba({ r: 24, g: 100, b: 75, a: c.a * 0.35 })
      : LIGHT_COLORS.surface;
  if (greenDark) return LIGHT_COLORS.surface;
  // Keep opaque action colours (buttons/chart series); tint translucent accents on light surfaces.
  return c.a < 0.65 ? rgba({ ...c, a: c.a * 0.6 }) : value;
}
export function isAccentSurface(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const c = parse(value);
  if (!c || c.a < 0.7) return false;
  const saturated = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) > 65;
  const legacyGlass = c.g >= c.r && c.g >= c.b && c.g < 115 && c.r < 75;
  return saturated && !legacyGlass && luminance(c) < 0.48;
}

/** Opaque pastel task colour fading into a white surface, shared by all task tiles. */
export function taskSurfaceGradient(accent: string): string[] {
  const c = parse(accent) || { r: 40, g: 160, b: 210, a: 1 };
  const tint = (strength: number) =>
    rgba({
      r: 255 + (c.r - 255) * strength,
      g: 255 + (c.g - 255) * strength,
      b: 255 + (c.b - 255) * strength,
      a: 1,
    });
  return [tint(0.42), tint(0.22), tint(0.07), '#F8FCFA'];
}
