import type { Task, TaskType } from "../../features/home/types/home.types";
import type { ApiReminder, ApiReminderTask } from "../services/reminders.service";

type ApiPlant = {
  id: number;
  display_name?: string | null;
  plant_definition?: { name?: string | null } | null;
  location?: { name?: string | null } | null;
};

function toTaskType(apiType: ApiReminder["type"]): TaskType {
  if (apiType === "water") return "watering";
  if (apiType === "fertilize") return "fertilising";
  return apiType as TaskType; // "moisture" | "care"
}

function plantName(p?: ApiPlant | null): string {
  return (
    p?.display_name?.trim() ||
    p?.plant_definition?.name?.trim() ||
    "Unnamed plant"
  );
}

export function buildUITasks(
  tasks: ApiReminderTask[],
  reminders: ApiReminder[],
  plants: ApiPlant[]
): (Task & { reminderId: string })[] {
  const remById = new Map<number, ApiReminder>();
  for (const r of reminders) remById.set(r.id, r);

  const plantById = new Map<number, ApiPlant>();
  for (const p of plants) plantById.set(p.id, p);

  return tasks.map((t) => {
    const r = remById.get(t.reminder);
    const p = r ? plantById.get(r.plant) : undefined;

    const type: TaskType = toTaskType(r?.type ?? "care");

    const ui: Task & { reminderId: string } = {
      id: String(t.id),                  // task id (used for complete)
      type,

      // underlying plant instance id for navigation from Home → PlantDetails
      plantId: p ? String(p.id) : undefined,

      plant: plantName(p),
      location: p?.location?.name || "",
      due: dueLabel(t.due_date),         // Today/Tomorrow/… (simple label)
      dueDate: new Date(t.due_date),
      reminderId: String(r?.id ?? ""),   // used for Delete/Edit routing
    };

    return ui;
  });
}

function dueLabel(iso: string): string {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(iso); d.setHours(0,0,0,0);
  const diff = Math.round((+d - +today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return `${diff} days`;
  if (diff < 0) return "Overdue";
  return "Next week";
}
