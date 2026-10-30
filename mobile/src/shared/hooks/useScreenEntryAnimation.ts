import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing } from "react-native";

/** The Profile fade/slide/scale transition, started only after content is ready. */
export function useScreenEntryAnimation(ready: boolean, focused: boolean) {
  const entry = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    entry.stopAnimation();
    if (!ready) { entry.setValue(0); return; }
    const animation = Animated.timing(entry, {
      toValue: focused ? 1 : 0,
      duration: focused ? 220 : 160,
      easing: focused ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entry, ready, focused]);

  return useMemo(() => ({
    opacity: entry,
    transform: [
      { translateY: entry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      { scale: entry.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
    ],
  }), [entry]);
}
