import { request, requestWithAccessToken, setAuthToken, configureTokenRefresh, onUnauthorized } from "../client";

function response(status: number, body: any = {}) {
  return { ok: status < 400, status, headers: { get: () => "application/json" }, text: async () => JSON.stringify(body) } as unknown as Response;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

describe("authenticated request session boundaries", () => {
  let fetchMock: jest.Mock;
  let refreshed: jest.Mock;
  let failed: jest.Mock;
  let unauthorized: jest.Mock;
  let unsubscribe: () => void;
  beforeEach(() => {
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock;
    refreshed = jest.fn();
    failed = jest.fn();
    unauthorized = jest.fn();
    unsubscribe = onUnauthorized(unauthorized);
    configureTokenRefresh({ getRefreshToken: async () => "refresh-a", onAccessTokenRefreshed: refreshed, onRefreshFailed: failed });
    setAuthToken("access-a");
  });
  afterEach(() => { unsubscribe(); configureTokenRefresh(null); setAuthToken(null); });

  it("refreshes and retries only within the same account session", async () => {
    fetchMock.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200, { access: "renewed-a" })).mockResolvedValueOnce(response(200, { result: "a" }));
    await expect(request("/plants/", "GET", undefined, { auth: true })).resolves.toEqual({ result: "a" });
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer renewed-a");
    expect(refreshed).toHaveBeenCalledWith("renewed-a", expect.any(Number));
    expect(failed).not.toHaveBeenCalled();
  });

  it.each([200, 401])("ignores a delayed refresh response (%s) after logout and a new login", async status => {
    const refresh = deferred<Response>();
    fetchMock.mockResolvedValueOnce(response(401)).mockReturnValueOnce(refresh.promise);
    const pending = request("/plants/", "GET", undefined, { auth: true });
    const rejection = expect(pending).rejects.toMatchObject({ body: { code: "session_changed" } });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    setAuthToken(null);
    setAuthToken("access-b");
    configureTokenRefresh({ getRefreshToken: async () => "refresh-b", onAccessTokenRefreshed: refreshed, onRefreshFailed: failed });
    refresh.resolve(response(status, { access: "late-a" }));
    await rejection;
    expect(refreshed).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(unauthorized).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(response(200));
    await request("/plants/", "GET", undefined, { auth: true });
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer access-b");
  });

  it.each([200, 401])("rejects an old account's delayed response (%s) without changing the new account", async status => {
    const old = deferred<Response>();
    fetchMock.mockReturnValueOnce(old.promise);
    const pending = request("/plants/", "GET", undefined, { auth: true });
    const rejection = expect(pending).rejects.toMatchObject({ body: { code: "session_changed" } });
    setAuthToken("access-b");
    old.resolve(response(status, { privateData: "account-a" }));
    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refreshed).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it("does not share an old account's refresh promise with a new account", async () => {
    const oldRefresh = deferred<Response>();
    const newRefresh = deferred<Response>();
    fetchMock.mockResolvedValueOnce(response(401)).mockReturnValueOnce(oldRefresh.promise);
    const old = request("/a/", "GET", undefined, { auth: true });
    const oldRejection = expect(old).rejects.toMatchObject({ body: { code: "session_changed" } });
    await flush();
    setAuthToken("access-b");
    configureTokenRefresh({ getRefreshToken: async () => "refresh-b", onAccessTokenRefreshed: refreshed, onRefreshFailed: failed });
    fetchMock.mockResolvedValueOnce(response(401)).mockReturnValueOnce(newRefresh.promise);
    const current = request("/b/", "GET", undefined, { auth: true });
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    oldRefresh.resolve(response(200, { access: "late-a" }));
    await oldRejection;
    fetchMock.mockResolvedValueOnce(response(200, { account: "b" }));
    newRefresh.resolve(response(200, { access: "renewed-b" }));
    await expect(current).resolves.toEqual({ account: "b" });
    expect(fetchMock.mock.calls[4][1].headers.Authorization).toBe("Bearer renewed-b");
  });

  it("allows best-effort deregistration to fail without starting refresh or emitting logout", async () => {
    fetchMock.mockResolvedValueOnce(response(401));
    await expect(request("/profile/push-devices/", "DELETE", { token: "fcm" }, { auth: true, refreshAuth: false, notifyUnauthorized: false })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(failed).not.toHaveBeenCalled();
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it("deregisters with the old access snapshot after logout and a new login without refreshing", async () => {
    setAuthToken(null);
    setAuthToken("access-b");
    fetchMock.mockResolvedValueOnce(response(401));
    await expect(requestWithAccessToken("/profile/push-devices/", "DELETE", { token: "old-fcm" }, "access-a", 5000)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer access-a");
    expect(refreshed).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it("cancels an unresponsive refresh immediately when logging out", async () => {
    fetchMock.mockResolvedValueOnce(response(401)).mockImplementationOnce(() => new Promise(() => {}));
    const pending = request("/plants/", "GET", undefined, { auth: true });
    const rejection = expect(pending).rejects.toMatchObject({ body: { code: "session_changed" } });
    await flush();
    const signal = fetchMock.mock.calls[1][1].signal;
    setAuthToken(null);
    await rejection;
    expect(signal.aborted).toBe(true);
    expect(refreshed).not.toHaveBeenCalled();
  });
});
