// C:\Projekty\Python\Flovers\mobile\src\api\services\home.service.ts
// Thin wrapper that composes the Reminders + Plants endpoints for Home.

import {
  listReminderTasks,
  listReminders,
  completeReminderTask,
  deleteReminder,
  type ApiReminderTask,
} from "./reminders.service";
import { fetchPlantInstances } from "./plant-instances.service";
import { buildUITasks } from "../serializers/home.serializer";
import type { Task } from "../../features/home/types/home.types";

export type HomeTask = Task & { reminderId: string };

export async function fetchHomeTasks(): Promise<HomeTask[]> {
  const [tasks, reminders, plants] = await Promise.all([
    listReminderTasks({ status: "pending", auth: true }),
    listReminders({ auth: true }),
    fetchPlantInstances({ auth: true }),
  ]);

  return buildUITasks(tasks as ApiReminderTask[], reminders, plants);
}

// fetch *completed* reminder tasks for history screen
export async function fetchHomeHistoryTasks(): Promise<HomeTask[]> {
  const [tasks, reminders, plants] = await Promise.all([
    listReminderTasks({ status: "completed", auth: true }),
    listReminders({ auth: true }),
    fetchPlantInstances({ auth: true }),
  ]);

  return buildUITasks(tasks as ApiReminderTask[], reminders, plants) as HomeTask[];
}

// 🔹 now accepts optional note and forwards it to backend
export async function markHomeTaskComplete(
  taskId: string,
  note?: string
): Promise<void> {
  const payload =
    note && note.trim().length > 0 ? { note: note.trim() } : undefined;

  await completeReminderTask(
    Number(taskId),
    { auth: true },
    payload
  );
}

export async function deleteHomeTask(reminderId: string): Promise<void> {
  // UX shows "Delete" — in this context, delete the underlying reminder
  // (removes future tasks too). If later you want "Skip", add an API for that.
  if (!reminderId) return;
  await deleteReminder(Number(reminderId), { auth: true });
}
