// src/api/services/history.service.ts
import {
  listReminderTasks,
  listReminders,
  type ApiReminderTask,
  type ApiReminder,
  deleteReminderTask,
  bulkDeleteReminderTasks,
} from "./reminders.service";
import { fetchPlantInstances } from "./plant-instances.service";

import { buildUIHistoryItems } from "../serializers/history.serializer";
import type { TaskHistoryItem } from "../../features/task-history/types/task-history.types";
import type { TaskType } from "../../features/home/types/home.types";

/**
 * Fetch all *completed* reminder tasks and map them to TaskHistoryItem.
 */
export async function fetchHistoryItems(): Promise<TaskHistoryItem[]> {
  const [tasks, reminders, plants] = await Promise.all([
    listReminderTasks({ status: "completed", auth: true }),
    listReminders({ auth: true }),
    fetchPlantInstances({ auth: true }),
  ]);

  return buildUIHistoryItems(
    tasks as ApiReminderTask[],
    reminders as ApiReminder[],
    plants as any
  );
}

/**
 * Delete a single completed task from history (dropdown "Delete").
 *
 * Backend:
 *   DELETE /api/reminders/tasks/<id>/
 * physically removes the ReminderTask row.
 */
export async function deleteHistoryEntry(taskId: string): Promise<void> {
  if (!taskId) return;
  await deleteReminderTask(Number(taskId), { auth: true });
}

/**
 * Shape of the bulk-delete request, parallel to HistoryDeletePayload
 * used by DeleteHistoryTasksModal.
 */
export type HistoryBulkDeleteRequest =
  | { mode: "plant"; plantId: string }
  | { mode: "location"; location: string }
  | { mode: "types"; types: TaskType[] }
  | { mode: "olderThan"; days: number };

/**
 * Bulk delete completed tasks from history (modal "Delete" action).
 *
 * Backend:
 *   POST /api/reminders/tasks/bulk-delete/
 *   body = HistoryBulkDeleteRequest
 */
export async function bulkDeleteHistoryEntries(
  payload: HistoryBulkDeleteRequest
): Promise<void> {
  await bulkDeleteReminderTasks(payload as any, { auth: true });
}
