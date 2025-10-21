import type { LangOption, BackgroundKey } from "../types/profile.types";

export const HEADER_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
export const HEADER_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

export const LANG_OPTIONS: readonly LangOption[] = [
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "pl", label: "Polski",    flag: "🇵🇱" },
  { code: "de", label: "Deutsch",   flag: "🇩🇪" },
  { code: "fr", label: "Français",  flag: "🇫🇷" },
  { code: "es", label: "Español",   flag: "🇪🇸" },
  { code: "it", label: "Italiano",  flag: "🇮🇹" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "zh", label: "中文",       flag: "🇨🇳" },
  { code: "hi", label: "हिन्दी",     flag: "🇮🇳" },
  { code: "ar", label: "العربية",    flag: "🇸🇦" },
];

export const DATE_OPTIONS = [
  "DD.MM.YYYY",
  "YYYY-MM-DD",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "ddd, DD MMM YYYY",
] as const;

/** Background dropdown options (Background 1 default) */
export const BACKGROUND_OPTIONS: readonly { key: BackgroundKey; label: string }[] = [
  { key: "bg1", label: "Background 1" },
  { key: "bg2", label: "Background 2" },
  { key: "bg3", label: "Background 3" },
  { key: "bg4", label: "Background 4" },
];

/** FAB position dropdown options (Right default) */
export const FAB_POSITION_OPTIONS: readonly { key: "left" | "right"; label: string }[] = [
  { key: "right", label: "Right" },
  { key: "left",  label: "Left" },
];
