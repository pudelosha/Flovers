import { request } from '../../client';
import {
  bulkDeleteReminderTasks,
  deleteReminderTask,
} from '../reminders.service';
import {
  fetchJournalPage,
  fetchJournalOptions,
  bulkDeleteHistoryEntries,
  deleteHistoryEntry,
  sendHistoryExportEmail,
} from '../history.service';
jest.mock('../../client', () => ({
  ...jest.requireActual('../../client'),
  request: jest.fn(),
}));
jest.mock('../reminders.service', () => ({
  bulkDeleteReminderTasks: jest.fn(),
  deleteReminderTask: jest.fn(),
}));
const mockedRequest = request as jest.Mock;
const task = {
  id: '11',
  plant_id: '2',
  reminder_id: '3',
  plant_name: 'Fern',
  location_name: 'Kitchen',
  type: 'moisture',
  completed_at: '2026-05-12T08:00:00Z',
  notes: 'done',
  completed_by: { id: '1', name: 'Owner' },
  access: { can_edit: true },
};
describe('history.service', () => {
  it('accepts pruning journal entries and sends the pruning filter to the server', async () => {
    mockedRequest.mockResolvedValue({ results: [{ kind: 'task', data: { ...task, type: 'pruning' } }], next_cursor: null, can_manage_tasks: true });
    const result = await fetchJournalPage({ types: ['pruning'] });
    expect(result.items[0]).toMatchObject({ type: 'pruning', completedBy: { id: '1', name: 'Owner' } });
    expect(mockedRequest.mock.calls[0][0]).toContain('types=pruning');
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequest.mockResolvedValue(undefined);
  });
  it('fetches a bounded authenticated feed with filters, sort and opaque cursor', async () => {
    mockedRequest.mockResolvedValue({
      results: [{ kind: 'task', data: task }],
      next_cursor: 'signed:cursor',
      can_manage_tasks: true,
    });
    const result = await fetchJournalPage(
      {
        plantId: '2',
        location: 'Living room',
        types: ['photo', 'moisture'],
        sortKey: 'plant',
        sortDir: 'asc',
      },
      'opaque+cursor',
    );
    expect(mockedRequest).toHaveBeenCalledTimes(1);
    const [path, method, body, auth] = mockedRequest.mock.calls[0];
    expect(path).toContain('/journal/entries/?');
    expect(path).toContain('types=photo%2Cmoisture');
    expect(path).toContain('location=Living%20room');
    expect(path).toContain('limit=30');
    expect(path).toContain('cursor=opaque%2Bcursor');
    expect([method, body, auth]).toEqual(['GET', undefined, { auth: true }]);
    expect(result).toMatchObject({
      nextCursor: 'signed:cursor',
      canManageTasks: true,
      items: [
        {
          id: '11',
          plantId: '2',
          reminderId: '3',
          plant: 'Fern',
          note: 'done',
        },
      ],
    });
  });
  it.each([
    { results: null },
    { results: [{ kind: 'wrong', data: task }] },
    { results: [{ kind: 'task', data: { ...task, access: null } }] },
    { results: Array(31).fill({ kind: 'task', data: task }) },
  ])('rejects invalid feed data', async invalid => {
    mockedRequest.mockResolvedValue({
      next_cursor: null,
      can_manage_tasks: true,
      ...invalid,
    });
    await expect(fetchJournalPage()).rejects.toMatchObject({ status: 502 });
  });
  it('fetches lightweight global options once, independent of loaded journal pages', async () => {
    mockedRequest.mockResolvedValue({
      plants: [{ id: '2', name: 'Fern' }],
      locations: ['Kitchen'],
      owned_plants: [{ id: '2', name: 'Fern', location: 'Kitchen' }],
      delete_plants: [],
      delete_locations: [],
    });
    await expect(fetchJournalOptions()).resolves.toMatchObject({
      plants: [{ id: '2', name: 'Fern' }],
      ownedPlants: [{ id: '2', name: 'Fern', location: 'Kitchen' }],
      deletePlants: [],
    });
    expect(mockedRequest).toHaveBeenCalledWith(
      '/journal/options/',
      'GET',
      undefined,
      { auth: true },
    );
  });
  it('supports single, bulk and export history actions', async () => {
    await deleteHistoryEntry('11');
    expect(deleteReminderTask).toHaveBeenCalledWith(11, { auth: true });

    await deleteHistoryEntry('');
    expect(deleteReminderTask).toHaveBeenCalledTimes(1);

    await bulkDeleteHistoryEntries({ mode: 'olderThan', days: 90 });
    expect(bulkDeleteReminderTasks).toHaveBeenCalledWith(
      { mode: 'olderThan', days: 90 },
      { auth: true },
    );

    await sendHistoryExportEmail({ location: 'Kitchen', lang: 'en' });
    expect(mockedRequest).toHaveBeenCalledWith(
      '/reminders/tasks/export-email/',
      'POST',
      { location: 'Kitchen', lang: 'en' },
      { auth: true },
    );
  });
});

it.each([[true,"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",true],[false,"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",false],[true,"bad-token",false],[true,null,false]])("only accepts a server UUID for owner undo eligibility",async(canEdit,token,available)=>{
 mockedRequest.mockResolvedValue({results:[{kind:"task",data:{...task,access:{can_edit:canEdit},undo_completion:token}}],next_cursor:null,can_manage_tasks:true});
 const page=await fetchJournalPage();expect(!!(page.items[0] as any).undoCompletion).toBe(available);
});
