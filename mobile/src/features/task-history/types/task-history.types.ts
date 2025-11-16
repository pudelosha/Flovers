import type { TaskType } from "../../home/types/home.types";

export type TaskHistoryItem = {
  id: string;
  plantId?: string;
  reminderId?: string;
  plant: string;
  location: string;
  type: TaskType;
  completedAt: string;
  note?: string;
};
