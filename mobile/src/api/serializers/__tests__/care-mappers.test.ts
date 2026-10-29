import { serializePlantProfile } from "../plant-definitions.serializer";
import { buildUITasks } from "../home.serializer";
import { buildUIHistoryItems } from "../history.serializer";
import { buildUIReminders } from "../reminders.serializer";
import type { ApiReminder, ApiReminderTask } from "../../services/reminders.service";

const reminder: ApiReminder = {
  id: 8, plant: 4, type: "water", start_date: "2026-10-20",
  interval_value: 12, interval_unit: "days", is_active: true,
  created_at: "2026-10-14T08:00:00Z", updated_at: "2026-10-14T08:00:00Z",
};
const task: ApiReminderTask = {
  id: 21, reminder: 8, due_date: "2026-10-20", status: "pending", completed_at: null,
  created_at: "2026-10-14T08:00:00Z", updated_at: "2026-10-14T08:00:00Z",
};
const plants = [{ id: 4, display_name: "Monstera", location: { id: 2, name: "Living room" } }];

describe("care API mappers", () => {
  it("keeps shared pending tasks on Home without exposing reminder definitions", () => {
    const access = { is_owner: false, is_shared: true, can_edit: false, can_complete_tasks: true,
      owner: { id: "1", name: "Mom" }, expires_at: null };
    const sharedTask = { ...task, plant: 4, type: "water" as const, access };
    expect(buildUITasks([sharedTask], [], plants)).toEqual([
      expect.objectContaining({ id: "21", plantId: "4", plant: "Monstera", location: "Living room",
        type: "watering", reminderId: "8", access }),
    ]);
    expect(buildUIReminders([sharedTask], [], plants)).toEqual([]);
  });
  it("preserves shared permissions for Home, Reminders and task history", () => {
    const access = { is_owner: false, is_shared: true, can_edit: false, can_complete_tasks: true,
      owner: { id: "1", name: "Mom" }, expires_at: null };
    const sharedReminder = { ...reminder, access };
    expect(buildUITasks([task], [sharedReminder], plants)[0].access).toEqual(access);
    expect(buildUIReminders([task], [sharedReminder], plants)[0].access).toEqual(access);
    const completed = { ...task, access, status: "completed" as const, completed_at: "2026-10-14T10:00:00Z" };
    expect(buildUIHistoryItems([completed], [sharedReminder], plants)[0].access).toEqual(access);
  });

  it("does not turn explicitly invalid access into a legacy-owner fallback", () => {
    const invalidTask = { ...task, access: null } as any;
    const invalidReminder = { ...reminder, access: null } as any;
    expect(buildUITasks([invalidTask], [reminder], plants)[0].access).toBeNull();
    expect(buildUIReminders([task], [invalidReminder], plants)[0].access).toBeNull();
  });
  it("preserves the real completion actor in history, independently of plant ownership", () => {
    const completedBy = { id: "7", name: "Anna" };
    const completed = { ...task, status: "completed" as const, completed_at: "2026-10-29T10:30:00Z", completed_by: completedBy };
    expect(buildUITasks([completed], [reminder], plants)[0].completedBy).toEqual(completedBy);
    expect(buildUIHistoryItems([completed], [reminder], plants)[0].completedBy).toEqual(completedBy);
  });
  it("does not invent an actor for legacy history with no completion identity", () => {
    const completed = { ...task, status: "completed" as const, completed_at: "2026-10-29T10:30:00Z", completed_by: null };
    expect(buildUIHistoryItems([completed], [reminder], plants)[0].completedBy).toBeUndefined();
  });
  it("retains species guidance and singleton recommendations used by the wizard", () => {
    expect(serializePlantProfile({
      id: 4, latin: "Monstera deliciosa", display_name: "Monstera", image: null,
      traits: [], sun: "medium", water: "medium", difficulty: "easy",
      recommended_pot_materials: ["terracotta"], recommended_soil_mixes: ["aroid-chunky"],
      water_required: true, water_interval_days: 12, moisture_required: true, moisture_interval_days: 3,
    })).toMatchObject({
      id: "4", name: "Monstera", image: null, sun: "medium", water: "medium", difficulty: "easy",
      recommended_pot_materials: ["terracotta"], recommended_soil_mixes: ["aroid-chunky"],
      water_interval_days: 12, moisture_interval_days: 3,
    });
  });

  it("keeps completed care visible when its reminder is paused without putting paused tasks on Home", () => {
    const paused = { ...reminder, is_active: false };
    const completed = { ...task, status: "completed" as const, completed_at: "2026-10-14T12:00:00+02:00", note: "Watered" };
    expect(buildUITasks([task], [paused], plants)).toEqual([]);
    expect(buildUIHistoryItems([completed], [paused], plants)).toEqual([
      expect.objectContaining({ id: "21", reminderId: "8", completedAt: completed.completed_at, note: "Watered" }),
    ]);
  });

  it("preserves the server calendar date for editing regardless of its UTC representation", () => {
    const row = buildUIReminders([task], [reminder], plants)[0];
    expect(row.dueDateISO).toBe("2026-10-20");
    expect(row.dueDate.getFullYear()).toBe(2026);
    expect(row.dueDate.getMonth()).toBe(9);
    expect(row.dueDate.getDate()).toBe(20);
    expect(row.dueDate.getHours()).toBe(0);
  });

  it("treats Home due dates as local calendar dates too", () => {
    const row = buildUITasks([task], [reminder], plants)[0];
    expect(row.dueDate).toEqual(new Date(2026, 9, 20));
  });

  it("keeps completed history attached to its original care event after reminder edits", () => {
    const completed: ApiReminderTask = {
      ...task, status: "completed", completed_at: "2026-10-14T10:00:00Z",
      completed_event: {
        plant_id: 4, type: "water", plant_name: "Original fern", location_name: "Old room",
        interval_value: 12, interval_unit: "days", start_date: "2026-10-01",
      },
    };
    const moved = { ...reminder, plant: 9, type: "fertilize" as const, is_active: false };
    const renamedPlants = [{ id: 9, display_name: "Different plant", location: { name: "Other room" } }];
    expect(buildUIHistoryItems([completed], [moved], renamedPlants)).toEqual([
      expect.objectContaining({ type: "watering", plantId: "4", plant: "Original fern", location: "Old room" }),
    ]);
    expect(buildUIHistoryItems([completed], [], [])).toEqual([
      expect.objectContaining({ type: "watering", plantId: "4", plant: "Original fern", location: "Old room" }),
    ]);
  });
});
