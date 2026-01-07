import type { TaskType } from "../types/home.types";

// Header tint (matches other pages)
export const HEADER_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
export const HEADER_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

// Tile blur (used indirectly; blurAmount is set in the tile)
export const TILE_BLUR = 8;

// Accent colors by task type
export const ACCENT_BY_TYPE: Record<TaskType, string> = {
  watering:   "#4dabf7", // blue
  moisture:   "#20c997", // green
  fertilising:"#ffd43b", // yellow
  care:       "#e599f7", // purple
  repot:      "#8B5E3C", // brown (NEW)
};

// Icons by task type
export const ICON_BY_TYPE: Record<TaskType, string> = {
  watering:   "water",
  moisture:   "spray",
  fertilising:"leaf",
  care:       "flower",
  repot:      "pot",
};
