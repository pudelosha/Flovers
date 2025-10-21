import { request } from "../client";
import type { LangCode, FabPosition, BackgroundKey } from "../../features/profile/types/profile.types";

/** ---- Notifications ---- */
export type ApiProfileNotifications = {
  email_daily: boolean;
  email_hour: number;   // 0..23
  email_24h: boolean;

  push_daily: boolean;
  push_hour: number;    // 0..23
  push_24h: boolean;
};

export type ApiProfileNotificationsUpdatePayload = Partial<ApiProfileNotifications>;

export async function fetchProfileNotifications(
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiProfileNotifications> {
  return await request<ApiProfileNotifications>(
    "/api/profile/notifications/",
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
}

export async function updateProfileNotifications(
  payload: ApiProfileNotificationsUpdatePayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiProfileNotifications> {
  return await request<ApiProfileNotifications>(
    "/api/profile/notifications/",
    "PATCH",
    payload,
    { auth: opts.auth ?? true }
  );
}

/** ---- Settings ---- */
export type ApiProfileSettings = {
  language: LangCode;
  date_format: string;

  temperature_unit: "C" | "F" | "K";
  measure_unit: "metric" | "imperial";

  tile_transparency: number; // 0..0.6 in UI

  // NEW
  background: BackgroundKey; // "bg1" | "bg2" | "bg3" | "bg4"
  fab_position: FabPosition; // "left" | "right"
};

export type ApiProfileSettingsUpdatePayload = Partial<ApiProfileSettings>;

export async function fetchProfileSettings(
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiProfileSettings> {
  return await request<ApiProfileSettings>(
    "/api/profile/settings/",
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
}

export async function updateProfileSettings(
  payload: ApiProfileSettingsUpdatePayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiProfileSettings> {
  return await request<ApiProfileSettings>(
    "/api/profile/settings/",
    "PATCH",
    payload,
    { auth: opts.auth ?? true }
  );
}
