import {
  completeReminderTask,
  deleteReminder,
  listReminderTasks,
  listReminders,
} from '../reminders.service';
import { fetchPlantInstances } from '../plant-instances.service';
import {
  deleteHomeTask,
  fetchHomeHistoryTasks,
  fetchHomeTasks,
  markHomeTaskComplete,
} from '../home.service';

jest.mock('../reminders.service', () => ({
  completeReminderTask: jest.fn(),
  deleteReminder: jest.fn(),
  listReminderTasks: jest.fn(),
  listReminders: jest.fn(),
}));

jest.mock('../plant-instances.service', () => ({
  fetchPlantInstances: jest.fn(),
}));

const mockedListTasks = listReminderTasks as jest.Mock;
const mockedListReminders = listReminders as jest.Mock;
const mockedFetchPlants = fetchPlantInstances as jest.Mock;
const mockedComplete = completeReminderTask as jest.Mock;
const mockedDeleteReminder = deleteReminder as jest.Mock;

it('returns only the XP reported by the backend, including zero for old responses', async () => {
  mockedComplete.mockResolvedValueOnce({ xp_awarded: 50 });
  await expect(markHomeTaskComplete('11')).resolves.toEqual({
    xpGained: 50,
    levelUp: null,
  });
  mockedComplete.mockResolvedValueOnce({ xp_awarded: 0 });
  await expect(markHomeTaskComplete('12')).resolves.toEqual({
    xpGained: 0,
    levelUp: null,
  });
  mockedComplete.mockResolvedValueOnce({});
  await expect(markHomeTaskComplete('13')).resolves.toEqual({
    xpGained: 0,
    levelUp: null,
  });
});

describe('home.service', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-13T10:00:00Z'));
    jest.clearAllMocks();
    mockedListTasks.mockResolvedValue([
      {
        id: 11,
        reminder: 3,
        due_date: '2026-05-13',
        status: 'pending',
        completed_at: null,
      },
    ]);
    mockedListReminders.mockResolvedValue([
      {
        id: 3,
        plant: 2,
        type: 'water',
        interval_value: 7,
        interval_unit: 'days',
        is_active: true,
      },
    ]);
    mockedFetchPlants.mockResolvedValue([
      {
        id: 2,
        display_name: 'Fern',
        location: { name: 'Kitchen' },
      },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches pending and completed home tasks', async () => {
    await expect(fetchHomeTasks()).resolves.toEqual([
      expect.objectContaining({
        id: '11',
        reminderId: '3',
        type: 'watering',
        plant: 'Fern',
        location: 'Kitchen',
        due: 'Today',
      }),
    ]);
    expect(mockedListTasks).toHaveBeenCalledWith({
      status: 'pending',
      auth: true,
    });

    await fetchHomeHistoryTasks();
    expect(mockedListTasks).toHaveBeenLastCalledWith({
      status: 'completed',
      auth: true,
    });
  });

  it('completes tasks with trimmed notes and deletes underlying reminders', async () => {
    await markHomeTaskComplete('11', '  done  ');
    expect(mockedComplete).toHaveBeenCalledWith(
      11,
      { auth: true },
      { note: 'done' },
    );

    await markHomeTaskComplete('11', '  done  ', '2026-05-27');
    expect(mockedComplete).toHaveBeenLastCalledWith(
      11,
      { auth: true },
      { note: 'done', completedDate: '2026-05-27' },
    );

    await markHomeTaskComplete('11', '   ');
    expect(mockedComplete).toHaveBeenLastCalledWith(
      11,
      { auth: true },
      undefined,
    );

    await deleteHomeTask('3');
    expect(mockedDeleteReminder).toHaveBeenCalledWith(3, { auth: true });

    await deleteHomeTask('');
    expect(mockedDeleteReminder).toHaveBeenCalledTimes(1);
  });
});

it('returns only a valid level increase associated with awarded XP', async () => {
  mockedComplete.mockResolvedValueOnce({
    xp_awarded: 100,
    level_up: { previous_level: 1, level: 2 },
  });
  await expect(markHomeTaskComplete('11')).resolves.toEqual({
    xpGained: 100,
    levelUp: { previousLevel: 1, level: 2 },
  });
  for (const value of [
    { previous_level: 5, level: 4 },
    { previous_level: 99, level: 101 },
    { previous_level: 1, level: '2' },
  ]) {
    mockedComplete.mockResolvedValueOnce({ xp_awarded: 50, level_up: value });
    await expect(markHomeTaskComplete('11')).resolves.toEqual({
      xpGained: 50,
      levelUp: null,
    });
  }
  mockedComplete.mockResolvedValueOnce({
    xp_awarded: 0,
    level_up: { previous_level: 1, level: 2 },
  });
  await expect(markHomeTaskComplete('11')).resolves.toEqual({
    xpGained: 0,
    levelUp: null,
  });
});
