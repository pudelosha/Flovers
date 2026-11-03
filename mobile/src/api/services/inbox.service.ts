import { ApiError, request } from '../client';
export type InboxSource = 'task' | 'pump' | 'device' | 'user';
export type InboxChannel = 'email' | 'push' | 'in_app';
export type InboxItem = {
  id: string;
  source: InboxSource;
  channel: InboxChannel;
  kind: string;
  payload: Record<string, string | number>;
  createdAt: string;
};
export type InboxQuery = {
  source?: InboxSource;
  channel?: InboxChannel;
  from_date?: string;
  to_date?: string;
  timezone?: string;
  sort?: 'date' | 'source' | 'channel';
  direction?: 'asc' | 'desc';
};
export type InboxPage = {
  items: InboxItem[];
  nextCursor: string | null;
  total: number;
  snapshot: string;
};
const root = '/profile/inbox/';
function parse(raw: any): InboxPage {
  const data = raw?.data;
  if (
    !data ||
    !Array.isArray(data.items) ||
    typeof data.snapshot !== 'string' ||
    !Number.isInteger(data.total) ||
    data.total < 0 ||
    (data.next_cursor !== null && typeof data.next_cursor !== 'string')
  )
    throw new ApiError(502, {}, 'Invalid inbox response');
  return {
    snapshot: data.snapshot,
    total: data.total,
    nextCursor: data.next_cursor,
    items: data.items.map((x: any) => {
      if (
        !/^[1-9]\d*$/.test(x.id) ||
        !['task', 'pump', 'device', 'user'].includes(x.source) ||
        !['email', 'push', 'in_app'].includes(x.channel) ||
        typeof x.kind !== 'string' ||
        !Number.isFinite(Date.parse(x.created_at)) ||
        !x.payload ||
        typeof x.payload !== 'object' ||
        Array.isArray(x.payload)
      )
        throw new ApiError(502, {}, 'Invalid inbox entry');
      return {
        id: x.id,
        source: x.source,
        channel: x.channel,
        kind: x.kind,
        payload: x.payload,
        createdAt: x.created_at,
      };
    }),
  };
}
export async function fetchInbox(
  query: InboxQuery = {},
  cursor?: string,
): Promise<InboxPage> {
  const params = Object.entries({ ...query, ...(cursor ? { cursor } : {}) })
    .filter(([, v]) => v !== undefined && v !== '')
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join('&');
  return parse(
    await request(root + (params ? '?' + params : ''), 'GET', undefined, {
      auth: true,
    }),
  );
}
export async function deleteInboxItem(id: string): Promise<void> {
  if (!/^[1-9]\d*$/.test(id)) throw new Error('Invalid notification ID');
  await request(root + id + '/', 'DELETE', undefined, { auth: true });
}
export async function deleteInboxBatch(
  snapshot: string,
  scope: 'filtered' | 'all',
  filters: InboxQuery,
): Promise<number> {
  const raw = await request<any>(
    root + 'delete/',
    'POST',
    { snapshot, scope, filters },
    { auth: true },
  );
  if (!Number.isInteger(raw?.data?.deleted) || raw.data.deleted < 0)
    throw new ApiError(502, {}, 'Invalid deletion response');
  return raw.data.deleted;
}
