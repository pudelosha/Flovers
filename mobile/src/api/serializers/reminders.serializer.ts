import type { ApiReminder, ApiReminderTask } from "../services/reminders.service";
import type { ApiPlantInstanceListItem } from "../services/plant-instances.service";

/** UI type used by ReminderTile */
export type ReminderTypeUI = "watering" | "moisture" | "fertilising" | "care" | "repot";

export function mapBackendTypeToUI(
  t: ApiReminder["type"]
): ReminderTypeUI {
  switch (t) {
    case "water": return "watering";
    case "fertilize": return "fertilising";
    case "moisture":
    case "care":
    case "repot":
      return t;
  }
}

export function formatDueLabel(dueISO: string): { label: string; date: Date } {
  const due = new Date(dueISO + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  const delta = Math.round((dueOnly.getTime() - today.getTime()) / msPerDay);
  if (delta === 0) return { label: "Today", date: due };
  if (delta === 1) return { label: "Tomorrow", date: due };
  if (delta > 1 && delta <= 7) return { label: `${delta} days`, date: due };
  return { label: dueOnly.toLocaleDateString(), date: due };
}

/** What ReminderTile expects */
export type UIReminder = {
  access?: import("../../shared/utils/plantAccess").ApiPlantAccess;
  id: string;
  reminderId: string;
  type: ReminderTypeUI;
  plant: string;
  plantId?: string;
  location?: string;
  due: string;
  dueDate: Date;
  dueDateISO: string;
  intervalValue?: number;
  intervalUnit?: "days" | "months";
  isActive: boolean;
};

/**
 * Join tasks + reminders + plants into UIReminders.
 * Active reminders use their pending task date; paused reminders still render
 * with their schedule metadata so they can be resumed from the list.
 */
export function buildUIReminders(
  tasks: ApiReminderTask[],
  reminders: ApiReminder[],
  plants: ApiPlantInstanceListItem[]
): UIReminder[] {
  const plantsById = Object.fromEntries(plants.map((p) => [p.id, p]));
  const tasksByReminderId = new Map<number, ApiReminderTask>();

  for (const task of tasks) {
    if (!tasksByReminderId.has(task.reminder)) {
      tasksByReminderId.set(task.reminder, task);
    }
  }

  return reminders.map((r) => {
    const task = tasksByReminderId.get(r.id);
    const typeUI = mapBackendTypeToUI(r.type);
    const plant = plantsById[r.plant];
    const dueISO = task?.due_date ?? r.start_date;
    const { label, date } = formatDueLabel(dueISO);

    return {
      id: `reminder-${r.id}`,
      reminderId: String(r.id),
      access: r.access === undefined ? plant?.access : r.access,
      type: typeUI,
      plant: plant?.display_name || "Plant",
      plantId: r.plant != null ? String(r.plant) : undefined,
      location: plant?.location?.name,
      due: label,
      dueDate: date,
      dueDateISO: dueISO,
      intervalValue: r.interval_value,
      intervalUnit: r.interval_unit,
      isActive: r.is_active,
    };
  });
}
