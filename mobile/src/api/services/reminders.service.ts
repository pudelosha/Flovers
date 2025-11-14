// C:\Projekty\Python\Flovers\mobile\src\api\services\reminders.service.ts
import { request } from "../client";

export type ApiReminder = {
  id: number;
  plant: number;
  type: "water" | "moisture" | "fertilize" | "care" | "repot";
  start_date: string;           // YYYY-MM-DD
  interval_value: number;
  interval_unit: "days" | "months";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ApiReminderTask = {
  id: number;
  reminder: number;
  due_date: string;             // YYYY-MM-DD
  status: "pending" | "completed" | "skipped";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // NEW: optional note from backend (can be null)
  note?: string | null;
};

export async function listReminders(
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiReminder[]> {
  return await request<ApiReminder[]>(
    "/api/reminders/",
    "GET",
    undefined,
    { auth: opts.auth ?? true }
  );
}

/** list tasks (optionally filter by status: pending|completed|skipped) */
export async function listReminderTasks(
  params?: { status?: "pending" | "completed" | "skipped"; auth?: boolean }
): Promise<ApiReminderTask[]> {
  const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : "";
  return await request<ApiReminderTask[]>(
    `/api/reminders/tasks/${q}`,
    "GET",
    undefined,
    { auth: params?.auth ?? true }
  );
}

// 🔹 now accepts optional payload with note, but keeps old call signature working
export async function completeReminderTask(
  taskId: number,
  opts: { auth?: boolean } = { auth: true },
  payload?: { note?: string }
): Promise<{
  completed_task: ApiReminderTask;
  next_task: ApiReminderTask | null;
}> {
  return await request(
    `/api/reminders/tasks/${taskId}/complete/`,
    "POST",
    payload ?? undefined,
    { auth: opts.auth ?? true }
  );
}

/* ----------------------- CREATE / UPDATE / DELETE ----------------------- */

export type ApiReminderCreatePayload = {
  plant: number;
  type: "water" | "moisture" | "fertilize" | "care" | "repot";
  start_date: string;           // YYYY-MM-DD (anchor date)
  interval_value: number;
  interval_unit: "days" | "months";
  is_active?: boolean;
};

export async function createReminder(
  payload: ApiReminderCreatePayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiReminder> {
  return await request<ApiReminder>(
    `/api/reminders/`,
    "POST",
    payload,
    { auth: opts.auth ?? true }
  );
}

export type ApiReminderUpdatePayload = Partial<{
  plant: number;                // FK
  type: "water" | "moisture" | "fertilize" | "care" | "repot";
  start_date: string;           // YYYY-MM-DD (anchor date)
  interval_value: number;
  interval_unit: "days" | "months";
  is_active: boolean;
}>;

export async function updateReminder(
  id: number,
  payload: ApiReminderUpdatePayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<ApiReminder> {
  return await request<ApiReminder>(
    `/api/reminders/${id}/`,
    "PATCH",
    payload,
    { auth: opts.auth ?? true }
  );
}

export async function deleteReminder(
  id: number,
  opts: { auth?: boolean } = { auth: true }
): Promise<void> {
  await request<void>(
    `/api/reminders/${id}/`,
    "DELETE",
    undefined,
    { auth: opts.auth ?? true }
  );
}

/* ---------------------- HISTORY-TASK DELETION ---------------------- */

/**
 * Delete a single ReminderTask row (used by Task History per-row "Delete").
 *
 * Backend endpoint (to be implemented server-side):
 *   DELETE /api/reminders/tasks/<id>/
 */
export async function deleteReminderTask(
  id: number,
  opts: { auth?: boolean } = { auth: true }
): Promise<void> {
  await request<void>(
    `/api/reminders/tasks/${id}/`,
    "DELETE",
    undefined,
    { auth: opts.auth ?? true }
  );
}

/**
 * Bulk delete completed ReminderTask rows based on a scope.
 * Shape mirrors the HistoryDeletePayload on the client.
 *
 * Backend endpoint (to be implemented server-side):
 *   POST /api/reminders/tasks/bulk-delete/
 */
export type ApiBulkDeleteReminderTasksPayload =
  | { mode: "plant"; plantId: string }
  | { mode: "location"; location: string }
  | { mode: "types"; types: string[] }
  | { mode: "olderThan"; days: number };

export async function bulkDeleteReminderTasks(
  payload: ApiBulkDeleteReminderTasksPayload,
  opts: { auth?: boolean } = { auth: true }
): Promise<void> {
  await request<void>(
    `/api/reminders/tasks/bulk-delete/`,
    "POST",
    payload,
    { auth: opts.auth ?? true }
  );
}
