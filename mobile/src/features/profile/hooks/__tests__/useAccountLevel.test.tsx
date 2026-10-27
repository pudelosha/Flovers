import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
import { useAccountLevel } from "../useAccountLevel";
import { fetchProfileProgression } from "../../../../api/services/profile.service";

let mockFocused = true;
let mockSession = 1;
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(() => mockFocused ? callback() : undefined, [callback, mockFocused]);
  },
}));
jest.mock("../../../../api/client", () => ({ getAuthSessionId: () => mockSession }));
jest.mock("../../../../api/services/profile.service", () => ({ fetchProfileProgression: jest.fn() }));
const mockFetch = fetchProfileProgression as jest.Mock;

const payload = (level: number, xp: number) => ({
  total_xp: 300, level, rank_key: "seedling", xp_into_level: xp,
  xp_for_next_level: 400, daily_xp: 100, daily_cap: 250,
});
function pending() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>(done => { resolve = done; });
  return { promise, resolve };
}

describe("live account level", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockFocused = true;
    mockSession = 1;
  });

  it("refreshes when returning to Profile after completing tasks", async () => {
    mockFetch.mockResolvedValueOnce(payload(2, 0)).mockResolvedValueOnce(payload(3, 30));
    const { result, rerender } = renderHook(({ userId }) => useAccountLevel(userId), { initialProps: { userId: "12" } });
    await waitFor(() => expect(result.current.progress?.level).toBe(2));
    mockFocused = false;
    rerender({ userId: "12" });
    mockFocused = true;
    rerender({ userId: "12" });
    await waitFor(() => expect(result.current.progress).toEqual({ level: 3, xpIntoLevel: 30, xpForNextLevel: 400 }));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not show an old account's delayed balance after switching users", async () => {
    const first = pending(), second = pending();
    mockFetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(({ userId }) => useAccountLevel(userId), { initialProps: { userId: "12" } });
    mockSession = 2;
    rerender({ userId: "34" });
    expect(result.current.progress).toBeNull();
    await act(async () => first.resolve(payload(80, 200)));
    expect(result.current.progress).toBeNull();
    await act(async () => second.resolve(payload(1, 0)));
    expect(result.current.progress?.level).toBe(1);
  });

  it("discards a response if logout invalidates its session before the UI rerenders", async () => {
    const first = pending();
    mockFetch.mockReturnValueOnce(first.promise);
    const { result, rerender } = renderHook(({ userId }) => useAccountLevel(userId), { initialProps: { userId: "12" as string | null } });
    mockSession = 2;
    await act(async () => first.resolve(payload(80, 200)));
    expect(result.current.progress).toBeNull();
    rerender({ userId: null });
    expect(result.current.loading).toBe(false);
  });

  it("shows unavailable after failure and retries on the next profile focus", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(payload(2, 10));
    const { result, rerender } = renderHook(() => useAccountLevel("12"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.progress).toBeNull();
    mockFocused = false; rerender({});
    mockFocused = true; rerender({});
    await waitFor(() => expect(result.current.progress?.xpIntoLevel).toBe(10));
  });

  it("refreshes on foreground resume and ignores older overlapping responses", async () => {
    const listeners: Array<(state: string) => void> = [];
    const spy = jest.spyOn(AppState, "addEventListener").mockImplementation((_, listener: any) => {
      listeners.push(listener);
      return { remove: jest.fn() };
    });
    const first = pending(), second = pending();
    mockFetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, unmount } = renderHook(() => useAccountLevel("12"));
    act(() => listeners[0]("active"));
    await act(async () => second.resolve(payload(5, 40)));
    await act(async () => first.resolve(payload(2, 10)));
    expect(result.current.progress?.level).toBe(5);
    unmount();
    spy.mockRestore();
  });
});
