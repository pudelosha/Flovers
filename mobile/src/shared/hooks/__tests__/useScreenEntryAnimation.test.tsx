import { renderHook } from "@testing-library/react-native";
import { Animated } from "react-native";
import { useScreenEntryAnimation } from "../useScreenEntryAnimation";

const start = jest.fn(); const stop = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Animated, "timing").mockReturnValue({ start, stop, reset: jest.fn() });
});
afterEach(() => { jest.restoreAllMocks(); });

it("does not consume the entry animation while data or photos are loading", () => {
  const view = renderHook<ReturnType<typeof useScreenEntryAnimation>, { ready: boolean }>(
    ({ ready }) => useScreenEntryAnimation(ready, true), { initialProps: { ready: false } });
  expect(Animated.timing).not.toHaveBeenCalled();
  view.rerender({ ready: true });
  expect(Animated.timing).toHaveBeenCalledTimes(1);
  expect(Animated.timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: 220, useNativeDriver: true }));
  expect(start).toHaveBeenCalledTimes(1);
  view.unmount();
});

it("replays on screen entry without replaying for background data updates", () => {
  const view = renderHook<ReturnType<typeof useScreenEntryAnimation>, { focused: boolean; update: number }>(
    ({ focused }) => useScreenEntryAnimation(true, focused), { initialProps: { focused: true, update: 0 } });
  view.rerender({ focused: true, update: 1 });
  expect(Animated.timing).toHaveBeenCalledTimes(1);
  view.rerender({ focused: false, update: 1 });
  expect(Animated.timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0, duration: 160 }));
  view.rerender({ focused: true, update: 1 });
  expect(Animated.timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: 220 }));
  expect(Animated.timing).toHaveBeenCalledTimes(3);
  view.unmount();
});

it("stops an interrupted transition and waits for the next ready state", () => {
  const view = renderHook<ReturnType<typeof useScreenEntryAnimation>, { ready: boolean }>(
    ({ ready }) => useScreenEntryAnimation(ready, true), { initialProps: { ready: true } });
  view.rerender({ ready: false });
  expect(stop).toHaveBeenCalledTimes(1);
  expect(Animated.timing).toHaveBeenCalledTimes(1);
  view.rerender({ ready: true });
  expect(Animated.timing).toHaveBeenCalledTimes(2);
  view.unmount();
  expect(stop).toHaveBeenCalledTimes(2);
});
