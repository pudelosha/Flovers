// src/api/serializers/history.serializer.ts
import type {
  ApiReminder,
  ApiReminderTask,
} from "../services/reminders.service";
import { buildUITasks } from "./home.serializer";
import type { TaskHistoryItem } from "../../features/task-history/types/task-history.types";

// Copied from home.serializer for typing only
type ApiPlant = {
  id: number;
  display_name?: string | null;
  plant_definition?: { name?: string | null } | null;
  location?: { name?: string | null } | null;
};

export function buildUIHistoryItems(
  tasks: ApiReminderTask[],
  reminders: ApiReminder[],
  plants: ApiPlant[]
): TaskHistoryItem[] {
  // Home’s serializer already knows how to compose tasks+reminders+plants.
  const uiTasks = buildUITasks(tasks, reminders, plants) as any[];

  // History only needs a subset + some fields for navigation.
  return uiTasks.map(
    (t): TaskHistoryItem => ({
      id: String(t.id),
      type: t.type,
      plant: t.plant,
      location: t.location,
      // for navigation
      plantId: t.plantId,
      // history-specific
      completedAt: t.completedAt,
      note: t.note,
    })
  );
}
