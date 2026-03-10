export type TaskType = "watering" | "moisture" | "fertilising" | "care" | "repot";

export type Task = {
  id: string;
  type: TaskType;

  /** underlying plant instance id used for navigation */
  plantId?: string;

  plant: string;
  location: string;

  // Home screen due information
  due: string;   // fallback label
  dueDate: Date; // exact date
  dueDiffDays?: number; // relative offset from today; negative = overdue

  // fields used by Task History (filled when task is completed)
  completedAt?: string; // ISO string from backend
  note?: string;        // note added on completion
};