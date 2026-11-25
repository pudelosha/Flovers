type ReadingSchedule = {
  status?: "enabled" | "disabled";
  lastReadISO?: string | null;
  createdAtISO?: string;
  intervalMinutes?: number;
};

/** Allow two reporting intervals, matching backend missing-reading notifications. */
export function readingDeadlineMs(data: ReadingSchedule): number | null {
  if (data.status === "disabled") return null;
  const baseline = data.lastReadISO || data.createdAtISO;
  if (!baseline) return null;
  const timestamp = Date.parse(baseline);
  if (!Number.isFinite(timestamp)) return null;
  const minutes = Number.isInteger(data.intervalMinutes) && data.intervalMinutes! >= 1
    && data.intervalMinutes! <= 1440 ? data.intervalMinutes! : 60;
  return timestamp + 2 * minutes * 60_000;
}

export function readingsAreOverdue(data: ReadingSchedule, now = Date.now()): boolean {
  const deadline = readingDeadlineMs(data);
  return deadline !== null && now >= deadline;
}
