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
