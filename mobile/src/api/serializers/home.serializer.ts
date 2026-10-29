import type { Task, TaskType } from "../../features/home/types/home.types";
import type { ApiReminder, ApiReminderTask } from "../services/reminders.service";

type ApiPlant = {
  access?: import("../../shared/utils/plantAccess").ApiPlantAccess;
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
  plants: ApiPlant[],
  options: { includeInactive?: boolean } = {}
): (Task & { reminderId: string })[] {
  const remById = new Map<number, ApiReminder>();
  for (const r of reminders) remById.set(r.id, r);

  const plantById = new Map<number, ApiPlant>();
  for (const p of plants) plantById.set(p.id, p);

  return tasks.flatMap((t) => {
    const r = remById.get(t.reminder);
    const event = t.status === "completed" ? t.completed_event : null;
    // Shared tasks carry their own plant/type; reminder definitions are owner-only.
    if (!event && ((!r && (!t.plant || !t.type)) || (r && !r.is_active && !options.includeInactive))) return [];

    const p = plantById.get(t.plant ?? r?.plant ?? 0);

    const type: TaskType = toTaskType(event?.type ?? t.type ?? r?.type ?? "care");
    const dueInfo = getDueInfo(t.due_date);

    const ui: Task & { reminderId: string } = {
      access: t.access === undefined ? (r?.access === undefined ? p?.access : r.access) : t.access,
      id: String(t.id),                  // task id (used for complete)
      type,

      // underlying plant instance id for navigation from Home → PlantDetails
      plantId: event ? String(event.plant_id) : t.plant ? String(t.plant) : p ? String(p.id) : undefined,

      plant: event ? event.plant_name || "Unnamed plant" : plantName(p),
      location: event ? event.location_name : p?.location?.name || "",
      due: dueInfo.fallbackLabel,        // fallback only; UI should prefer dueDiffDays
      dueDate: new Date(`${t.due_date}T00:00:00`), // local calendar date
      dueDiffDays: dueInfo.diffDays,     // used by UI for localized labels

      // used for Delete/Edit routing
      reminderId: String(t.reminder ?? ""),

      // extra fields used by Task History
      completedAt: t.completed_at || "", // ISO string or "" if not completed
      completedBy: t.completed_by ?? undefined,
      note: t.note ?? undefined,         // optional note saved on completion
    };

    return [ui];
  });
}

function getDueInfo(iso: string): { diffDays: number; fallbackLabel: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const d = new Date(`${iso}T00:00:00`);
  d.setHours(0, 0, 0, 0);

  const diff = Math.round((+d - +today) / (1000 * 60 * 60 * 24));

  if (diff === 0) return { diffDays: diff, fallbackLabel: "Today" };
  if (diff === 1) return { diffDays: diff, fallbackLabel: "Tomorrow" };
  if (diff > 1 && diff < 7) return { diffDays: diff, fallbackLabel: `${diff} days` };
  if (diff < 0) return { diffDays: diff, fallbackLabel: "Overdue" };
  return { diffDays: diff, fallbackLabel: "Next week" };
}
