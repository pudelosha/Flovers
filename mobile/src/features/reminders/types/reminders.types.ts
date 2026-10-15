export type ReminderType = "watering" | "moisture" | "fertilising" | "care" | "repot";

export type Reminder = {
  id: string;
  reminderId: string;
  type: ReminderType;
  plant: string;
  plantId?: string;
  location?: string;
  dueDate?: Date | string;
  dueDateISO: string;
  intervalValue?: number;
  intervalUnit?: "days" | "months";
  isActive: boolean;
};
