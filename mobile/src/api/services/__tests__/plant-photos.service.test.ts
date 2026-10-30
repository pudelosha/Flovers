import { configureTokenRefresh, setAuthToken } from "../../client";
import { clearPlantPhotoCache, deletePlantPhoto, loadPlantPhoto, parsePlantPhoto, uploadPlantPhoto, updatePlantPhotoFraming } from "../plant-photos.service";
import type { PlantPhoto } from "../plant-photos.service";

const photo = (n = 1): PlantPhoto => {
  const id = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  return { id, url: `/plant-instances/12/photo/${id}/`, thumbnail_url: `/plant-instances/12/photo/${id}/?variant=thumbnail`,
    width: 800, height: 1000, byte_size: 5000 };
};
const key = "80000000-0000-4000-8000-000000000001";
const oldReader = globalThis.FileReader;
let automaticallyRead: boolean;
let readers: TestReader[];
class TestReader {
  result: string | null = null;
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  onabort: null | (() => void) = null;
  payload = "";
  readAsDataURL(blob: Blob) {
    this.payload = (blob as Blob & { payload: string }).payload;
    readers.push(this);
    if (automaticallyRead) void Promise.resolve().then(() => this.finish());
  }
  finish() { this.result = `data:image/jpeg;base64,${this.payload}`; this.onload?.(); }
  abort() { this.onabort?.(); }
}
function response(status = 200, body: unknown = photo(), payload = "PRIVATE-A", type = "image/jpeg") {
  const blob = { type, size: 100, payload } as unknown as Blob;
  return { ok: status < 400, status, headers: { get: (name: string) => name === "content-length" ? "100" : "application/json" },
    text: async () => status < 400 && body === undefined ? "" : JSON.stringify(body), blob: async () => blob,
  } as unknown as Response;
}
async function flush() { for (let i = 0; i < 16; i++) await Promise.resolve(); }

beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date("2026-10-30T10:00:00Z"));
  automaticallyRead = true; readers = [];
  globalThis.FileReader = TestReader as unknown as typeof FileReader;
  globalThis.fetch = jest.fn(async () => response());
  configureTokenRefresh(null); setAuthToken("account-a"); clearPlantPhotoCache();
});
afterEach(() => { setAuthToken(null); globalThis.FileReader = oldReader; jest.restoreAllMocks(); jest.useRealTimers(); });

it("uploads multipart with a stable retry key and expected version, without encoding credentials in the URL", async () => {
  const append = jest.spyOn(FormData.prototype, "append");
  await expect(uploadPlantPhoto(12, "file:///photo.jpg", { uploadKey: key, expectedPhotoId: null })).resolves.toEqual(photo());
  await uploadPlantPhoto(12, "file:///photo.jpg", { uploadKey: key, expectedPhotoId: null });
  const calls = (fetch as jest.Mock).mock.calls;
  expect(calls[0][0]).toBe("http://localhost:8000/plant-instances/12/photo/");
  expect(calls[0][1].headers.Authorization).toBe("Bearer account-a");
  expect(calls[0][1].headers["Content-Type"]).toBeUndefined();
  expect(calls.every(([, request]) => request.body instanceof FormData)).toBe(true);
  expect(append.mock.calls.filter(([name]) => name === "upload_key").map(([, value]) => value)).toEqual([key, key]);
  expect(append).toHaveBeenCalledWith("expected_photo_id", "none");
  expect(append).toHaveBeenCalledWith("photo", expect.objectContaining({ uri: "file:///photo.jpg", type: "image/jpeg" }));
});

