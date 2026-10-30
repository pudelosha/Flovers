import { act, renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { setAuthToken } from "../../../api/client";
import { getCachedPlantPhotoUri, loadPlantPhoto, onPlantPhotoCacheInvalidated } from "../../../api/services/plant-photos.service";
import type { PlantPhoto } from "../../../api/services/plant-photos.service";
import { usePlantPhoto } from "../usePlantPhoto";

jest.mock("../../../api/services/plant-photos.service", () => ({
  getCachedPlantPhotoUri: jest.fn(), loadPlantPhoto: jest.fn(), onPlantPhotoCacheInvalidated: jest.fn(),
}));
const photo: PlantPhoto = { id: "00000000-0000-4000-8000-000000000001", url: "/image/1", thumbnail_url: "/image/1?thumbnail",
  width: 300, height: 200, byte_size: 2000 };
let foreground: (state: AppStateStatus) => void;
let invalidation: (reason: "change" | "session") => void;
const remove = jest.fn();
const unwatch = jest.fn();
const originalState = AppState.currentState;
const load = loadPlantPhoto as jest.Mock;
async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks(); jest.useFakeTimers(); jest.setSystemTime(new Date("2026-10-30T10:00:00Z"));
  setAuthToken("account-a"); load.mockResolvedValue("data:image/jpeg;base64,PRIVATE-A");
  (getCachedPlantPhotoUri as jest.Mock).mockReturnValue(null);
  (onPlantPhotoCacheInvalidated as jest.Mock).mockImplementation(callback => { invalidation = callback; return unwatch; });
  Object.defineProperty(AppState, "currentState", { configurable: true, value: "active" });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, callback) => {
    foreground = callback; return { remove };
  });
});
afterEach(() => {
  setAuthToken(null); jest.restoreAllMocks(); jest.useRealTimers();
  Object.defineProperty(AppState, "currentState", { configurable: true, value: originalState });
});

it("reauthorizes while mounted and conceals cached images when foregrounding", async () => {
  const view = renderHook(() => usePlantPhoto(photo));
  await act(flush);
  expect(view.result.current.uri).toBe("data:image/jpeg;base64,PRIVATE-A");
  await act(async () => { jest.advanceTimersByTime(60_000); await flush(); });
  expect(load).toHaveBeenLastCalledWith(photo, "display", true);
  expect(load).toHaveBeenCalledTimes(2);
  const next = deferred<string>(); load.mockReturnValueOnce(next.promise);
  act(() => foreground("active"));
  expect(view.result.current.uri).toBeNull();
  await act(async () => { next.resolve("data:image/jpeg;base64,VERIFIED"); await flush(); });
  expect(view.result.current.uri).toBe("data:image/jpeg;base64,VERIFIED");
  view.unmount(); expect(remove).toHaveBeenCalledTimes(1); expect(unwatch).toHaveBeenCalledTimes(1);
});

it("hides expired sharing photos at the expiry deadline without fetching them again", async () => {
  const view = renderHook(() => usePlantPhoto(photo, { expiresAt: "2026-10-30T10:00:30Z" }));
  await act(flush);
  expect(view.result.current.uri).not.toBeNull();
  act(() => jest.advanceTimersByTime(30_000));
  expect(view.result.current.uri).toBeNull();
  expect(load).toHaveBeenCalledTimes(1);
  view.unmount();
});

it("clears a revoked photo after reauthorization fails", async () => {
  const view = renderHook(() => usePlantPhoto(photo));
  await act(flush);
  const denied = { status: 404 }; load.mockRejectedValueOnce(denied);
  await act(async () => { jest.advanceTimersByTime(60_000); await flush(); });
  expect(view.result.current.uri).toBeNull(); expect(view.result.current.error).toBe(denied);
  view.unmount();
});

it("clears the image on logout without fetching with missing credentials", async () => {
  const view = renderHook(() => usePlantPhoto(photo));
  await act(flush); expect(load).toHaveBeenCalledTimes(1);
  act(() => { invalidation("session"); setAuthToken(null); });
  expect(view.result.current.uri).toBeNull(); expect(load).toHaveBeenCalledTimes(1);
  act(() => foreground("active"));
  expect(load).toHaveBeenCalledTimes(1);
  view.unmount();
});

it("cannot apply an old account's late photo after a new account has logged in", async () => {
  const old = deferred<string>(); load.mockReturnValueOnce(old.promise);
  const view = renderHook(() => usePlantPhoto(photo));
  load.mockResolvedValueOnce("data:image/jpeg;base64,ACCOUNT-B");
  act(() => { setAuthToken(null); setAuthToken("account-b"); });
  await act(flush);
  await act(async () => { old.resolve("data:image/jpeg;base64,OLD-ACCOUNT"); await flush(); });
  expect(view.result.current.uri).toBe("data:image/jpeg;base64,ACCOUNT-B");
  expect(load).toHaveBeenCalledTimes(2);
  view.unmount();
});

it("never displays the previous plant's bytes while a replacement photo is loading", async () => {
  const view = renderHook<ReturnType<typeof usePlantPhoto>, { current: PlantPhoto }>(
    ({ current }) => usePlantPhoto(current), { initialProps: { current: photo } });
  await act(flush);
  const replacement = deferred<string>(); load.mockReturnValueOnce(replacement.promise);
  view.rerender({ current: { ...photo, id: "00000000-0000-4000-8000-000000000002" } });
  expect(view.result.current.uri).toBeNull();
  await act(async () => { replacement.resolve("data:image/jpeg;base64,REPLACEMENT"); await flush(); });
  expect(view.result.current.uri).toBe("data:image/jpeg;base64,REPLACEMENT");
  view.unmount();
});

it("shows freshly preloaded bytes on the first render without concealing them during the mount authorization check", async () => {
  const cached = "data:image/jpeg;base64,PRELOADED";
  (getCachedPlantPhotoUri as jest.Mock).mockReturnValue(cached);
  const validation = deferred<string>(); load.mockReturnValueOnce(validation.promise);
  const view = renderHook(() => usePlantPhoto(photo));
  expect(view.result.current.uri).toBe(cached);
  expect(load).toHaveBeenCalledWith(photo, "display", true);
  await act(async () => { validation.resolve(cached); await flush(); });
  expect(view.result.current.uri).toBe(cached);
  view.unmount();
});

it("does not expose preloaded bytes past the sharing deadline", async () => {
  (getCachedPlantPhotoUri as jest.Mock).mockReturnValue("data:image/jpeg;base64,PRELOADED");
  const view = renderHook(() => usePlantPhoto(photo, { expiresAt: "2026-10-30T09:59:59Z" }));
  expect(view.result.current.uri).toBeNull();
  await act(flush);
  expect(load).not.toHaveBeenCalled();
  expect(view.result.current.loading).toBe(false);
  view.unmount();
});
