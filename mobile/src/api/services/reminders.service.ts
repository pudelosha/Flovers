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
  status: "pending" | "completed";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listReminders(opts: { auth?: boolean } = { auth: true }): Promise<ApiReminder[]> {
  return await request<ApiReminder[]>("/api/reminders/", "GET", undefined, { auth: opts.auth ?? true });
}

export async function completeReminderTask(taskId: number, opts: { auth?: boolean } = { auth: true }): Promise<{
  completed_task: ApiReminderTask;
  next_task: ApiReminderTask | null;
}> {
  return await request(`/api/reminders/tasks/${taskId}/complete/`, "POST", undefined, { auth: opts.auth ?? true });
}
