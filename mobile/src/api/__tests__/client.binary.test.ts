import { configureTokenRefresh, onAuthSessionChanged, request, requestBlob, setAuthToken } from "../client";

function response(status: number, body: unknown = {}, blob?: Blob, length?: number) {
  return { ok: status < 400, status,
    headers: { get: (key: string) => key === "content-length" ? String(length ?? blob?.size ?? "")
      : blob && status < 400 ? "image/jpeg" : "application/json" },
    text: jest.fn(async () => JSON.stringify(body)), blob: jest.fn(async () => blob),
  } as unknown as Response;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => { globalThis.fetch = jest.fn(); setAuthToken("old-access"); });
afterEach(() => { configureTokenRefresh(null); setAuthToken(null); jest.useRealTimers(); });

it("refreshes a photo request and retries with the new bearer token without parsing JPEG as text", async () => {
  const blob = { size: 300, type: "image/jpeg" } as Blob;
  const jpeg = response(200, undefined, blob);
  (fetch as jest.Mock).mockResolvedValueOnce(response(401))
    .mockResolvedValueOnce(response(200, { access: "fresh-access" })).mockResolvedValueOnce(jpeg);
  configureTokenRefresh({ getRefreshToken: async () => "refresh", onAccessTokenRefreshed: jest.fn(), onRefreshFailed: jest.fn() });
  await expect(requestBlob("/private-photo/")).resolves.toBe(blob);
  expect((fetch as jest.Mock).mock.calls[2][1].headers.Authorization).toBe("Bearer fresh-access");
  expect(jpeg.text).not.toHaveBeenCalled();
});

it("rejects a JPEG body which completes after another account logs in", async () => {
  const body = deferred<Blob>();
  const jpeg = response(200);
  jpeg.blob = jest.fn(() => body.promise);
  (fetch as jest.Mock).mockResolvedValue(jpeg);
  const pending = requestBlob("/private-photo/");
  const check = expect(pending).rejects.toMatchObject({ body: { code: "session_changed" } });
  for (let i = 0; i < 6; i++) await Promise.resolve();
  setAuthToken("other-account");
  body.resolve({ size: 20, type: "image/jpeg" } as Blob);
  await check;
});

it("rejects advertised oversized images before reading their body and checks actual size too", async () => {
  const advertised = response(200, undefined, { size: 20 } as Blob, 5000);
  (fetch as jest.Mock).mockResolvedValueOnce(advertised)
    .mockResolvedValueOnce(response(200, undefined, { size: 5000 } as Blob, 0));
  await expect(requestBlob("/image/", { auth: true, maxResponseBytes: 1000 })).rejects.toMatchObject({ status: 413 });
  expect(advertised.blob).not.toHaveBeenCalled();
  await expect(requestBlob("/image/", { auth: true, maxResponseBytes: 1000 })).rejects.toMatchObject({ status: 413 });
});

it("bounds time spent reading an unresponsive image body", async () => {
  jest.useFakeTimers();
  const jpeg = response(200);
  jpeg.blob = jest.fn(() => new Promise(() => {}));
  (fetch as jest.Mock).mockResolvedValue(jpeg);
  const pending = requestBlob("/image/", { auth: true, timeoutMs: 50 });
  const check = expect(pending).rejects.toMatchObject({ status: 408 });
  for (let i = 0; i < 6; i++) await Promise.resolve();
  await jest.advanceTimersByTimeAsync(51);
  await check;
});

it("preserves JSON and native FormData handling and supports a bodyless authorized HEAD", async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(200, { result: 1 }))
    .mockResolvedValueOnce(response(200, { result: 2 }))
    .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => "image/jpeg" }, text: async () => "" });
  const form = new FormData(); form.append("upload_key", "test-key");
  await expect(request("/upload/", "PUT", form, { auth: true })).resolves.toEqual({ result: 1 });
  expect((fetch as jest.Mock).mock.calls[0][1].body).toBe(form);
  expect((fetch as jest.Mock).mock.calls[0][1].headers["Content-Type"]).toBeUndefined();
  await expect(request("/json/", "PATCH", { value: 2 }, { auth: true })).resolves.toEqual({ result: 2 });
  expect((fetch as jest.Mock).mock.calls[1][1].body).toBe('{"value":2}');
  await expect(request("/image/", "HEAD", undefined, { auth: true })).resolves.toBeUndefined();
  expect((fetch as jest.Mock).mock.calls[2][1].method).toBe("HEAD");
});

it("notifies private resources on login/logout but not on a normal token refresh", async () => {
  const changed = jest.fn();
  const unsubscribe = onAuthSessionChanged(changed);
  setAuthToken("login"); setAuthToken(null);
  expect(changed).toHaveBeenCalledTimes(2);
  unsubscribe(); setAuthToken("later-login");
  expect(changed).toHaveBeenCalledTimes(2);
});
