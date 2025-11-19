import type { ApiPlantInstanceDetailFull } from "../../plants/types/plants.types";

export type PlantMetricKey = "temperature" | "humidity" | "light" | "moisture";

export type LatestReadings = {
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  moisture: number | null;
  tsISO: string | null;
};

export type PlantReminderSummary = {
  id: string;
  title: string;
  when: string; // human-readable ("in 2 days", "next week")
  icon: string; // MDI icon name
};

export type PlantDetailsComposite = {
  plant: ApiPlantInstanceDetailFull;
  latestReadings: LatestReadings;
  reminders: PlantReminderSummary[];
};
