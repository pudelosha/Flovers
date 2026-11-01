import { ApiError, request } from '../client';
import {
  deleteReminderTask,
  bulkDeleteReminderTasks,
} from './reminders.service';
import {
  parseJournalPhoto,
  type JournalPlantOption,
} from './journal-photos.service';
import type {
  JournalEntry,
  JournalFilterType,
} from '../../features/task-history/types/task-history.types';
import type { TaskType } from '../../features/home/types/home.types';

export type JournalQuery = {
  plantId?: string;
  location?: string;
  types?: JournalFilterType[];
  completedFrom?: string;
  completedTo?: string;
  sortKey?: 'completedAt' | 'plant' | 'location';
  sortDir?: 'asc' | 'desc';
  timezone?: string;
};
export type JournalPage = {
  items: JournalEntry[];
  nextCursor: string | null;
  canManageTasks: boolean;
};
export type JournalOptions = {
  plants: { id: string; name: string }[];
  locations: string[];
  ownedPlants: JournalPlantOption[];
  deletePlants: { id: string; name: string }[];
  deleteLocations: string[];
};
const invalidFeed = () =>
  new ApiError(
    502,
    { code: 'invalid_journal_feed' },
    'Invalid journal response',
  );
const taskTypes = ['watering', 'moisture', 'fertilising', 'care', 'repot'];
function parseEntry(entry: any): JournalEntry {
  if (entry?.kind === 'photo') return parseJournalPhoto(entry.data);
  const value = entry?.data;
  if (
    entry?.kind !== 'task' ||
    !value ||
    !/^[1-9]\d*$/.test(value.id) ||
    !/^[1-9]\d*$/.test(value.plant_id) ||
    !taskTypes.includes(value.type) ||
    typeof value.plant_name !== 'string' ||
    typeof value.location_name !== 'string' ||
    !Number.isFinite(Date.parse(value.completed_at)) ||
    !value.access ||
    typeof value.access.can_edit !== 'boolean'
  )
    throw invalidFeed();
  return {
    id: value.id,
    plantId: value.plant_id,
    reminderId: value.reminder_id,
    plant: value.plant_name,
    location: value.location_name,
    type: value.type,
    completedAt: value.completed_at,
    completedBy: value.completed_by ?? undefined,
    note: value.notes,
    access: value.access,
  };
}
export async function fetchJournalPage(
  query: JournalQuery = {},
  cursor?: string | null,
): Promise<JournalPage> {
  const values = {
    ...query,
    types: query.types?.join(','),
    limit: 30,
    cursor: cursor || undefined,
  };
  const params = Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&');
  const body = await request<any>(
    `/journal/entries/?${params}`,
    'GET',
    undefined,
    { auth: true },
  );
  if (
    !Array.isArray(body?.results) ||
    body.results.length > 30 ||
    (body.next_cursor !== null && typeof body.next_cursor !== 'string') ||
    typeof body.can_manage_tasks !== 'boolean'
  )
    throw invalidFeed();
  return {
    items: body.results.map(parseEntry),
    nextCursor: body.next_cursor,
    canManageTasks: body.can_manage_tasks,
  };
}
export async function fetchJournalOptions(): Promise<JournalOptions> {
  const body = await request<any>('/journal/options/', 'GET', undefined, {
    auth: true,
  });
  const plants = (value: any) => {
    if (
      !Array.isArray(value) ||
      value.some(
        item =>
          typeof item?.id !== 'string' ||
          !/^[1-9]\d*$/.test(item.id) ||
          typeof item.name !== 'string',
      )
    )
      throw invalidFeed();
    return value;
  };
  const strings = (value: any) => {
    if (!Array.isArray(value) || value.some(item => typeof item !== 'string'))
      throw invalidFeed();
    return value;
  };
  return {
    plants: plants(body?.plants),
    locations: strings(body?.locations),
    ownedPlants: plants(body?.owned_plants),
    deletePlants: plants(body?.delete_plants),
    deleteLocations: strings(body?.delete_locations),
  };
}

/**
 * Delete a single completed task from history (dropdown "Delete").
 *
 * Backend:
 *   DELETE /reminders/tasks/<id>/
 * physically removes the ReminderTask row.
 */
export async function deleteHistoryEntry(taskId: string): Promise<void> {
  if (!taskId) return;
  await deleteReminderTask(Number(taskId), { auth: true });
}

/**
 * Shape of the bulk-delete request, parallel to HistoryDeletePayload
 * used by DeleteHistoryTasksModal.
 */
export type HistoryBulkDeleteRequest =
  | { mode: 'plant'; plantId: string }
  | { mode: 'location'; location: string }
  | { mode: 'types'; types: TaskType[] }
  | { mode: 'olderThan'; days: number };

/**
 * Bulk delete completed tasks from history (modal "Delete" action).
 *
 * Backend:
 *   POST /reminders/tasks/bulk-delete/
 *   body = HistoryBulkDeleteRequest
 */
export async function bulkDeleteHistoryEntries(
  payload: HistoryBulkDeleteRequest,
): Promise<void> {
  await bulkDeleteReminderTasks(payload as any, { auth: true });
}

export type HistoryExportSortKey = 'completedAt' | 'plant' | 'location';
export type HistoryExportSortDir = 'asc' | 'desc';

export type HistoryExportEmailRequest = {
  plantId?: string;
  location?: string;
  types?: TaskType[];
  completedFrom?: string;
  completedTo?: string;
  sortKey?: HistoryExportSortKey;
  sortDir?: HistoryExportSortDir;
  includePending?: boolean;
  lang?: string;
};

/**
 * Send task history export email request.
 *
 * Backend expected:
 *   POST /reminders/tasks/export-email/
 *   body = HistoryExportEmailRequest
 *
 * Response:
 *   200/202 when export email request is accepted.
 */
export async function sendHistoryExportEmail(
  payload: HistoryExportEmailRequest,
): Promise<void> {
  await request<void>('/reminders/tasks/export-email/', 'POST', payload, {
    auth: true,
  });
}
