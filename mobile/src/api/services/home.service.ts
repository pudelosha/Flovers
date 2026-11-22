import {
  listReminderTasks,
  listReminders,
  completeReminderTask,
  deleteReminder,
  type ApiReminderTask,
} from './reminders.service';
import { fetchPlantInstances } from './plant-instances.service';
import { buildUITasks } from '../serializers/home.serializer';
import type { Task } from '../../features/home/types/home.types';

export type HomeTask = Task & { reminderId: string };

export type TaskCompletionResult = {
  xpGained: number;
  levelUp: { previousLevel: number; level: number } | null;
};

export async function fetchHomeTasks(): Promise<HomeTask[]> {
  const [tasks, reminders, plants] = await Promise.all([
    listReminderTasks({ status: 'pending', auth: true }),
    listReminders({ auth: true }),
    fetchPlantInstances({ auth: true }),
  ]);

  return buildUITasks(tasks as ApiReminderTask[], reminders, plants);
}

// fetch *completed* reminder tasks for history screen
export async function fetchHomeHistoryTasks(): Promise<HomeTask[]> {
  const [tasks, reminders, plants] = await Promise.all([
    listReminderTasks({ status: 'completed', auth: true }),
    listReminders({ auth: true }),
    fetchPlantInstances({ auth: true }),
  ]);

  return buildUITasks(tasks as ApiReminderTask[], reminders, plants, {
    includeInactive: true,
  });
}

// Forward completion metadata to the backend.
export async function markHomeTaskComplete(
  taskId: string,
  note?: string,
  completedDate?: string,
): Promise<TaskCompletionResult> {
  const payload: { note?: string; completedDate?: string } = {};

  if (note && note.trim().length > 0) {
    payload.note = note.trim();
  }

  if (completedDate) {
    payload.completedDate = completedDate;
  }

  const result = await completeReminderTask(
    Number(taskId),
    { auth: true },
    Object.keys(payload).length > 0 ? payload : undefined,
  );
  const xp = result?.xp_awarded;
  const xpGained =
    typeof xp === 'number' && Number.isFinite(xp) && xp > 0 ? xp : 0;
  const change = result?.level_up;
  const valid =
    xpGained > 0 &&
    change &&
    Number.isInteger(change.previous_level) &&
    Number.isInteger(change.level) &&
    change.previous_level >= 1 &&
    change.level <= 100 &&
    change.level > change.previous_level;
  return {
    xpGained,
    levelUp: valid
      ? { previousLevel: change.previous_level, level: change.level }
      : null,
  };
}

export async function deleteHomeTask(reminderId: string): Promise<void> {
  // UX shows "Delete" — in this context, delete the underlying reminder
  // (removes future tasks too). If later you want "Skip", add an API for that.
  if (!reminderId) return;
  await deleteReminder(Number(reminderId), { auth: true });
}
