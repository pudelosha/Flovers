import {
  completeReminderTask,
  deleteReminder,
  listReminderTasks,
  listReminders,
} from "../reminders.service";
import { fetchPlantInstances } from "../plant-instances.service";
import {
  deleteHomeTask,
  fetchHomeHistoryTasks,
  fetchHomeTasks,
  markHomeTaskComplete,
} from "../home.service";

jest.mock("../reminders.service", () => ({
  completeReminderTask: jest.fn(),
  deleteReminder: jest.fn(),
  listReminderTasks: jest.fn(),
  listReminders: jest.fn(),
}));

jest.mock("../plant-instances.service", () => ({
  fetchPlantInstances: jest.fn(),
}));

const mockedListTasks = listReminderTasks as jest.Mock;
const mockedListReminders = listReminders as jest.Mock;
const mockedFetchPlants = fetchPlantInstances as jest.Mock;
const mockedComplete = completeReminderTask as jest.Mock;
const mockedDeleteReminder = deleteReminder as jest.Mock;

describe("home.service", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-13T10:00:00Z"));
    jest.clearAllMocks();
    mockedListTasks.mockResolvedValue([
      {
        id: 11,
        reminder: 3,
        due_date: "2026-05-13",
        status: "pending",
        completed_at: null,
      },
    ]);
    mockedListReminders.mockResolvedValue([
      {
        id: 3,
        plant: 2,
        type: "water",
        interval_value: 7,
        interval_unit: "days",
      },
    ]);
    mockedFetchPlants.mockResolvedValue([
      {
        id: 2,
        display_name: "Fern",
        location: { name: "Kitchen" },
      },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fetches pending and completed home tasks", async () => {
    await expect(fetchHomeTasks()).resolves.toEqual([
      expect.objectContaining({
        id: "11",
        reminderId: "3",
        type: "watering",
        plant: "Fern",
        location: "Kitchen",
        due: "Today",
      }),
    ]);
    expect(mockedListTasks).toHaveBeenCalledWith({ status: "pending", auth: true });

    await fetchHomeHistoryTasks();
    expect(mockedListTasks).toHaveBeenLastCalledWith({
      status: "completed",
      auth: true,
    });
  });

  it("completes tasks with trimmed notes and deletes underlying reminders", async () => {
    await markHomeTaskComplete("11", "  done  ");
    expect(mockedComplete).toHaveBeenCalledWith(
      11,
      { auth: true },
      { note: "done" }
    );

    await markHomeTaskComplete("11", "   ");
    expect(mockedComplete).toHaveBeenLastCalledWith(11, { auth: true }, undefined);

    await deleteHomeTask("3");
    expect(mockedDeleteReminder).toHaveBeenCalledWith(3, { auth: true });

    await deleteHomeTask("");
    expect(mockedDeleteReminder).toHaveBeenCalledTimes(1);
  });
});
