export type MetricKey = "temperature" | "humidity" | "light" | "moisture";

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
