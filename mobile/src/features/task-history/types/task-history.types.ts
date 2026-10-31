import type { TaskType } from "../../home/types/home.types";
import type { PlantPhoto } from "../../../api/services/plant-photos.service";
import type { ApiPlantAccess } from "../../../shared/utils/plantAccess";

export type TaskHistoryItem = {
  access?: import("../../../shared/utils/plantAccess").ApiPlantAccess;
  id: string;
  plantId?: string;
  reminderId?: string;
  plant: string;
  location: string;
  type: TaskType;
  completedAt: string;
  completedBy?: { id: string; name: string };
  note?: string;
};

/** Photos are journal entries, never reminder/task types elsewhere in the app. */
export type JournalPhotoItem = {
  entryKind: "photo";
  id: string;
  plantId: string;
  plant: string;
  location: string;
  type: "photo";
  completedAt: string;
  createdAt: string;
  recordedDate: string;
  note?: string;
  revision: number;
  photo: PlantPhoto;
  access?: ApiPlantAccess;
};

export type JournalEntry = TaskHistoryItem | JournalPhotoItem;
export type JournalFilterType = TaskType | "photo";

export function isJournalPhoto(item: JournalEntry): item is JournalPhotoItem {
  return item.type === "photo";
}

/** The two collections use independent identifiers. */
export function journalEntryKey(item: JournalEntry): string {
  return `${isJournalPhoto(item) ? "photo" : "task"}:${item.id}`;
}
