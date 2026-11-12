// PositiveSmallIntegerField's portable range in the backend contract.
export const MAX_TASK_INTERVAL = 32767;

export function clampTaskInterval(value: number, fallback = 1): number {
  const number = Number.isFinite(value) ? value : fallback;
  return Math.max(1, Math.min(MAX_TASK_INTERVAL, Math.round(number)));
}

/** Keep practical slider ranges without losing a longer server recommendation. */
export function taskIntervalControlMaximum(value: number, practicalMaximum: number): number {
  return Math.max(practicalMaximum, clampTaskInterval(value));
}

// The optional native-slider fallback must not render tens of thousands of
// buttons for a long valid interval. Adjacent values still permit fine edits.
export function taskIntervalChoices(value: number, min: number, max: number): number[] {
  if (max - min < 90) return Array.from({ length: max - min + 1 }, (_, index) => index + min);
  return [...new Set([min, 2, 3, 7, 14, 30, 60, 90, 120, 180, 365, 730, value - 1, value, value + 1, max])]
    .filter(option => option >= min && option <= max)
    .sort((left, right) => left - right);
}
