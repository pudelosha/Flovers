import { request } from "../../client";
import { buildUIReminders } from "../../serializers/reminders.serializer";
import {
  bulkDeleteReminderTasks,
  completeReminderTask,
  createReminder,
  deleteReminder,
  deleteReminderTask,
  listReminderTasks,
  listReminders,
  updateReminder,
} from "../reminders.service";

jest.mock("../../client", () => ({
  request: jest.fn(),
}));

const mockedRequest = request as jest.Mock;

describe("reminders.service and serializer", () => {
  beforeEach(() => {
    mockedRequest.mockReset();
    mockedRequest.mockResolvedValue({});
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-13T10:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates misting reminders using the backend moisture task type", async () => {
    const payload = {
      plant: 4,
      type: "moisture" as const,
      start_date: "2026-05-14",
      interval_value: 3,
      interval_unit: "days" as const,
      is_active: true,
    };

    await createReminder(payload, { auth: false });

    expect(mockedRequest).toHaveBeenCalledWith(
      "/api/reminders/",
      "POST",
      payload,
      { auth: false }
    );
  });

  it("sends completion notes when completing a task", async () => {
    await completeReminderTask(12, { auth: false }, { note: "Leaves sprayed" });

    expect(mockedRequest).toHaveBeenCalledWith(
      "/api/reminders/tasks/12/complete/",
      "POST",
      { note: "Leaves sprayed" },
      { auth: false }
    );
  });

  it("joins tasks, reminders and plants into reminder tile data", () => {
    const ui = buildUIReminders(
      [
        {
          id: 21,
          reminder: 8,
          due_date: "2026-05-14",
          status: "pending",
          completed_at: null,
          created_at: "2026-05-13T08:00:00Z",
          updated_at: "2026-05-13T08:00:00Z",
        },
      ],
      [
        {
          id: 8,
          plant: 4,
          type: "fertilize",
          start_date: "2026-05-14",
          interval_value: 14,
          interval_unit: "days",
          is_active: true,
          created_at: "2026-05-13T08:00:00Z",
          updated_at: "2026-05-13T08:00:00Z",
        },
      ],
      [
        {
          id: 4,
          display_name: "Window fern",
          location: { id: 2, name: "Kitchen" },
        },
      ]
    );

    expect(ui).toEqual([
      expect.objectContaining({
        id: "21",
        reminderId: "8",
        plant: "Window fern",
        plantId: "4",
        location: "Kitchen",
        type: "fertilising",
        due: "Tomorrow",
        intervalValue: 14,
        intervalUnit: "days",
      }),
    ]);
  });

  it("supports reminder list, update and delete actions", async () => {
    await listReminders({ auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/reminders/",
      "GET",
      undefined,
      { auth: false }
    );

    await listReminderTasks({ status: "completed", auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/reminders/tasks/?status=completed",
      "GET",
      undefined,
      { auth: false }
    );

    await updateReminder(
      8,
      { interval_value: 10, interval_unit: "days" },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/reminders/8/",
      "PATCH",
      { interval_value: 10, interval_unit: "days" },
      { auth: false }
    );

    await deleteReminder(8, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/reminders/8/",
      "DELETE",
      undefined,
      { auth: false }
    );
  });

  it("supports reminder history delete actions", async () => {
    await deleteReminderTask(21, { auth: false });
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/reminders/tasks/21/",
      "DELETE",
      undefined,
      { auth: false }
    );

    await bulkDeleteReminderTasks(
      { mode: "types", types: ["watering", "moisture"] },
      { auth: false }
    );
    expect(mockedRequest).toHaveBeenLastCalledWith(
      "/api/reminders/tasks/bulk-delete/",
      "POST",
      { mode: "types", types: ["watering", "moisture"] },
      { auth: false }
    );
  });
});
