import type { TaskType } from "../../home/types/home.types";

export type TaskHistoryItem = {
  id: string;
  plantId?: string;
  plant: string;
  location: string;
  type: TaskType;
  // ISO or display string; you can later split into label + Date if needed
  completedAt: string;
};
