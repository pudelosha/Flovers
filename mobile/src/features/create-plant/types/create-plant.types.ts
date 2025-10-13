// types/create-plant.types.ts

export type WizardStep =
  | "selectPlant"
  | "traits"
  | "location"
  | "exposure"
  | "distance"
  | "potType"
  | "autoTasks"
  | "photo"
  | "name"
  | "summary";

export type SelectedPlant = {
  name?: string;
  latin?: string;
  predefined?: boolean;
};

export type LocationCategory = "indoor" | "outdoor" | "other";

/** NEW: exposure types */
export type LightLevel = "bright-direct" | "bright-indirect" | "medium" | "low" | "very-low";
export type Orientation = "N" | "E" | "S" | "W";

/** NEW: container & soil types */
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

export type UserLocation = {
  id: string;
  name: string;
  category: LocationCategory;
};

export type WizardState = {
  step: WizardStep;
  plantQuery: string;
  selectedPlant?: SelectedPlant;

  // Step 3
  locations: UserLocation[];
  selectedLocationId?: string;

  // Step 4 – Exposure
  lightLevel: LightLevel;
  orientation: Orientation;
  /** store distance in centimeters internally */
  distanceCm: number;

  // Step 5 – Container & Soil (optional)
  potMaterial?: PotMaterial; // omit or "unspecified" = not set
  soilMix?: SoilMix;         // omit or "unspecified" = not set
};

export type PopularPlant = {
  id: string;
  name: string;
  latin: string;
  image: string;
  tags: string[]; // MDI icon names
};

export type Suggestion = {
  id: string;
  name: string;
  latin: string;
};
