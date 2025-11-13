export type TaskType = "watering" | "moisture" | "fertilising" | "care" | "repot";

export type Task = {
  id: string;
  type: TaskType;

  /** underlying plant instance id used for navigation */
  plantId?: string;

  plant: string;
  location: string;

  // Home screen due information
  due: string;   // e.g. "Today"
  dueDate: Date; // exact date

  // fields used by Task History (filled when task is completed)
  completedAt?: string; // ISO string from backend
  note?: string;        // note added on completion
};
