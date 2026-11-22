import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { getAuthSessionId } from '../../../api/client';
import type { TaskCompletionResult } from '../../../api/services/home.service';

export type LevelUpCelebration = {
  previousLevel: number;
  level: number;
  notice?: string;
};

export function completionLevelUp(
  results: TaskCompletionResult[],
): LevelUpCelebration | null {
  const changes = results.flatMap(result =>
    result.levelUp ? [result.levelUp] : [],
  );
  if (!changes.length) return null;
  return {
    previousLevel: Math.min(...changes.map(change => change.previousLevel)),
    level: Math.max(...changes.map(change => change.level)),
  };
}

/** Only a confirmed completion in this screen visit can open a celebration. */
export function useLevelUpCelebration() {
  const focused = useIsFocused();
  const session = getAuthSessionId();
  const visit = useRef({ focused, session });
  if (visit.current.focused !== focused || visit.current.session !== session) {
    visit.current = { focused, session };
  }
  const [event, setEvent] = useState<{
    visit: typeof visit.current;
    value: LevelUpCelebration;
  } | null>(null);
  useEffect(
    () => () => {
      visit.current = { ...visit.current, focused: false };
    },
    [],
  );
  const begin = useCallback(() => {
    const current = visit.current;
    return (
      results: TaskCompletionResult[],
      notice?: string,
    ): 'stale' | 'modal' | 'toast' => {
      if (
        visit.current !== current ||
        !current.focused ||
        getAuthSessionId() !== current.session
      )
        return 'stale';
      const value = completionLevelUp(results);
      if (!value) return 'toast';
      setEvent({ visit: current, value: { ...value, notice } });
      return 'modal';
    };
  }, []);
  const dismiss = useCallback(() => setEvent(null), []);
  return {
    begin,
    dismiss,
    celebration: focused && event?.visit === visit.current ? event.value : null,
  };
}
