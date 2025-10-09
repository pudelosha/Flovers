export type WizardStep =
  | "selectPlant"
  | "traits"
  | "location"
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
  locations: UserLocation[];          // user's personal locations
  selectedLocationId?: string;        // chosen location for this plant
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
