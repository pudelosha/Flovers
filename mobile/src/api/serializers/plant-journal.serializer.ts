import type { ApiPlantJournalItem } from "../services/plant-instances.service";

export type JournalTypeUI =
  | "watering"
  | "moisture"
  | "fertilising"
  | "care"
  | "repot";

export type UIJournalEntry = {
  id: string;
  type: JournalTypeUI;
  completedAtISO: string; // YYYY-MM-DD
  note?: string;
};

function backendTypeToUI(t: ApiPlantJournalItem["type"]): JournalTypeUI {
  switch (t) {
    case "water":
      return "watering";
    case "fertilize":
      return "fertilising";
    case "moisture":
      return "moisture";
    case "care":
      return "care";
    case "repot":
      return "repot";
  }
}

function toISODateOnly(dt: string | null): string {
  if (!dt) return "";
  // dt is ISO datetime, keep YYYY-MM-DD
  return dt.slice(0, 10);
}

export function buildUIJournalEntries(
  items: ApiPlantJournalItem[]
): UIJournalEntry[] {
  return items.map((x) => ({
    id: String(x.id),
    type: backendTypeToUI(x.type),
    completedAtISO: toISODateOnly(x.completed_at),
    note: x.note ?? undefined,
  }));
}
