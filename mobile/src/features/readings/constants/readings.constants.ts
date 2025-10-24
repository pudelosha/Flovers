export const HEADER_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
export const HEADER_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

// Match Plants blur
export const TILE_BLUR = 20;

// Circular icon fills (same vibe as your preferred colors)
export const ICON_BG = {
  temperature: "#F7831F", // orange
  humidity: "#10B981",    // green-teal
  light: "#F2C94C",       // yellow
  moisture: "#2EA0FF",    // blue
} as const;

export const METRIC_UNITS = {
  temperature: "°C",
  humidity: "%",
  light: "lx",
  moisture: "%",
} as const;