it("sends a versioned delete and refuses arbitrary upload URLs or invalid version IDs", async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 204, headers: { get: () => "" }, text: async () => "" });
  await deletePlantPhoto(12, { expectedPhotoId: photo().id });
  expect((fetch as jest.Mock).mock.calls[0][1].body).toBe(JSON.stringify({ expected_photo_id: photo().id }));
  await expect(uploadPlantPhoto(12, "https://other.test/image.jpg")).rejects.toMatchObject({ status: 400 });
  await expect(uploadPlantPhoto(12, "file:///photo.jpg", { expectedPhotoId: "invalid" })).rejects.toMatchObject({ status: 400 });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it.each([
  "https://attacker.test/plant-instances/12/photo/00000000-0000-4000-8000-000000000001/",
  "//attacker.test/private.jpg",
  "http://user:pass@localhost:8000/plant-instances/12/photo/00000000-0000-4000-8000-000000000001/",
  "/plant-instances/12/photo/00000000-0000-4000-8000-000000000001/?token=credential",
  "/public-media/image.jpg",
])("rejects unsafe photo URL %s before any request", async url => {
  const bad = { ...photo(), url };
  expect(parsePlantPhoto(bad)).toBeNull();
  await expect(loadPlantPhoto(bad)).rejects.toMatchObject({ body: { code: "invalid_photo_url" } });
  expect(fetch).not.toHaveBeenCalled();
});

it("deduplicates image downloads and reauthorizes a cached image with HEAD", async () => {
  const one = loadPlantPhoto(photo()); const two = loadPlantPhoto(photo());
  expect(one).toBe(two);
  await expect(one).resolves.toBe("data:image/jpeg;base64,PRIVATE-A");
  await loadPlantPhoto(photo(), "display", true);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect((fetch as jest.Mock).mock.calls[1][1].method).toBe("HEAD");
});

it("does not extend the authorization TTL just because bytes were reused", async () => {
  await loadPlantPhoto(photo());
  jest.setSystemTime(new Date("2026-10-30T10:00:40Z"));
  await loadPlantPhoto(photo());
  expect(fetch).toHaveBeenCalledTimes(1);
  jest.setSystemTime(new Date("2026-10-30T10:01:01Z"));
  await loadPlantPhoto(photo());
  expect((fetch as jest.Mock).mock.calls[1][1].method).toBe("HEAD");
});

it.each([403, 404])("discards cached bytes when access is denied (%s)", async status => {
  await loadPlantPhoto(photo());
  (fetch as jest.Mock).mockResolvedValueOnce(response(status, { detail: "Not found" }));
  await expect(loadPlantPhoto(photo(), "display", true)).rejects.toMatchObject({ status });
  await loadPlantPhoto(photo());
  expect((fetch as jest.Mock).mock.calls[2][1].method).toBe("GET");
});

it("does not expose a FileReader result that finishes after the account changes", async () => {
  automaticallyRead = false;
  const pending = loadPlantPhoto(photo());
  const check = expect(pending).rejects.toMatchObject({ body: { code: "session_changed" } });
  await flush(); expect(readers).toHaveLength(1);
  setAuthToken("account-b"); readers[0].finish(); await check;
  automaticallyRead = true;
  (fetch as jest.Mock).mockResolvedValueOnce(response(200, photo(), "PRIVATE-B"));
  await expect(loadPlantPhoto(photo())).resolves.toBe("data:image/jpeg;base64,PRIVATE-B");
  expect((fetch as jest.Mock).mock.calls[1][1].headers.Authorization).toBe("Bearer account-b");
});

it("refuses to load private photos while logged out", async () => {
  setAuthToken(null);
  await expect(loadPlantPhoto(photo())).rejects.toMatchObject({ body: { code: "session_changed" } });
  expect(fetch).not.toHaveBeenCalled();
});

it("bounds retained image entries and retrieves an evicted image again", async () => {
  for (let n = 1; n <= 33; n++) await loadPlantPhoto(photo(n), "thumbnail");
  await loadPlantPhoto(photo(1), "thumbnail");
  expect(fetch).toHaveBeenCalledTimes(34);
  expect((fetch as jest.Mock).mock.calls[33][1].method).toBe("GET");
});

it("bounds decoded image memory even before the entry-count limit is reached", async () => {
  // A 300 KB JPEG becomes roughly 800 KB of UTF-16 base64 text in memory.
  (fetch as jest.Mock).mockImplementation(async () => response(200, photo(), "A".repeat(400_000)));
  for (let n = 1; n <= 12; n++) await loadPlantPhoto(photo(n));
  await loadPlantPhoto(photo(1));
  expect(fetch).toHaveBeenCalledTimes(13);
  expect((fetch as jest.Mock).mock.calls[12][1].method).toBe("GET");
});

