export type ReminderType = "watering" | "moisture" | "fertilising" | "care" | "repot";

export type Reminder = {
  id: string;
  type: ReminderType;
  plant: string;
  plantId?: string;
  location: string;
  dueDate?: Date | string;
  intervalValue?: number;
  intervalUnit?: "days" | "months";
};
