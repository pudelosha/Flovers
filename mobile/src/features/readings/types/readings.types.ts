// Domain metric keys used across UI
export type MetricKey = "temperature" | "humidity" | "light" | "moisture";

/** Tile model already used by the UI (unchanged) */
export type ReadingTileModel = {
  id: string;
  name: string;                 // plant display name
  lastReadISO?: string | null;  // ISO string or null if missing
  metrics: {
    temperature: number | null;
    humidity: number | null;
    light: number | null;
    moisture: number | null;
  };
  location: string | null;      // Added location field
  lastPumpRunAt?: string | null; // Timestamp of last pump run
  pumpIncluded: boolean;         // Flag to indicate if pump is included
  automaticPumpLaunch: boolean;  // Flag to indicate if auto watering is enabled
  pumpThresholdPct?: number | null | undefined; // Allow null or undefined values
  status: "enabled" | "disabled"; // Added status field
};

/* ============================== API TYPES (from backend) ============================== */

export type ApiReadingMetrics = {
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  moisture: number | null;
};

export type ApiReadingDevice = {
  id: number;
  plant: number;
  plant_name: string;
  plant_location?: string | null;
  device_name: string;
  is_active: boolean;
  device_key: string;
  notes?: string | null;
  interval_hours: number;
  sensors: {
    temperature: boolean;
    humidity: boolean;
    light: boolean;
    moisture: boolean;
  };
  moisture_alert_enabled?: boolean;
  moisture_alert_threshold?: number | null;
  moisture_alert_active?: boolean;
  last_read_at?: string | null;
  latest?: ApiReadingMetrics | null;
  sendEmailNotifications?: boolean;
  sendPushNotifications?: boolean;
  pumpIncluded: boolean;
  automaticPumpLaunch: boolean;
  pumpThresholdPct?: number | null;  // Correctly typed to handle undefined or null
  last_pump_run_at?: string | null;  // Timestamp of last pump run
  created_at: string;
  updated_at: string;
};

export type ApiReadingDeviceCreatePayload = {
  plant: number;
  device_name: string;
  notes?: string;
  interval_hours: number; // 1..24
  sensors: {
    temperature: boolean;
    humidity: boolean;
    light: boolean;
    moisture: boolean;
  };
  moisture_alert_enabled?: boolean;
  moisture_alert_threshold?: number | null;

  // New fields for notifications and pump configuration
  sendEmailNotifications: boolean;  // Flag for email notifications
  sendPushNotifications: boolean;  // Flag for push notifications
  pumpIncluded: boolean;           // Flag for pump inclusion
  automaticPumpLaunch: boolean;    // Flag for auto watering
  pumpThresholdPct: number;        // Threshold percentage for automatic watering
};

export type ApiReadingDeviceUpdatePayload = Partial<{
  plant: number;
  device_name: string;
  notes: string | null;
  is_active: boolean;
  interval_hours: number;
  sensors: {
    temperature?: boolean;
    humidity?: boolean;
    light?: boolean;
    moisture?: boolean;
  };
  moisture_alert_enabled: boolean;
  moisture_alert_threshold: number | null;

  // New fields for notifications and pump configuration
  sendEmailNotifications: boolean;  // Flag for email notifications
  sendPushNotifications: boolean;  // Flag for push notifications
  pumpIncluded: boolean;           // Flag for pump inclusion
  automaticPumpLaunch: boolean;    // Flag for auto watering
  pumpThresholdPct: number;        // Threshold percentage for automatic watering
}>;