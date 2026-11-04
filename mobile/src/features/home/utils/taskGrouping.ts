export function taskDateKey(date: Date | string): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const value = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(+value)) return '';
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(value.getDate()).padStart(2, '0')}`;
}

export function dueDayOffset(value: Date | string, today = new Date()): number {
  const key = taskDateKey(value),
    now = taskDateKey(today);
  return Math.round((Date.parse(key) - Date.parse(now)) / 86400000);
}
export function relativeDueLabel(value: Date | string, t: any): string {
  const days = dueDayOffset(value);
  if (!Number.isFinite(days)) return '';
  if (days === 0) return t('home.due.today');
  if (days === 1) return t('home.due.tomorrow');
  return days < 0
    ? t('home.due.overdueByDays', { count: -days })
    : t('home.due.inDays', { count: days });
}
export function groupTasksByDay<T extends { dueDate: Date | string }>(
  tasks: T[],
  descending = false,
): T[] {
  const groups = new Map<string, T[]>();
  for (const task of tasks) {
    const key = taskDateKey(task.dueDate);
    groups.set(key, [...(groups.get(key) || []), task]);
  }
  return [...groups.keys()]
    .sort((a, b) => (descending ? b.localeCompare(a) : a.localeCompare(b)))
    .flatMap(key => groups.get(key)!);
}

export function formatDateWithPattern(
  d: Date | string,
  pattern: string,
): string {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(+dt)) return '';

  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();

  const fmt = pattern && typeof pattern === 'string' ? pattern : 'DD.MM.YYYY';

  return fmt.replace('YYYY', String(yyyy)).replace('MM', mm).replace('DD', dd);
}
