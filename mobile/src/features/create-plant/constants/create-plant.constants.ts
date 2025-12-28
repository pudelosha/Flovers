// constants/create-plant.constants.ts
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
  indoor: ["Living room", "Kitchen", "Dining room", "Bedroom", "Bathroom", "Hallway", "Office", "Kids room"],
  outdoor: ["Balcony", "Terrace", "Patio", "Garden", "Front yard", "Backyard", "Porch", "Greenhouse"],
  other: ["Staircase", "Garage", "Basement", "Lobby", "Sunroom", "Workshop", "Studio", "Attic"],
} as const;

// ---------- 🔵 Step 4 exposure options ----------
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
// 🔵 Step 5 – Container & Soil constants
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
  label: string;
  description: string;
}>;

export const POT_MATERIALS: readonly PotMaterialOption[] = [
  { key: "plastic", label: "Plastic", description: "Lightweight, retains moisture longer; inexpensive and versatile." },
  { key: "ceramic", label: "Ceramic (glazed)", description: "Heavier; retains moisture; decorative glazed finish." },
  { key: "terracotta", label: "Terracotta", description: "Porous clay; wicks moisture; great for succulents/cacti." },
  { key: "clay", label: "Clay (unglazed)", description: "Similar to terracotta; breathable, faster drying." },
  { key: "cement", label: "Cement", description: "Very heavy; modern look; retains moisture quite well." },
  { key: "concrete", label: "Concrete", description: "Durable and heavy; stable outdoors; retains moisture." },
  { key: "metal", label: "Metal (generic)", description: "Can heat quickly in sun; usually needs inner liner/pot." },
  { key: "stainless", label: "Stainless steel", description: "Modern look; corrosion-resistant; may heat up in sun." },
  { key: "aluminum", label: "Aluminum", description: "Light, conductive; watch for overheating in bright sun." },
  { key: "iron", label: "Iron / steel", description: "Very durable; can rust; may require liners." },
  { key: "copper", label: "Copper / brass", description: "Decorative; may react with soil; typically as cachepot." },
  { key: "wood", label: "Wood", description: "Natural look; may need liner; can rot if constantly wet." },
  { key: "bamboo", label: "Bamboo", description: "Light, sustainable; usually lined; indoor use preferred." },
  { key: "rattan", label: "Rattan / wicker", description: "Decorative cachepots; use a plastic nursery pot inside." },
  { key: "glass", label: "Glass", description: "Great for terrariums; no drainage; watch moisture." },
  { key: "stone", label: "Stone / marble", description: "Very heavy and stable; retains cool temperature." },
  { key: "resin", label: "Resin", description: "Lightweight, durable; good outdoor choice; insulates roots." },
  { key: "fiberglass", label: "Fiberglass", description: "Light, strong; outdoor friendly; good insulation." },
  { key: "biodegradable", label: "Biodegradable", description: "Coconut coir, peat, etc.; starter pots; decompose over time." },
  { key: "fabric", label: "Fabric planter", description: "Air-prunes roots; fast drying; good for vegetables." },
  { key: "grow-bag", label: "Grow bag", description: "Fabric bag; portable; drains fast; needs frequent watering." },
  { key: "self-watering", label: "Self-watering", description: "Reservoir with wicking; evens out watering schedule." },
] as const;

export type SoilMixKey =
  | "all-purpose"
  | "peat-based"
  | "peat-free"
  | "coco-coir"
  | "succulent-cactus"
  | "orchid-bark"
  | "bonsai"
  | "african-violet"
  | "carnivorous"
  | "seed-starting"
  | "loam"
  | "sandy"
  | "sandy-loam"
  | "silt"
  | "clay-heavy"
  | "perlite-blend"
  | "pumice-blend"
  | "vermiculite-blend"
  | "bioactive"
  | "hydroponic-leca"
  | "self-mixed";

type SoilMixOption = Readonly<{
  key: SoilMixKey;
  label: string;
  description: string;
}>;

export const SOIL_MIXES: readonly SoilMixOption[] = [
  { key: "all-purpose", label: "All-purpose potting mix", description: "Balanced mix for most houseplants; retains moisture with good aeration." },
  { key: "peat-based", label: "Peat-based mix", description: "Moisture-retentive; common in many commercial potting mixes." },
  { key: "peat-free", label: "Peat-free mix", description: "Eco-friendlier alternative; often coir-based with composted materials." },
  { key: "coco-coir", label: "Coco coir mix", description: "Holds water well; resists compaction; good peat alternative." },
  { key: "succulent-cactus", label: "Succulent / cactus mix", description: "Very fast draining; high mineral content (sand/pumice/perlite)." },
  { key: "orchid-bark", label: "Orchid bark mix", description: "Chunky bark + perlite/charcoal; excellent aeration for epiphytes." },
  { key: "bonsai", label: "Bonsai mix", description: "Inorganic, very free-draining; akadama/pumice/lava blends." },
  { key: "african-violet", label: "African violet mix", description: "Light, airy, moisture-retentive; fine texture." },
  { key: "carnivorous", label: "Carnivorous plant mix", description: "Nutrient-poor peat/coir + sand; no fertilizers." },
  { key: "seed-starting", label: "Seed-starting mix", description: "Sterile, very fine and airy; supports germination." },
  { key: "loam", label: "Loam (garden)", description: "Balanced sand/silt/clay; add perlite/organic matter for pots." },
  { key: "sandy", label: "Sandy", description: "Fast drainage; low water retention; add organic matter to enrich." },
  { key: "sandy-loam", label: "Sandy loam", description: "Nice balance; drains well; good for many container plants." },
  { key: "silt", label: "Silty", description: "Fertile but compacts; mix with perlite/bark for aeration in pots." },
  { key: "clay-heavy", label: "Clay-heavy", description: "Holds water; tends to compact; lighten with perlite/pumice/bark." },
  { key: "perlite-blend", label: "Perlite-rich blend", description: "Boosts aeration and drainage in standard mixes." },
  { key: "pumice-blend", label: "Pumice-rich blend", description: "Like perlite but heavier; improves drainage and structure." },
  { key: "vermiculite-blend", label: "Vermiculite-rich blend", description: "Holds moisture and nutrients; good in seed-starting." },
  { key: "bioactive", label: "Bioactive / worm castings", description: "Living soil with compost and microbes; slow-release nutrition." },
  { key: "hydroponic-leca", label: "LECA / semi-hydro", description: "Inert clay balls; water reservoir feeding; great root aeration." },
  { key: "self-mixed", label: "Custom self-mixed", description: "Your own recipe — note the ingredients you use." },
] as const;

/** 🔵 Step 6 – Auto tasks dropdown options */
export const LAST_WATERED_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "three-four-days", label: "3–4 days ago" },
  { key: "one-week", label: "A week ago" },
  { key: "two-weeks", label: "2 weeks ago" },
  { key: "unknown", label: "I don’t remember" },
] as const;

export const LAST_REPOTTED_OPTIONS = [
  { key: "this-week", label: "This week" },
  { key: "one-week-ago", label: "1 week ago" },
  { key: "two-weeks-ago", label: "2 weeks ago" },
  { key: "one-month-ago", label: "1 month ago" },
  { key: "unknown", label: "I don’t remember" },
] as const;
