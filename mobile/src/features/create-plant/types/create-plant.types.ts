export type WizardStep =
  | "selectPlant"
  | "traits"
  | "location"
  | "exposure"   // 🔵 NEW
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

/** 🔵 NEW: exposure types */
export type LightLevel = "bright-direct" | "bright-indirect" | "medium" | "low" | "very-low";
export type Orientation = "N" | "E" | "S" | "W";

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

  // 🔵 Step 4 – Exposure
  lightLevel: LightLevel;
  orientation: Orientation;
  /** store distance in centimeters internally */
  distanceCm: number;
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
