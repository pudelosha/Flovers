import type {
  ApiReminder,
  ApiReminderTask,
} from "../services/reminders.service";
import { buildUITasks } from "./home.serializer";
import type { TaskHistoryItem } from "../../features/task-history/types/task-history.types";

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
  const uiTasks = buildUITasks(tasks, reminders, plants) as any[];

  return uiTasks.map(
    (t): TaskHistoryItem => {
      const rawReminderId = typeof t.reminderId === "string" ? t.reminderId : "";
      const trimmedReminderId = rawReminderId.trim();

      return {
        id: String(t.id),
        type: t.type,
        plant: t.plant,
        location: t.location,
        plantId: t.plantId,
        reminderId: trimmedReminderId || undefined,
        completedAt: t.completedAt,
        note: t.note,
      };
    }
  );
}
