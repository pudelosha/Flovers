export type ReminderType = "watering" | "moisture" | "fertilising" | "care";

export type Reminder = {
  id: string;
  type: ReminderType;
  plant: string;
  location: string;
  due: string;   // e.g. "Today"
  dueDate: Date; // exact date
};
