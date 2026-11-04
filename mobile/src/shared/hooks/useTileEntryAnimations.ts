import { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/** Start tile transitions after ready content commits; replay on screen entry. */
export function useTileEntryAnimations(
  ids: string[],
  ready: boolean,
  focused: boolean,
) {
  const values = useRef(new Map<string, Animated.Value>());
  const shown = useRef(new Set<string>());
  const valueFor = useCallback((id: string) => {
    if (!values.current.has(id)) values.current.set(id, new Animated.Value(0));
    return values.current.get(id)!;
  }, []);
  const signature = JSON.stringify(ids);
  useEffect(() => {
    if (!ready || !focused) {
      shown.current.clear();
      values.current.forEach(value => {
        value.stopAnimation();
        value.setValue(0);
      });
      return;
    }
    const keys: string[] = JSON.parse(signature);
    const fresh = keys.filter(id => !shown.current.has(id));
    if (!fresh.length) return;
    fresh.forEach(id => {
      shown.current.add(id);
      valueFor(id).setValue(0);
    });
    let animation: Animated.CompositeAnimation | undefined;
    const frame = requestAnimationFrame(() => {
      animation = Animated.parallel(
        fresh.map((id, index) =>
          Animated.timing(valueFor(id), {
            toValue: 1,
            duration: 280,
            delay: Math.min(index, 7) * 50,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ),
      );
      animation.start();
    });
    return () => {
      cancelAnimationFrame(frame);
      animation?.stop();
      // An interrupted page append must never leave existing tiles invisible.
      fresh.forEach(id => valueFor(id).setValue(1));
    };
  }, [signature, ready, focused, valueFor]);
  const styleFor = useCallback(
    (id: string) => {
      const value = valueFor(id);
      return {
        opacity: value,
        transform: [
          {
            translateY: value.interpolate({
              inputRange: [0, 1],
              outputRange: [14, 0],
            }),
          },
          {
            scale: value.interpolate({
              inputRange: [0, 1],
              outputRange: [0.98, 1],
            }),
          },
        ],
      };
    },
    [valueFor],
  );
  return { valueFor, styleFor };
}
