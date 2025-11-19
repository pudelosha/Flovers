// C:\Projekty\Python\Flovers\mobile\src\features\plant-details\types\plant-details.types.ts
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

export type PlantSensorsConfig = {
  temperature?: boolean;
  humidity?: boolean;
  light?: boolean;
  moisture?: boolean;
};

/**
 * Composite data structure powering the PlantDetails screen.
 * Combines plant core detail + latest readings + reminders + device metadata.
 */
export type PlantDetailsComposite = {
  plant: ApiPlantInstanceDetailFull;
  latestReadings: LatestReadings | null;
  reminders: PlantReminderSummary[];

  // Linked device metadata
  deviceLinked: boolean;
  deviceName?: string;
  sensors?: PlantSensorsConfig;
};
