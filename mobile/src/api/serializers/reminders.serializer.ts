// src/api/serializers/reminders.serializer.ts
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
  id: string;
  type: ReminderTypeUI;
  plant: string;
  plantId?: string;                 // 🔹 NEW: stable FK for modal preselect
  location?: string;
  due: string;                      // "Today" / "Tomorrow" / "3 days" / short date
  dueDate: Date;
  intervalValue?: number;
  intervalUnit?: "days" | "months";
};

/**
 * Build UI reminders by joining:
 *  - tasks (required),
 *  - remindersById (for type + plant id),
 *  - plantsById (for display_name [+ optionally location]).
 *
 * NOTE: when building each UI reminder, we pass interval values from the matching reminder (r)
 */
export function buildUIReminders(
  tasks: ApiReminderTask[],
  reminders: ApiReminder[],
  plants: ApiPlantInstanceListItem[]
): UIReminder[] {
  const remindersById = Object.fromEntries(reminders.map(r => [r.id, r]));
  const plantsById = Object.fromEntries(plants.map(p => [p.id, p]));

  return tasks.map(task => {
    const r = remindersById[task.reminder];
    const typeUI = mapBackendTypeToUI(r?.type ?? "water");
    const plant = r ? plantsById[r.plant] : undefined;

    const { label, date } = formatDueLabel(task.due_date);

    return {
      id: String(task.id),
      type: typeUI,
      plant: plant?.display_name || "Plant",
      plantId: r?.plant != null ? String(r.plant) : undefined,   // 🔹 NEW
      location: plant?.location?.name,
      due: label,
      dueDate: date,
      // pass through interval details from the reminder record
      intervalValue: r?.interval_value,
      intervalUnit: r?.interval_unit,
    };
  });
}
