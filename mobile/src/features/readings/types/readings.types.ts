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
};

/* ============================== API TYPES (from backend) ============================== */

export type ApiReadingMetrics = {
  temperature: number | null;
  humidity: number | null;
  light: number | null;
  moisture: number | null;
};

export type ApiReadingDevice = {
  id: number;                   // device id (PK)
  plant: number;                // FK -> Plant Instance
  plant_name: string;           // convenient display from backend
  plant_location?: string | null;

  device_name: string;          // user-facing device name
  is_active: boolean;           // enabled/disabled
  device_key: string;           // 8+ chars, readonly
  notes?: string | null;

  // sampling / sensors
  interval_hours: number;       // 1..24
  sensors: {
    temperature: boolean;
    humidity: boolean;
    light: boolean;
    moisture: boolean;
    moisture_alert_enabled?: boolean;
    moisture_alert_pct?: number | null; // 0..100
  };

  // latest snapshot (optional convenience)
  last_read_at?: string | null; // ISO
  latest?: ApiReadingMetrics | null;

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
    moisture_alert_enabled?: boolean;
    moisture_alert_pct?: number; // 0..100
  };
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
    moisture_alert_enabled?: boolean;
    moisture_alert_pct?: number | null;
  };
}>;
