import { act, renderHook } from "@testing-library/react-native";
import { Image } from "react-native";
import { setAuthToken } from "../../../../api/client";
import { useWizardImagePreload } from "../useWizardImagePreload";

let requests: Array<{ uri: string; success: (width: number, height: number) => void; failure?: (error: unknown) => void }>;
async function flush() { for (let i = 0; i < 16; i++) await Promise.resolve(); }
beforeEach(() => {
  jest.useFakeTimers(); requests = []; setAuthToken("wizard-test");
  jest.spyOn(Image, "getSize").mockImplementation((uri, success, failure) => { requests.push({ uri, success, failure }); });
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); setAuthToken(null); });

it("loads and measures all known images before revealing a step, without a visible Image", async () => {
  const view = renderHook(() => useWizardImagePreload(["https://example.test/one.jpg", "https://example.test/one.jpg", "file:///two.jpg"]));
  expect(view.result.current.loading).toBe(true);
  expect(requests.map(request => request.uri)).toEqual(["https://example.test/one.jpg", "file:///two.jpg"]);
  await act(async () => { requests[0].success(640, 400); await flush(); });
  expect(view.result.current.loading).toBe(true);
  await act(async () => { requests[1].success(960, 1280); await flush(); });
  expect(view.result.current.loading).toBe(false);
  view.unmount();
});

it("settles failed and timed-out images rather than leaving an endless spinner", async () => {
  const view = renderHook(() => useWizardImagePreload(["https://example.test/bad.jpg", "https://example.test/stalled.jpg"]));
  await act(async () => { requests[0].failure?.(new Error("Offline")); await flush(); });
  expect(view.result.current.loading).toBe(true);
  await act(async () => { jest.advanceTimersByTime(8000); await flush(); });
  expect(view.result.current.loading).toBe(false);
  view.unmount();
});

it("does not reveal a new selection when an old image finishes", async () => {
  const view = renderHook<ReturnType<typeof useWizardImagePreload>, { uri: string }>(
    ({ uri }) => useWizardImagePreload([uri]), { initialProps: { uri: "file:///old.jpg" } });
  view.rerender({ uri: "file:///new.jpg" });
  await act(async () => { requests[0].success(960, 1280); await flush(); });
  expect(view.result.current.loading).toBe(true);
  await act(async () => { requests[1].success(960, 1280); await flush(); });
  expect(view.result.current.loading).toBe(false);
  view.unmount();
});

it("reuses already prepared images when returning to a wizard step", async () => {
  const first = renderHook(() => useWizardImagePreload(["file:///cached.jpg"]));
  await act(async () => { requests[0].success(960, 1280); await flush(); });
  first.unmount();
  const next = renderHook(() => useWizardImagePreload(["file:///cached.jpg"]));
  expect(next.result.current.loading).toBe(false);
  expect(requests).toHaveLength(1);
  next.unmount();
});

it("starts image loading only after the step's data is ready", async () => {
  const view = renderHook<ReturnType<typeof useWizardImagePreload>, { enabled: boolean }>(
    ({ enabled }) => useWizardImagePreload(["https://example.test/photo.jpg"], enabled), { initialProps: { enabled: false } });
  expect(requests).toHaveLength(0);
  view.rerender({ enabled: true });
  expect(view.result.current.loading).toBe(true);
  await act(async () => { requests[0].success(320, 200); await flush(); });
  expect(view.result.current.loading).toBe(false);
  view.unmount();
});

it("bounds parallel native downloads and ignores stale results after a login change", async () => {
  const view = renderHook(() => useWizardImagePreload(Array.from({ length: 5 }, (_, index) => `file:///image-${index}.jpg`)));
  expect(requests).toHaveLength(4);
  await act(async () => { requests[0].success(100, 100); await flush(); });
  expect(requests).toHaveLength(5);
  act(() => setAuthToken("another-account"));
  expect(view.result.current.loading).toBe(true);
  await act(async () => { for (const request of requests.slice(0, 5)) request.success(100, 100); await flush(); });
  expect(view.result.current.loading).toBe(true);
  view.unmount();
});
