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
    "/api/profile/notifications/",
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
    "/api/profile/notifications/",
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
    "/api/profile/settings/",
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
    "/api/profile/settings/",
    "PATCH",
    payload,
    { auth: opts.auth ?? true }
  );
  return res.data;
}

/** ---- Change password ----
 * NOTE: Backend endpoints /api/auth/change-password/ do not exist yet.
 * This will 404 until we implement them in `accounts`.
 */
export async function changeMyPassword(
  payload: { current_password: string; new_password: string },
  opts: { auth?: boolean } = { auth: true }
): Promise<{ status: string; message: string; data: Record<string, unknown> }> {
  return await request<{ status: string; message: string; data: Record<string, unknown> }>(
    "/api/auth/change-password/",
    "POST",
    payload,
    { auth: opts.auth ?? true }
  );
}

/** ---- Change email ----
 * NOTE: Backend endpoints /api/auth/change-email/ do not exist yet.
 * This will 404 until we implement them in `accounts`.
 */
export async function changeMyEmail(
  payload: { new_email: string; password: string },
  opts: { auth?: boolean } = { auth: true }
): Promise<{ status: string; message: string; data: { email?: string } }> {
  return await request<{ status: string; message: string; data: { email?: string } }>(
    "/api/auth/change-email/",
    "POST",
    payload,
    { auth: opts.auth ?? true }
  );
}

/** ---- Support: Contact + Bug report ----
 *  - POST /api/profile/support/contact/
 *  - POST /api/profile/support/bug/
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
    "/api/profile/support/contact/",
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
    "/api/profile/support/bug/",
    "POST",
    payload,
    { auth: opts.auth ?? true, timeoutMs: 30000 }
  );
  return { message: res.message };
}