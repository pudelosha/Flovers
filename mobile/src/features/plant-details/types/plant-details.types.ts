import type { ApiPlantInstanceDetailFull } from "../../plants/types/plants.types";

export type PlantMetricKey = "temperature" | "humidity" | "light" | "moisture";

export type LatestReadings = {
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  moisture: number | null;
  tsISO: string | null;
};

export type PlantSensorsConfig = {
  temperature?: boolean;
  humidity?: boolean;
  light?: boolean;
  moisture?: boolean;
};

/**
 * Summary of a reminder tied to this plant, used on Plant Details.
 * This is intentionally simpler than the full Reminder DTO but
 * carries enough info for the tile + menu actions.
 */
export type PlantReminderSummary = {
  id: string;          // reminder ID
  type: string;        // raw type ("water", "watering", "fertilize", "repot", etc.)
  when: string;        // human-readable: "in 2 days", "next week", etc.

  /**
   * Optional: underlying Home task ID, if you want to wire
   * "Mark as complete" to Home's markHomeTaskComplete.
   */
  taskId?: string;
};

export type PlantDetailsComposite = {
  plant: ApiPlantInstanceDetailFull;
  latestReadings: LatestReadings | null;
  reminders: PlantReminderSummary[];

  // Linked device metadata
  deviceLinked: boolean;
  deviceName?: string;
  sensors?: PlantSensorsConfig;
};
