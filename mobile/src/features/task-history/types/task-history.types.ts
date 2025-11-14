import type { TaskType } from "../../home/types/home.types";

export type TaskHistoryItem = {
  id: string;
  plantId?: string;
  // underlying reminder id so we can jump to edit screen
  reminderId?: string;
  plant: string;
  location: string;
  type: TaskType;
  // ISO or display string; you can later split into label + Date if needed
  completedAt: string;
  // optional note attached when the task was completed
  note?: string;
};
