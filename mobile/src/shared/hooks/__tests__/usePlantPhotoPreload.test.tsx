import { act, renderHook } from "@testing-library/react-native";
import { setAuthToken } from "../../../api/client";
import { loadPlantPhoto, onPlantPhotoCacheInvalidated } from "../../../api/services/plant-photos.service";
import { usePlantPhotoPreload } from "../usePlantPhotoPreload";
import type { PhotoPreloadTarget } from "../usePlantPhotoPreload";

jest.mock("../../../api/services/plant-photos.service", () => ({ loadPlantPhoto: jest.fn(), onPlantPhotoCacheInvalidated: jest.fn() }));
const load = loadPlantPhoto as jest.Mock;
const target = (id = 1): PhotoPreloadTarget => ({ photo: { id: String(id), url: `/photo/${id}/`, thumbnail_url: `/photo/${id}/?thumbnail`,
  width: 300, height: 200, byte_size: 2000 }, variant: "thumbnail" });
let invalidation: () => void;
function deferred() {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>(done => { resolve = done; });
  return { promise, resolve };
}
async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }
beforeEach(() => {
  jest.clearAllMocks(); setAuthToken("account-a"); load.mockResolvedValue("data:image/jpeg;base64,READY");
  (onPlantPhotoCacheInvalidated as jest.Mock).mockImplementation(callback => { invalidation = callback; return () => {}; });
});
afterEach(() => { setAuthToken(null); });

it("holds the screen from its first render until all selected image requests settle", async () => {
  const one = deferred(); const two = deferred();
  load.mockReturnValueOnce(one.promise).mockReturnValueOnce(two.promise);
  const view = renderHook(() => usePlantPhotoPreload([target(), target(2)]));
  expect(view.result.current.loading).toBe(true);
  await act(async () => { one.resolve("one"); await flush(); });
  expect(view.result.current.loading).toBe(true);
  await act(async () => { two.resolve("two"); await flush(); });
  expect(view.result.current.ready).toBe(true);
  expect(load).toHaveBeenCalledWith(target().photo, "thumbnail", true);
  view.unmount();
});

it("settles failures instead of leaving the screen on an endless spinner", async () => {
  load.mockRejectedValueOnce(new Error("Offline"));
  const view = renderHook(() => usePlantPhotoPreload([target()]));
  await act(flush);
  expect(view.result.current.loading).toBe(false);
  expect(view.result.current.ready).toBe(true);
  view.unmount();
});

it("limits memory and parallel downloads, and deduplicates the same visible photo", async () => {
  const pending = Array.from({ length: 9 }, deferred);
  load.mockImplementation((photo: { id: string }) => pending[Number(photo.id) - 1].promise);
  const view = renderHook(() => usePlantPhotoPreload([target(), target(), ...Array.from({ length: 8 }, (_, i) => target(i + 2))]));
  expect(load).toHaveBeenCalledTimes(3);
  for (let i = 0; i < 8; i++) {
    await act(async () => { pending[i].resolve("ready"); await flush(); });
  }
  expect(load).toHaveBeenCalledTimes(8);
  expect(view.result.current.ready).toBe(true);
  view.unmount();
});

it("does not restart on unchanged metadata objects but reloads when the photo changes", async () => {
  const view = renderHook<ReturnType<typeof usePlantPhotoPreload>, { id: number }>(
    ({ id }) => usePlantPhotoPreload([target(id)]), { initialProps: { id: 1 } });
  await act(flush);
  view.rerender({ id: 1 });
  expect(load).toHaveBeenCalledTimes(1);
  const next = deferred(); load.mockReturnValueOnce(next.promise);
  view.rerender({ id: 2 });
  expect(view.result.current.loading).toBe(true);
  await act(async () => { next.resolve("two"); await flush(); });
  expect(view.result.current.ready).toBe(true);
  view.unmount();
});

it("cannot mark another account's pending photos ready after an old request completes", async () => {
  const old = deferred(); const next = deferred();
  load.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
  const view = renderHook(() => usePlantPhotoPreload([target()]));
  act(() => { setAuthToken("account-b"); });
  await act(async () => { old.resolve("old-private"); await flush(); });
  expect(view.result.current.loading).toBe(true);
  await act(async () => { next.resolve("new-private"); await flush(); });
  expect(view.result.current.ready).toBe(true);
  view.unmount();
});

it("rechecks after photo invalidation and ignores expired or absent image metadata", async () => {
  const view = renderHook(() => usePlantPhotoPreload([target(), { photo: null },
    { ...target(2), expiresAt: "2000-01-01T00:00:00Z" }]));
  await act(flush);
  expect(load).toHaveBeenCalledTimes(1);
  const next = deferred(); load.mockReturnValueOnce(next.promise);
  act(() => invalidation());
  expect(view.result.current.loading).toBe(true);
  await act(async () => { next.resolve("verified"); await flush(); });
  expect(view.result.current.ready).toBe(true);
  view.unmount();
});

it("waits for enablement and starts a new load after a disabled screen refresh", async () => {
  const view = renderHook<ReturnType<typeof usePlantPhotoPreload>, { enabled: boolean }>(
    ({ enabled }) => usePlantPhotoPreload([target()], enabled), { initialProps: { enabled: false } });
  expect(load).not.toHaveBeenCalled();
  view.rerender({ enabled: true }); await act(flush);
  expect(view.result.current.ready).toBe(true);
  view.rerender({ enabled: false });
  const next = deferred(); load.mockReturnValueOnce(next.promise);
  view.rerender({ enabled: true });
  expect(view.result.current.loading).toBe(true);
  await act(async () => { next.resolve("fresh"); await flush(); });
  expect(view.result.current.ready).toBe(true);
  view.unmount();
});