it("rejects an unexpected response content type instead of rendering it", async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(200, photo(), "SCRIPT", "text/html"));
  await expect(loadPlantPhoto(photo())).rejects.toMatchObject({ body: { code: "invalid_photo_response" } });
});

it("retains valid saved framing and rejects malformed or non-finite coordinates", () => {
  const framed = { ...photo(), framing: { focal_x: 0.3, focal_y: 0.7, zoom: 2 }, framing_revision: 0 };
  expect(parsePlantPhoto(framed)).toEqual(framed);
  expect(parsePlantPhoto({ ...framed, framing: { ...framed.framing, focal_x: NaN } })).toBeNull();
  expect(parsePlantPhoto({ ...framed, framing: { ...framed.framing, zoom: 0.5 } })).toBeNull();
  expect(parsePlantPhoto({ ...framed, framing_revision: -1 })).toBeNull();
  expect(parsePlantPhoto(photo())).toEqual(photo());
});

it("checks server support before uploading a framed image and sends its coordinates with the file", async () => {
  const framing = { focal_x: 0.35, focal_y: 0.6, zoom: 2 };
  const framed = { ...photo(), framing, framing_revision: 0 };
  (fetch as jest.Mock).mockResolvedValueOnce(response(200, { framing_supported: true })).mockResolvedValueOnce(response(200, framed));
  const append = jest.spyOn(FormData.prototype, "append");
  await expect(uploadPlantPhoto(12, "file:///photo.jpg", { uploadKey: key, framing, expectedPhotoId: photo().id,
    expectedFramingRevision: 0 })).resolves.toEqual(framed);
  expect((fetch as jest.Mock).mock.calls.map(([, request]) => request.method)).toEqual(["GET", "PUT"]);
  expect(append).toHaveBeenCalledWith("framing", JSON.stringify(framing));
  expect(append).toHaveBeenCalledWith("expected_framing_revision", "0");
});

it.each([405, 200])("does not replace a photo on a backend that cannot save framing (status %s)", async status => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(status, {}));
  await expect(uploadPlantPhoto(12, "file:///photo.jpg", { framing: { focal_x: 0.5, focal_y: 0.5, zoom: 1 } }))
    .rejects.toMatchObject({ body: { code: "photo_framing_unavailable" } });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect((fetch as jest.Mock).mock.calls[0][1].method).toBe("GET");
});

it("repositions the existing photo with a versioned PATCH instead of uploading another file", async () => {
  const framing = { focal_x: 0.4, focal_y: 0.6, zoom: 2 };
  const framed = { ...photo(), framing, framing_revision: 1 };
  (fetch as jest.Mock).mockResolvedValueOnce(response(200, framed));
  await expect(updatePlantPhotoFraming(12, framing, { expectedPhotoId: photo().id, expectedFramingRevision: 0 })).resolves.toEqual(framed);
  expect(fetch).toHaveBeenCalledTimes(1);
  const call = (fetch as jest.Mock).mock.calls[0];
  expect(call[1].method).toBe("PATCH");
  expect(JSON.parse(call[1].body)).toEqual({ framing, expected_photo_id: photo().id, expected_framing_revision: 0 });
  expect(call[1].headers.Authorization).toBe("Bearer account-a");
});

it("keeps a stale framing edit as a conflict instead of overwriting with another upload", async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(response(409, { code: "photo_conflict" }));
  await expect(updatePlantPhotoFraming(12, { focal_x: 0.5, focal_y: 0.5, zoom: 2 },
    { expectedPhotoId: photo().id, expectedFramingRevision: 0 })).rejects.toMatchObject({ status: 409 });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect((fetch as jest.Mock).mock.calls[0][1].method).toBe("PATCH");
});

it("includes the framing version when deleting and refuses invalid framing before networking", async () => {
  await deletePlantPhoto(12, { expectedPhotoId: photo().id, expectedFramingRevision: 2 });
  expect(JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)).toEqual({ expected_photo_id: photo().id, expected_framing_revision: 2 });
  await expect(uploadPlantPhoto(12, "file:///photo.jpg", { framing: { focal_x: 0.5, focal_y: 0.5, zoom: Infinity } }))
    .rejects.toMatchObject({ status: 400 });
  expect(fetch).toHaveBeenCalledTimes(1);
});
