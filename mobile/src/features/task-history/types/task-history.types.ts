import type { TaskType } from "../../home/types/home.types";

export type TaskHistoryItem = {
  access?: import("../../../shared/utils/plantAccess").ApiPlantAccess;
  id: string;
  plantId?: string;
  reminderId?: string;
  plant: string;
  location: string;
  type: TaskType;
  completedAt: string;
  note?: string;
};
