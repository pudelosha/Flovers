import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { act, renderHook } from "@testing-library/react-native";
import { useReadingDevicesRefresh } from "../useReadingDevicesRefresh";
import { listReadingDevices } from "../../../../api/services/readings.service";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => (() => void)) => require("react").useEffect(effect, [effect]),
}));
jest.mock("../../../../api/services/readings.service", () => ({ listReadingDevices: jest.fn() }));
const list = listReadingDevices as jest.Mock;
let stateListener: (state: AppStateStatus) => void;
const originalState = AppState.currentState;
const remove = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  Object.defineProperty(AppState, "currentState", { configurable: true, value: "active", writable: true });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, callback) => {
    stateListener = callback;
    return { remove };
  });
  list.mockResolvedValue([{ id: 1, last_read_at: "2026-10-29T11:00:00Z" }]);
});
afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(AppState, "currentState", { configurable: true, value: originalState, writable: true });
  jest.useRealTimers();
});

it("quietly receives fresh device values once a minute and on foreground", async () => {
  const update = jest.fn();
  const hook = renderHook(() => useReadingDevicesRefresh(update, false));
  expect(list).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(update).toHaveBeenCalledWith([{ id: 1, last_read_at: "2026-10-29T11:00:00Z" }]);
  await act(async () => { stateListener("active"); });
  expect(list).toHaveBeenCalledTimes(2);
  hook.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(list).toHaveBeenCalledTimes(2);
});

it("pauses refresh while editing and while the application is in the background", async () => {
  const update = jest.fn();
  const hook = renderHook<void, { paused: boolean }>(({ paused }) => useReadingDevicesRefresh(update, paused), { initialProps: { paused: true } });
  await act(async () => { jest.advanceTimersByTime(120_000); stateListener("active"); });
  expect(list).not.toHaveBeenCalled();
  hook.rerender({ paused: false });
  Object.defineProperty(AppState, "currentState", { value: "background" });
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(list).not.toHaveBeenCalled();
  hook.unmount();
});

it("keeps existing data on a refresh error and ignores a response after editing begins", async () => {
  const update = jest.fn();
  list.mockRejectedValueOnce(new Error("Offline"));
  const hook = renderHook<void, { paused: boolean }>(({ paused }) => useReadingDevicesRefresh(update, paused), { initialProps: { paused: false } });
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(update).not.toHaveBeenCalled();
  let resolve: ((devices: unknown[]) => void) | undefined;
  list.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  await act(async () => { jest.advanceTimersByTime(60_000); });
  hook.rerender({ paused: true });
  await act(async () => { resolve?.([{ id: 1 }]); });
  expect(update).not.toHaveBeenCalled();
  hook.unmount();
});
