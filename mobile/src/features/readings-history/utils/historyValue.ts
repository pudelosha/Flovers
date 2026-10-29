import type { ApiHistoryPoint } from "../../../api/services/readings.service";

/** Preserve real zero values while rendering older servers' zero-filled gaps as before. */
export function historyValue(point: ApiHistoryPoint): number | null {
  if (point.sample_count === 0 || (point.sample_count === undefined && point.value === 0)) return null;
  return typeof point.value === "number" && Number.isFinite(point.value) ? point.value : null;
}
