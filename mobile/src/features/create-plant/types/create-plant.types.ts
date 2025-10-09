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

export type WizardState = {
  step: WizardStep;
  plantQuery: string;
  selectedPlant?: SelectedPlant;
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
