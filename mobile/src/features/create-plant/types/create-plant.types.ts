export type WizardStep =
  | "selectPlant"
  | "traits"
  | "location"
  | "exposure"
  | "potType"
  | "autoTasks"
  | "photo"      // Step 7
  | "name"       // Step 8
  | "creating"   // Step 9
  | "distance"
  | "summary";

export type SelectedPlant = {
  id?: string;      // backend id stored as string in state
  name?: string;
  latin?: string;
  predefined?: boolean;
};

export type LocationCategory = "indoor" | "outdoor" | "other";

/** exposure types */
export type LightLevel = "bright-direct" | "bright-indirect" | "medium" | "low" | "very-low";
export type Orientation = "N" | "E" | "S" | "W";

/** container & soil types */
export type PotMaterial =
  | "unspecified"
  | "plastic"
  | "ceramic-glazed"
  | "terracotta"
  | "concrete"
  | "metal"
  | "wood"
  | "glass"
  | "stone"
  | "fabric-grow-bag"
  | "self-watering"
  | "hanging-basket"
  | "hydro-net-pot"
  | "biodegradable"
  | "3d-printed";

export type SoilMix =
  | "unspecified"
  | "all-purpose"
  | "peat-based"
  | "coco-coir"
  | "cactus-succulent"
  | "orchid-bark"
  | "aroid-chunky"
  | "african-violet"
  | "seed-starting"
  | "bonsai-akadama"
  | "leca"
  | "pon-inorganic"
  | "sphagnum-moss"
  | "loam"
  | "sandy"
  | "clay"
  | "sand-soil-1-1"
  | "sand-soil-2-1"
  | "perlite-heavy";

/** Location kept in wizard state. NOTE: id is string in state. */
export type UserLocation = {
  id: string;
  name: string;
  category: LocationCategory;
};

/** Backend shape for locations (what the API returns/accepts) */
export type ApiLocation = {
  id: number;
  name: string;
  category: LocationCategory;
};
export type CreateLocationPayload = {
  name: string;
  category: LocationCategory;
};

export type LastWatered =
  | "today"
  | "yesterday"
  | "three-four-days"
  | "one-week"
  | "two-weeks"
  | "unknown";

export type LastRepotted =
  | "this-week"
  | "one-week-ago"
  | "two-weeks-ago"
  | "one-month-ago"
  | "unknown";

export type WizardState = {
  step: WizardStep;
  plantQuery: string;
  selectedPlant?: SelectedPlant;

  // Step 3
  locations: UserLocation[];
  /** string id if selected; null = explicitly none selected */
  selectedLocationId: string | null;

  // Step 4 – Exposure
  lightLevel: LightLevel;
  orientation: Orientation;
  /** store distance in centimeters internally */
  distanceCm: number;

  // Step 5 – Container & Soil (optional)
  potMaterial?: PotMaterial; // omit or "unspecified" = not set
  soilMix?: SoilMix;         // omit or "unspecified" = not set

  // Step 6 – Auto tasks
  createAutoTasks?: boolean;
  waterTaskEnabled?: boolean;
  repotTaskEnabled?: boolean;
  moistureRequired?: boolean;
  fertilizeRequired?: boolean;
  careRequired?: boolean;
  lastWatered?: LastWatered;
  lastRepotted?: LastRepotted;
  moistureIntervalDays?: number;   // 1..30
  fertilizeIntervalDays?: number;  // 1..60
  careIntervalDays?: number;       // 1..60
  repotIntervalMonths?: number;    // 1..12

  // Step 7 – Photo (local-only)
  photoUri?: string;

  // Step 8 – Name & Notes
  displayName?: string;
  notes?: string;
  /** ISO string "YYYY-MM-DD" (local) */
  purchaseDateISO?: string;

  // Step 9 – Creating result
  createdPlantId?: string;
};

// add under other types
export type SunRequirement = "low" | "medium" | "high";
export type WaterRequirement = "low" | "medium" | "high";
export type DifficultyLevel = "easy" | "medium" | "hard";

export type PopularPlant = {
  id: string;             // state uses string ids; serialize API ids to string
  name: string;
  latin: string;
  image: string;
  sun: SunRequirement;
  water: WaterRequirement;
  difficulty: DifficultyLevel;
};

export type Suggestion = {
  id: string;             // serialize API numeric id to string for state
  name: string;
  latin: string;
};

export type PlantTrait = {
  key: string;   // e.g. "sun", "soil", "temp", ...
  value: string; // human text shown in UI
};

export type PlantProfile = {
  id?: string;          // optional; useful when fetched by id
  name?: string;        // optional; useful when fetched by name
  latin?: string;       // optional
  image: string;        // hero image URL
  description: string;  // long paragraph
  traits: PlantTrait[]; // list rendered in Step 2
};

export type PlantDefinition = {
  id: string;                 // always serialized to string for state
  name: string;
  latin: string;
  image: string | null;       // API may return null if no image
  sun: SunRequirement;
  water: WaterRequirement;
  difficulty: DifficultyLevel;
  popular: boolean;           // popular items come as true from the endpoint
};
