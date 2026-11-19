import { request } from "../client";
import type {
  LangCode,
  FabPosition,
  BackgroundKey,
  TileMotive,
} from "../../features/profile/types/profile.types";

/** Common envelope returned by the profiles API */
type ApiEnvelope<T> = {
  status: "success" | "error";
  message: string;
  data: T;
  errors?: Record<string, unknown>;
};

export type ApiProfileProgression = {
  total_xp: number;
  level: number;
  rank_key: string;
  xp_into_level: number;
  xp_for_next_level: number;
  daily_xp: number;
  daily_cap: number;
};

/** Progression is owned by the backend; clients never submit XP or levels. */
export async function fetchProfileProgression(): Promise<ApiProfileProgression> {
  const res = await request<ApiEnvelope<ApiProfileProgression>>(
    "/profile/progression/", "GET", undefined, { auth: true }
  );
  const data = res.data;
  if (!data || !Number.isInteger(data.level) || data.level < 1 || data.level > 100 ||
      !Number.isInteger(data.xp_into_level) || data.xp_into_level < 0 ||
      !Number.isInteger(data.xp_for_next_level) ||
      (data.level === 100 ? data.xp_for_next_level !== 0 :
        data.xp_for_next_level <= 0 || data.xp_into_level >= data.xp_for_next_level)) {
    throw new Error("Invalid account progression response.");
  }
  return data;
}

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
  const res = await request<ApiEnvelope<ApiProfileNotifications>>(
    "/profile/notifications/",
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
  return res.data;
}

export async function updateProfileNotifications(
  payload: ApiProfileNotificationsUpdatePayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiProfileNotifications> {
  const res = await request<ApiEnvelope<ApiProfileNotifications>>(
    "/profile/notifications/",
    "PATCH",
    payload,
    { auth: opts.auth ?? true }
  );
  return res.data;
}

/** ---- Settings ---- */
export type ApiProfileSettings = {
  language: LangCode;
  date_format: string;

  temperature_unit: "C" | "F" | "K";
  measure_unit: "metric" | "imperial";

  tile_transparency: number; // 0..0.6 in UI
  tile_motive: TileMotive;   // "light" | "dark" - tiles gloom mode

  background: BackgroundKey; // "bg1" | "bg2" | "bg3" | "bg4" | "bg5"
  fab_position: FabPosition; // "left" | "right"
};

export type ApiProfileSettingsUpdatePayload = Partial<ApiProfileSettings>;

export async function fetchProfileSettings(
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiProfileSettings> {
  const res = await request<ApiEnvelope<ApiProfileSettings>>(
    "/profile/settings/",
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
  return res.data;
}

export async function updateProfileSettings(
  payload: ApiProfileSettingsUpdatePayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiProfileSettings> {
  const res = await request<ApiEnvelope<ApiProfileSettings>>(
    "/profile/settings/",
    "PATCH",
    payload,
    { auth: opts.auth ?? true }
  );
  return res.data;
}

/** ---- Change password ----
 * NOTE: Backend endpoints /auth/change-password/ do not exist yet.
 * This will 404 until we implement them in `accounts`.
 */
export async function changeMyPassword(
  payload: { current_password: string; new_password: string },
  opts: { auth?: boolean } = { auth: true }
): Promise<{ status: string; message: string; data: Record<string, unknown> }> {
  return await request<{ status: string; message: string; data: Record<string, unknown> }>(
    "/auth/change-password/",
    "POST",
    payload,
    { auth: opts.auth ?? true }
  );
}

/** ---- Change email ----
 * NOTE: Backend endpoints /auth/change-email/ do not exist yet.
 * This will 404 until we implement them in `accounts`.
 */
export async function changeMyEmail(
  payload: { new_email: string; password: string },
  opts: { auth?: boolean } = { auth: true }
): Promise<{ status: string; message: string; data: { email?: string } }> {
  return await request<{ status: string; message: string; data: { email?: string } }>(
    "/auth/change-email/",
    "POST",
    payload,
    { auth: opts.auth ?? true }
  );
}

/** ---- Support: Contact + Bug report ----
 *  - POST /profile/support/contact/
 *  - POST /profile/support/bug/
 */

export type ApiSupportContactPayload = {
  subject: string;
  message: string;
  copy_to_user?: boolean; // "send me a copy" flag
};

export type ApiSupportBugPayload = {
  subject: string;
  description: string;
  copy_to_user?: boolean; // "send me a copy" flag
};

export async function sendSupportContact(
  payload: ApiSupportContactPayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<{ message: string }> {
  const res = await request<ApiEnvelope<null>>(
    "/profile/support/contact/",
    "POST",
    payload,
    { auth: opts.auth ?? true, timeoutMs: 30000 }
  );
  return { message: res.message };
}

export async function sendSupportBug(
  payload: ApiSupportBugPayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<{ message: string }> {
  const res = await request<ApiEnvelope<null>>(
    "/profile/support/bug/",
    "POST",
    payload,
    { auth: opts.auth ?? true, timeoutMs: 30000 }
  );
  return { message: res.message };
}
