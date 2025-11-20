import type { ApiPlantInstanceDetailFull } from "../../plants/types/plants.types";

/**
 * Metrics supported by the readings backend.
 */
export type PlantMetricKey = "temperature" | "humidity" | "light" | "moisture";

export type LatestReadings = {
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  moisture: number | null;
  /** ISO timestamp of the latest reading (device.last_read_at) */
  tsISO: string | null;
};

/**
 * Which metrics are actually enabled for this plant's device.
 * These are derived from ReadingDevice.sensors JSON.
 */
export type PlantSensorsConfig = {
  temperature?: boolean;
  humidity?: boolean;
  light?: boolean;
  moisture?: boolean;
};

/**
 * Display type for reminders, aligned with Reminders/Home UI:
 * - "watering"
 * - "fertilising"
 * - "moisture"
 * - "care"
 * - "repot"
 */
export type PlantReminderType =
  | "watering"
  | "fertilising"
  | "moisture"
  | "care"
  | "repot";

/**
 * A lightweight summary of upcoming reminder tasks for this plant,
 * derived from the Home tasks API.
 */
export type PlantReminderSummary = {
  /** Reminder id – used as editReminderId when navigating to Reminders */
  id: string;
  /** Underlying Home task id – used for mark-as-complete */
  taskId?: string;
  /** Normalised display type (maps to icons/colors via Reminders/Home constants) */
  type: PlantReminderType;
  /** Human-friendly due text, e.g. "Due today", "Due in 2 days", "Overdue by 1 day" */
  when: string;
};

/**
 * Composite object consumed by PlantDetailsScreen:
 * - plant: full editable payload
 * - latestReadings: latest device snapshot for this plant (if any)
 * - deviceLinked: whether a ReadingDevice is linked to this plant
 * - deviceName: optional device name for UI
 * - sensors: which metrics are enabled on the device
 * - reminders: upcoming reminder tasks for this plant
 */
export type PlantDetailsComposite = {
  plant: ApiPlantInstanceDetailFull;

  latestReadings: LatestReadings | null;
  deviceLinked: boolean;
  deviceName?: string | null;
  sensors: PlantSensorsConfig;

  reminders: PlantReminderSummary[];
};
