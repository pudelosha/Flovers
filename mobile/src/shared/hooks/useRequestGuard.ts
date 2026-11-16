import { useEffect, useMemo } from 'react';

/** Only the latest request in the current screen visit may publish its result. */
export function createRequestGuard() {
  let generation = 0;
  let active = true;
  return {
    cancelPending() {
      generation++;
    },
    activate() {
      active = true;
      generation++;
    },
    invalidate() {
      active = false;
      generation++;
    },
    begin() {
      const request = ++generation;
      return () => active && request === generation;
    },
  };
}

export function useRequestGuard() {
  const guard = useMemo(createRequestGuard, []);
  useEffect(() => () => guard.invalidate(), [guard]);
  return guard;
}
