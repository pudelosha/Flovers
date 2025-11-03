import { request } from "../client";

// import all API and UI types from the central types file
import {
  ApiReadingDevice,
  ApiReadingDeviceCreatePayload,
  ApiReadingDeviceUpdatePayload,
  ApiReadingMetrics,
  ReadingTileModel,
} from "../../features/readings/types/readings.types";

/* ============================== ENDPOINTS ============================== */
const DEVICES_URL = "/api/readings/devices/";

/* ============================== LIST / CRUD ============================== */

export async function listReadingDevices(
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiReadingDevice[]> {
  return await request<ApiReadingDevice[]>(
    DEVICES_URL,
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
}

export async function createReadingDevice(
  payload: ApiReadingDeviceCreatePayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiReadingDevice> {
  return await request<ApiReadingDevice>(
    DEVICES_URL,
    "POST",
    payload,
    { auth: opts.auth ?? true }
  );
}

export async function updateReadingDevice(
  id: number,
  payload: ApiReadingDeviceUpdatePayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiReadingDevice> {
  return await request<ApiReadingDevice>(
    `${DEVICES_URL}${id}/`,
    "PATCH",
    payload,
    { auth: opts.auth ?? true }
  );
}

export async function deleteReadingDevice(
  id: number,
  opts: { auth?: boolean } = { auth: true }
): Promise<void> {
  await request<void>(
    `${DEVICES_URL}${id}/`,
    "DELETE",
    undefined,
    { auth: opts.auth ?? true }
  );
}

/* ============================== ACCOUNT SECRET ============================== */
export async function rotateAccountSecret(
  opts: { auth?: boolean } = { auth: true }
): Promise<{ secret: string }> {
  return await request<{ secret: string }>(
    `/api/readings/rotate-secret/`,
    "POST",
    undefined,
    { auth: opts.auth ?? true }
  );
}

/* ============================== UI MAPPER ============================== */
export function toReadingTile(api: ApiReadingDevice): ReadingTileModel {
  return {
    id: String(api.id),
    name: api.plant_name || api.device_name,
    lastReadISO: api.last_read_at ?? null,
    metrics: api.latest ?? {
      temperature: null,
      humidity: null,
      light: null,
      moisture: null,
    },
    // extra convenience for filters (not in base type, used by screen)
    // @ts-ignore allow extra fields at runtime where needed
    location: api.plant_location ?? null,
    // @ts-ignore same
    status: api.is_active ? "enabled" : "disabled",
  };
}

/* ============================== DEVICE SETUP (ENDPOINTS + SECRET) ============================== */
export async function fetchDeviceSetup(opts: { auth?: boolean } = { auth: true }):
  Promise<{ endpoints: { ingest: string; read: string }, sample_payloads: any, secret: string }> {
  return await request(
    "/api/readings/device-setup/",
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
}

/* ============================== READ FEED (LATEST ONLY) ============================== */

/**
 * Types for /api/readings/feed/
 * (backend now returns only the latest reading in `readings` array)
 */
export type ApiReading = {
  timestamp: string;
  temperature?: number | null;
  humidity?: number | null;
  light?: number | null;
  moisture?: number | null;
};

export type ApiFeedResponse = {
  device: { id: number; device_name: string; plant_name: string | null; interval_hours: number };
  readings: ApiReading[]; // at most 1 item with current backend
};

/**
 * Wrapper for /api/readings/feed/.
 * Generally used by devices/Arduino; kept here for completeness.
 */
export async function fetchReadingsFeed(params: {
  deviceKey: string;   // device.device_key
  secret: string;      // account secret
  from?: string;       // ISO
  to?: string;         // ISO
  limit?: number;      // default 200, server max 1000 (though you now get only latest)
  deviceId?: number;
}, opts: { auth?: boolean } = { auth: true }): Promise<ApiFeedResponse> {
  const q = new URLSearchParams();
  q.set("secret", params.secret);
  q.set("device_key", params.deviceKey);
  if (params.deviceId) q.set("device_id", String(params.deviceId));
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  q.set("limit", String(params.limit ?? 200));

  return await request<ApiFeedResponse>(
    `/api/readings/feed/?${q.toString()}`,
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
}

/* ============================== AUTH'D HISTORY (FOR CHART) ============================== */

export type ApiHistoryPoint = {
  label: string;
  value: number;
};

export type ApiHistoryResponse = {
  device: {
    id: number;
    device_name: string;
    plant_name: string | null;
    interval_hours: number;
  };
  range: "day" | "week" | "month";
  metric: "temperature" | "humidity" | "light" | "moisture";
  unit: string;
  span: {
    from: string; // ISO
    to: string;   // ISO
  };
  points: ApiHistoryPoint[];
};

/**
 * Authenticated history endpoint for Readings History page.
 * GET /api/readings/history/
 */
export async function fetchReadingsHistory(
  params: {
    deviceId: number;
    range: "day" | "week" | "month";
    metric: "temperature" | "humidity" | "light" | "moisture";
    anchor?: string; // ISO datetime; defaults to now on backend if omitted
  },
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiHistoryResponse> {
  const q = new URLSearchParams();
  q.set("device_id", String(params.deviceId));
  q.set("range", params.range);
  q.set("metric", params.metric);
  if (params.anchor) {
    q.set("anchor", params.anchor);
  }

  return await request<ApiHistoryResponse>(
    `/api/readings/history/?${q.toString()}`,
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
}
