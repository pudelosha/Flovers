export type TaskType = "watering" | "moisture" | "fertilising" | "care" | "repot";

export type Task = {
  id: string;
  type: TaskType;
  plant: string;
  location: string;
  due: string;   // e.g. "Today"
  dueDate: Date; // exact date
};
