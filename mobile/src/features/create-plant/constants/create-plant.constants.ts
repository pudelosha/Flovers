import type { PopularPlant, Suggestion } from "../types/create-plant.types";
import type { SunRequirement, WaterRequirement, DifficultyLevel } from "../types/create-plant.types";

// Header tint (consistent with your app)
export const HEADER_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
export const HEADER_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

// Short text labels used under each popular plant row
export const SUN_ICON_BY_LEVEL: Record<SunRequirement, string> = {
  high: "weather-sunny",
  medium: "white-balance-sunny",
  low: "weather-partly-cloudy",
};

export const WATER_ICON_BY_LEVEL: Record<WaterRequirement, string> = {
  high: "water",
  medium: "water-outline",
  low: "water-off",
};

export const DIFFICULTY_ICON_BY_LEVEL: Record<DifficultyLevel, string> = {
  easy: "emoticon-happy-outline",
  medium: "emoticon-neutral-outline",
  hard: "emoticon-sad-outline",
};

/* LABELS (you already had these; keep/export them too) */
export const SUN_LABEL_BY_LEVEL: Record<SunRequirement, string> = {
  high: "High sun",
  medium: "Medium sun",
  low: "Low sun",
};
export const WATER_LABEL_BY_LEVEL: Record<WaterRequirement, string> = {
  high: "High water",
  medium: "Moderate",
  low: "Low water",
};
export const DIFFICULTY_LABEL_BY_LEVEL: Record<DifficultyLevel, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

// ---------- Step 2 mock profile ----------
export const PLANT_PROFILES_MOCK = {
  generic: {
    image: "https://images.unsplash.com/photo-1470058869958-2a77ade41c02?w=1200",
    description:
      "General indoor plant that prefers bright, indirect light and moderate watering. Keep out of cold drafts.",
    traits: [
      { key: "sun", value: "Bright, indirect" },
      { key: "soil", value: "Well-draining" },
      { key: "temp", value: "18–26°C" },
      { key: "humidity", value: "Medium–High" },
      { key: "difficulty", value: "Easy" },
      { key: "toxic", value: "Non-toxic" },
      { key: "watering", value: "Weekly" },
      { key: "moisture", value: "Mist sometimes" },
    ],
  },
};

/**
 * IMPORTANT:
 * Step02 uses backend trait keys like:
 * - temperature, humidity, toxic, growth, soil, sun
 * and core fields like:
 * - water, difficulty, sun
 *
 * If a key is missing here, Step02 falls back to "leaf" which looks like duplicated icons.
 */
export const TRAIT_ICON_BY_KEY: Record<string, string> = {
  // canonical / core
  sun: "white-balance-sunny",
  water: "watering-can-outline",
  difficulty: "arm-flex",

  // backend keys
  soil: "shovel",
  temperature: "thermometer",
  humidity: "water-percent",
  toxic: "alert-octagon-outline",
  growth: "trending-up",

  // aliases (for older data / mocks)
  temp: "thermometer",
  watering: "watering-can-outline",
  moisture: "spray-bottle",
  fertilizer: "sprout",
  light: "white-balance-sunny",
};

export const TRAIT_LABEL_BY_KEY: Record<string, string> = {
  // canonical / core
  sun: "Sun exposure",
  water: "Watering",
  difficulty: "Difficulty",

  // backend keys
  soil: "Soil",
  temperature: "Temperature",
  humidity: "Humidity",
  toxic: "Toxic?",
  growth: "Growth",

  // aliases
  temp: "Temperature",
  watering: "Watering",
  moisture: "Moisture",
  fertilizer: "Fertilizer",
  light: "Light",
};

// ---------- Step 3 predefined location suggestions ----------
export const PREDEFINED_LOCATIONS = {
  indoor: ["livingRoom", "kitchen", "diningRoom", "bedroom", "bathroom", "hallway", "office", "kidsRoom"],
  outdoor: ["balcony", "terrace", "patio", "garden", "frontYard", "backyard", "porch", "greenhouse"],
  other: ["staircase", "garage", "basement", "lobby", "sunroom", "workshop", "studio", "attic"],
} as const;

// ---------- Step 4 exposure options ----------
export const LIGHT_LEVELS = [
  { key: "bright-direct", label: "Bright direct" },
  { key: "bright-indirect", label: "Bright indirect" },
  { key: "medium", label: "Medium / dappled" },
  { key: "low", label: "Low light" },
  { key: "very-low", label: "Very low" },
] as const;

export const ORIENTATIONS = [
  { key: "S", label: "South" },
  { key: "E", label: "East" },
  { key: "W", label: "West" },
  { key: "N", label: "North" },
] as const;

// ===================================================================
// Step 5 – Container & Soil constants
// ===================================================================

export type PotMaterialKey =
  | "plastic"
  | "ceramic"
  | "terracotta"
  | "clay"
  | "cement"
  | "concrete"
  | "metal"
  | "stainless"
  | "aluminum"
  | "iron"
  | "copper"
  | "wood"
  | "bamboo"
  | "rattan"
  | "glass"
  | "stone"
  | "resin"
  | "fiberglass"
  | "biodegradable"
  | "fabric"
  | "grow-bag"
  | "self-watering";

type PotMaterialOption = Readonly<{
  key: PotMaterialKey;
  // optional legacy fields (safe if something else still reads them)
  label?: string;
  description?: string;
}>;

// Keep keys stable; labels/descriptions come from i18n now.
export const POT_MATERIALS: readonly PotMaterialOption[] = [
  { key: "plastic" },
  { key: "ceramic" },
  { key: "terracotta" },
  { key: "clay" },
  { key: "cement" },
  { key: "concrete" },
  { key: "metal" },
  { key: "stainless" },
  { key: "aluminum" },
  { key: "iron" },
  { key: "copper" },
  { key: "wood" },
  { key: "bamboo" },
  { key: "rattan" },
  { key: "glass" },
  { key: "stone" },
  { key: "resin" },
  { key: "fiberglass" },
  { key: "biodegradable" },
  { key: "fabric" },
  { key: "grow-bag" },
  { key: "self-watering" },
] as const;

// Soil: keep it permissive so backend can send new keys without TS breaking.
export type SoilMixKey = string;

type SoilMixOption = Readonly<{
  key: SoilMixKey;
  // optional legacy fields
  label?: string;
  description?: string;
}>;

export const SOIL_MIXES: readonly SoilMixOption[] = [
  { key: "all-purpose" },
  { key: "green-plants" },
  { key: "balcony-flowers" },

  { key: "cactus-succulent" },
  { key: "orchid" },
  { key: "bonsai" },

  { key: "herbs-vegetables" },
  { key: "seed-starting" },

  { key: "citrus" },
  { key: "fern" },
  { key: "conifers" },
  { key: "acid-loving" },

  { key: "aroid" },

  { key: "peat-free" },
] as const;

/** Step 6 – Auto tasks dropdown options */
export const LAST_WATERED_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "three-four-days", label: "3–4 days ago" },
  { key: "one-week", label: "A week ago" },
  { key: "two-weeks", label: "2 weeks ago" },
  { key: "unknown", label: "I don't remember" },
] as const;

export const LAST_REPOTTED_OPTIONS = [
  { key: "this-week", label: "This week" },
  { key: "one-week-ago", label: "1 week ago" },
  { key: "two-weeks-ago", label: "2 weeks ago" },
  { key: "one-month-ago", label: "1 month ago" },
  { key: "unknown", label: "I don't remember" },
] as const;

