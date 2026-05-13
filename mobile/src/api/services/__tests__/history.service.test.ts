import { request } from "../../client";
import {
  bulkDeleteReminderTasks,
  deleteReminderTask,
  listReminderTasks,
  listReminders,
} from "../reminders.service";
import { fetchPlantInstances } from "../plant-instances.service";
import {
  bulkDeleteHistoryEntries,
  deleteHistoryEntry,
  fetchHistoryItems,
  sendHistoryExportEmail,
} from "../history.service";

jest.mock("../../client", () => ({
  request: jest.fn(),
}));

jest.mock("../reminders.service", () => ({
  bulkDeleteReminderTasks: jest.fn(),
  deleteReminderTask: jest.fn(),
  listReminderTasks: jest.fn(),
  listReminders: jest.fn(),
}));

jest.mock("../plant-instances.service", () => ({
  fetchPlantInstances: jest.fn(),
}));

const mockedRequest = request as jest.Mock;
const mockedListTasks = listReminderTasks as jest.Mock;
const mockedListReminders = listReminders as jest.Mock;
const mockedFetchPlants = fetchPlantInstances as jest.Mock;

describe("history.service", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-13T10:00:00Z"));
    jest.clearAllMocks();
    mockedRequest.mockResolvedValue(undefined);
    mockedListTasks.mockResolvedValue([
      {
        id: 11,
        reminder: 3,
        due_date: "2026-05-12",
        status: "completed",
        completed_at: "2026-05-12T08:00:00Z",
        note: "done",
      },
    ]);
    mockedListReminders.mockResolvedValue([
      { id: 3, plant: 2, type: "moisture" },
    ]);
    mockedFetchPlants.mockResolvedValue([
      { id: 2, display_name: "Fern", location: { name: "Kitchen" } },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fetches completed history items", async () => {
    await expect(fetchHistoryItems()).resolves.toEqual([
      expect.objectContaining({
        id: "11",
        reminderId: "3",
        type: "moisture",
        plant: "Fern",
        location: "Kitchen",
        completedAt: "2026-05-12T08:00:00Z",
        note: "done",
      }),
    ]);
  });

  it("supports single, bulk and export history actions", async () => {
    await deleteHistoryEntry("11");
    expect(deleteReminderTask).toHaveBeenCalledWith(11, { auth: true });

    await deleteHistoryEntry("");
    expect(deleteReminderTask).toHaveBeenCalledTimes(1);

    await bulkDeleteHistoryEntries({ mode: "olderThan", days: 90 });
    expect(bulkDeleteReminderTasks).toHaveBeenCalledWith(
      { mode: "olderThan", days: 90 },
      { auth: true }
    );

    await sendHistoryExportEmail({ location: "Kitchen", lang: "en" });
    expect(mockedRequest).toHaveBeenCalledWith(
      "/api/reminders/tasks/export-email/",
      "POST",
      { location: "Kitchen", lang: "en" },
      { auth: true }
    );
  });
});
