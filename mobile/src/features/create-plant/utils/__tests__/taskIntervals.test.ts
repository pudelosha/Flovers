import { clampTaskInterval, taskIntervalChoices, taskIntervalControlMaximum } from '../taskIntervals';

it('uses the backend integer range without shrinking legitimate long recommendations', () => {
  expect([24, 48, 120, 365, 32767].map(value => clampTaskInterval(value))).toEqual([24, 48, 120, 365, 32767]);
  expect(clampTaskInterval(0)).toBe(1);
  expect(clampTaskInterval(32768)).toBe(32767);
  expect(clampTaskInterval(Number.NaN)).toBe(1);
  expect(taskIntervalControlMaximum(24, 48)).toBe(48);
  expect(taskIntervalControlMaximum(365, 365)).toBe(365);
  expect(taskIntervalControlMaximum(730, 365)).toBe(730);
});

it('keeps the non-native fallback bounded while preserving the value and adjacent edits', () => {
  expect(taskIntervalChoices(24, 1, 48)).toHaveLength(48);
  const choices = taskIntervalChoices(30000, 1, 32767);
  expect(choices.length).toBeLessThanOrEqual(16);
  expect(choices).toEqual(expect.arrayContaining([1, 29999, 30000, 30001, 32767]));
});
