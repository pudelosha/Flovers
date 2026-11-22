import { act, renderHook } from '@testing-library/react-native';
import {
  completionLevelUp,
  useLevelUpCelebration,
} from '../useLevelUpCelebration';
let mockFocused = true;
let mockSession = 1;
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockFocused,
}));
jest.mock('../../../../api/client', () => ({
  getAuthSessionId: () => mockSession,
}));
const noLevel = { xpGained: 50, levelUp: null };
const raised = { xpGained: 100, levelUp: { previousLevel: 1, level: 2 } };
beforeEach(() => {
  mockFocused = true;
  mockSession = 1;
});
it('uses the toast for non-level completions and the modal instead when a level rises', () => {
  const { result } = renderHook(useLevelUpCelebration);
  expect(result.current.celebration).toBeNull();
  expect(result.current.begin()([noLevel])).toBe('toast');
  let feedback: string;
  act(() => {
    feedback = result.current.begin()([raised]);
  });
  expect(feedback!).toBe('modal');
  expect(result.current.celebration).toMatchObject(raised.levelUp!);
  act(() => result.current.dismiss());
  expect(result.current.celebration).toBeNull();
});
it('combines bulk successes into one final level and preserves a partial-failure notice', () => {
  expect(
    completionLevelUp([
      raised,
      noLevel,
      { xpGained: 100, levelUp: { previousLevel: 2, level: 3 } },
    ]),
  ).toEqual({ previousLevel: 1, level: 3 });
  const { result } = renderHook(useLevelUpCelebration);
  act(() => {
    result.current.begin()([raised], 'One task failed');
  });
  expect(result.current.celebration?.notice).toBe('One task failed');
});
it('ignores late completion results after blur, return, logout or unmount', () => {
  const { result, rerender, unmount } = renderHook(useLevelUpCelebration);
  const previousVisit = result.current.begin();
  mockFocused = false;
  rerender({});
  mockFocused = true;
  rerender({});
  expect(previousVisit([raised])).toBe('stale');
  const previousAccount = result.current.begin();
  mockSession = 2;
  expect(previousAccount([raised])).toBe('stale');
  rerender({});
  const removed = result.current.begin();
  unmount();
  expect(removed([raised])).toBe('stale');
});
it('does not replay an opened celebration when returning to the screen', () => {
  const { result, rerender } = renderHook(useLevelUpCelebration);
  act(() => {
    result.current.begin()([raised]);
  });
  mockFocused = false;
  rerender({});
  expect(result.current.celebration).toBeNull();
  mockFocused = true;
  rerender({});
  expect(result.current.celebration).toBeNull();
});
