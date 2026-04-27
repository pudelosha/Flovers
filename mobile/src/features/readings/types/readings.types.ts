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
  location: string | null;       // Added location field
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

export type ApiPumpTask = {
  id: number | string;
  source: "manual" | "automatic";
  status: "pending" | "delivered" | "executed" | "cancelled" | "expired" | "failed";
  requested_at: string;
  delivered_at?: string | null;
  executed_at?: string | null;
  cancelled_at?: string | null;
  expires_at?: string | null;
  moisture_at_request?: number | null;
  threshold_at_request?: number | null;
  error_message?: string | null;
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

  send_email_notifications?: boolean;
  send_push_notifications?: boolean;

  pump_included: boolean;
  automatic_pump_launch: boolean;
  pump_threshold_pct?: number | null;
  last_pump_run_at?: string | null;
  last_pump_run_source?: "manual" | "automatic" | null;
  pump_cooldown_minutes?: number;
  pending_pump_task?: ApiPumpTask | null;

  created_at: string;
  updated_at: string;
};

export type ApiReadingDeviceCreatePayload = {
  // Canonical backend fields
  plant?: number;
  device_name?: string;
  notes?: string;
  is_active?: boolean;
  interval_hours?: number; // 1..24
  sensors: {
    temperature: boolean;
    humidity: boolean;
    light: boolean;
    moisture: boolean;
    moistureAlertEnabled?: boolean;
    moistureAlertPct?: number;
  };
  moisture_alert_enabled?: boolean;
  moisture_alert_threshold?: number | null;

  send_email_notifications?: boolean;
  send_push_notifications?: boolean;
  pump_included?: boolean;
  automatic_pump_launch?: boolean;
  pump_threshold_pct?: number | null;

  // UI alias fields accepted by backend serializer
  mode?: "add" | "edit";
  plantId?: string | number;
  name?: string;
  enabled?: boolean;
  intervalHours?: number;

  sendEmailNotifications?: boolean;
  sendPushNotifications?: boolean;
  pumpIncluded?: boolean;
  automaticPumpLaunch?: boolean;
  pumpThresholdPct?: number | null;
};

export type ApiReadingDeviceUpdatePayload = Partial<{
  // Canonical backend fields
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
    moistureAlertEnabled?: boolean;
    moistureAlertPct?: number;
  };
  moisture_alert_enabled: boolean;
  moisture_alert_threshold: number | null;

  send_email_notifications: boolean;
  send_push_notifications: boolean;
  pump_included: boolean;
  automatic_pump_launch: boolean;
  pump_threshold_pct: number | null;

  // UI alias fields accepted by backend serializer
  mode: "add" | "edit";
  plantId: string | number;
  name: string;
  enabled: boolean;
  intervalHours: number;

  sendEmailNotifications: boolean;
  sendPushNotifications: boolean;
  pumpIncluded: boolean;
  automaticPumpLaunch: boolean;
  pumpThresholdPct: number | null;
}>;