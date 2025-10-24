export const HEADER_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
export const HEADER_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

// Keep the same blur treatment as your tiles
export const TILE_BLUR = 20;

// Colors for metrics (reuse palette you liked)
export const METRIC_COLORS = {
  temperature: "#F7831F", // orange
  humidity: "#10B981",    // teal/green
  light: "#F2C94C",       // yellow
  moisture: "#2EA0FF",    // blue
} as const;

export const METRIC_UNITS = {
  temperature: "°C",
  humidity: "%",
  light: "lx",
  moisture: "%",
} as const;

export const METRIC_LABELS = {
  temperature: "Temp",
  humidity: "Hum",
  light: "Light",
  moisture: "Moist",
} as const;

// Active fill for selected buttons (match your wizard's strong teal)
export const ACTIVE_BG = "rgba(11,114,133,0.92)";
