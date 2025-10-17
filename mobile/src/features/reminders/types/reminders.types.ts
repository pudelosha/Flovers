export type ReminderType = "watering" | "moisture" | "fertilising" | "care" | "repot";

export type Reminder = {
  id: string;
  type: ReminderType;
  plant: string;
  location: string;
  dueDate?: Date | string;

  // NEW: needed for the extra lines
  intervalValue?: number;
  intervalUnit?: "days" | "months";
};
