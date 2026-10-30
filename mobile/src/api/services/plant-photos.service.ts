import { API_BASE_NORM } from "../../config";
import { ApiError, getAuthSessionId, hasAuthToken, onAuthSessionChanged, request, requestBlob } from "../client";
import type { PhotoFraming } from "../../shared/utils/photoFraming";

export type PlantPhoto = {
  id: string;
  url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  byte_size: number;
  created_at?: string;
  framing?: PhotoFraming;
  framing_revision?: number;
};
export type PlantPhotoVariant = "display" | "thumbnail";
export type PhotoMutationOptions = { expectedPhotoId?: string | null; expectedFramingRevision?: number };
export type PhotoUploadOptions = PhotoMutationOptions & { uploadKey?: string; framing?: PhotoFraming };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IMAGE_BYTES = 350_000;
const CACHE_BYTES = 8 * 1024 * 1024;
const CACHE_ENTRIES = 32;
const VERIFY_INTERVAL = 60_000;
type CacheEntry = { uri: string; size: number; verifiedAt: number };
const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<string>>();
type InvalidationReason = "change" | "session";
const invalidationListeners = new Set<(reason: InvalidationReason) => void>();
let cacheGeneration = 0;
let sessionSubscription: (() => void) | null = null;

export function onPlantPhotoCacheInvalidated(listener: (reason: InvalidationReason) => void) {
  invalidationListeners.add(listener);
  return () => { invalidationListeners.delete(listener); };
}

/** No private image bytes or bearer credentials are stored in persistent caches. */
export function clearPlantPhotoCache(reason: InvalidationReason = "change") {
  cacheGeneration += 1;
  cache.clear();
  pending.clear();
  invalidationListeners.forEach(listener => { try { listener(reason); } catch {} });
}

function ensureSessionSubscription() {
  // Metadata-only consumers do not need to register private cache resources.
  if (!sessionSubscription) sessionSubscription = onAuthSessionChanged(() => clearPlantPhotoCache("session"));
}

function photoPath(photo: PlantPhoto, variant: PlantPhotoVariant): string {
  const value = variant === "thumbnail" ? photo.thumbnail_url : photo.url;
  if (typeof photo.id !== "string" || !UUID.test(photo.id)
      || typeof value !== "string" || !value || /[\\\s]/.test(value) || value.startsWith("//")) {
    throw new ApiError(400, { code: "invalid_photo_url" }, "Invalid private photo URL");
  }
  const base = new URL(API_BASE_NORM + "/");
  const url = new URL(value, API_BASE_NORM + "/");
  // Only a specific photo endpoint on this API may receive its Authorization header.
  const endpoint = /^\/(?:api\/)?plant-instances\/[1-9]\d*\/photo\/([0-9a-f-]{36})\/$/i.exec(url.pathname);
  if (url.origin !== base.origin || url.username || url.password || url.hash || !endpoint
      || endpoint[1].toLowerCase() !== photo.id.toLowerCase()
      || !["", "?variant=display", "?variant=thumbnail"].includes(url.search)) {
    throw new ApiError(400, { code: "invalid_photo_url" }, "Invalid private photo URL");
  }
  const prefix = base.pathname.replace(/\/$/, "");
  const pathname = prefix && url.pathname.startsWith(prefix + "/") ? url.pathname.slice(prefix.length) : url.pathname;
  return pathname + `?variant=${variant}`;
}

export function parsePlantPhoto(value: unknown): PlantPhoto | null {
  if (!value || typeof value !== "object") return null;
  const photo = value as PlantPhoto;
  if (typeof photo.id !== "string" || !UUID.test(photo.id)
      || !Number.isInteger(photo.width) || photo.width < 1 || photo.width > 1280
      || !Number.isInteger(photo.height) || photo.height < 1 || photo.height > 1280
      || !Number.isInteger(photo.byte_size) || photo.byte_size < 1 || photo.byte_size > 1_000_000) return null;
  try { photoPath(photo, "display"); photoPath(photo, "thumbnail"); }
  catch { return null; }
  if (photo.framing !== undefined && !validFraming(photo.framing)) return null;
  if (photo.framing_revision !== undefined && !validRevision(photo.framing_revision)) return null;
  return { id: photo.id, url: photo.url, thumbnail_url: photo.thumbnail_url,
    width: photo.width, height: photo.height, byte_size: photo.byte_size,
    ...(typeof photo.created_at === "string" ? { created_at: photo.created_at } : {}),
    ...(photo.framing !== undefined ? { framing: { ...photo.framing } } : {}),
    ...(photo.framing_revision !== undefined ? { framing_revision: photo.framing_revision } : {}) };
}

function validFraming(value: unknown): value is PhotoFraming {
  if (!value || typeof value !== "object") return false;
  const frame = value as PhotoFraming;
  return typeof frame.focal_x === "number" && Number.isFinite(frame.focal_x) && frame.focal_x >= 0 && frame.focal_x <= 1
    && typeof frame.focal_y === "number" && Number.isFinite(frame.focal_y) && frame.focal_y >= 0 && frame.focal_y <= 1
    && typeof frame.zoom === "number" && Number.isFinite(frame.zoom) && frame.zoom >= 1 && frame.zoom <= 4;
}

function validRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function requireFraming(photo: PlantPhoto): PlantPhoto {
  if (!photo.framing || photo.framing_revision === undefined) {
    throw new ApiError(503, { code: "photo_framing_unavailable" }, "The server does not support photo framing yet");
  }
  return photo;
}

function plantPath(plantId: string | number) {
  const id = String(plantId);
  if (!/^[1-9]\d*$/.test(id)) throw new ApiError(400, { code: "invalid_plant" }, "Invalid plant ID");
  return `/plant-instances/${id}/photo/`;
}

function expectedId(value: string | null) {
  if (value === null || value === "none") return "none";
  if (!UUID.test(value)) throw new ApiError(400, { code: "invalid_photo" }, "Invalid photo ID");
  return value;
}

function newUploadKey() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
    const value = Math.floor(Math.random() * 16);
    return (character === "x" ? value : (value & 3) | 8).toString(16);
  });
}

export async function uploadPlantPhoto(
  plantId: string | number, uri: string, options: PhotoUploadOptions = {},
): Promise<PlantPhoto> {
  const path = plantPath(plantId);
  if (!/^(?:file|content|ph|assets-library):\/\//i.test(uri)) {
    throw new ApiError(400, { code: "invalid_photo" }, "A local photo is required");
  }
  const uploadKey = options.uploadKey ?? newUploadKey();
  if (!UUID.test(uploadKey)) throw new ApiError(400, { code: "invalid_photo" }, "Invalid photo upload key");
  if (options.framing !== undefined && !validFraming(options.framing)) {
    throw new ApiError(400, { code: "invalid_photo" }, "Invalid photo framing");
  }
  if (options.expectedFramingRevision !== undefined && !validRevision(options.expectedFramingRevision)) {
    throw new ApiError(400, { code: "invalid_photo" }, "Invalid photo revision");
  }
  if (options.framing !== undefined) {
    // An older backend ignores unknown multipart fields. Check support before
    // replacing any photo, rather than reporting success for an unsaved crop.
    let capability: { framing_supported?: boolean };
    try {
      capability = await request<{ framing_supported?: boolean }>(plantPath(plantId), "GET", undefined, { auth: true });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 405) throw error;
      throw new ApiError(503, { code: "photo_framing_unavailable" }, "The server does not support photo framing yet");
    }
    if (capability?.framing_supported !== true) {
      throw new ApiError(503, { code: "photo_framing_unavailable" }, "The server does not support photo framing yet");
    }
  }
  const form = new FormData();
  const isPng = /\.png(?:[?#]|$)/i.test(uri);
  form.append("photo", { uri, name: isPng ? "plant.png" : "plant.jpg", type: isPng ? "image/png" : "image/jpeg" } as any);
  form.append("upload_key", uploadKey);
  if (options.expectedPhotoId !== undefined) form.append("expected_photo_id", expectedId(options.expectedPhotoId));
  if (options.framing !== undefined) form.append("framing", JSON.stringify(options.framing));
  if (options.expectedFramingRevision !== undefined) form.append("expected_framing_revision", String(options.expectedFramingRevision));
  const result = await request<unknown>(path, "PUT", form, { auth: true, timeoutMs: 60_000 });
  const photo = parsePlantPhoto(result);
  if (!photo) throw new ApiError(502, { code: "invalid_photo_response" }, "Invalid photo response");
  clearPlantPhotoCache();
  return options.framing === undefined ? photo : requireFraming(photo);
}

export async function updatePlantPhotoFraming(plantId: string | number, framing: PhotoFraming,
  options: { expectedPhotoId: string; expectedFramingRevision: number }): Promise<PlantPhoto> {
  if (!validFraming(framing) || !validRevision(options.expectedFramingRevision)
      || !UUID.test(options.expectedPhotoId)) {
    throw new ApiError(400, { code: "invalid_photo" }, "Invalid photo framing or revision");
  }
  const result = await request<unknown>(plantPath(plantId), "PATCH", {
    framing, expected_photo_id: options.expectedPhotoId, expected_framing_revision: options.expectedFramingRevision,
  }, { auth: true });
  const photo = parsePlantPhoto(result);
  if (!photo || photo.id.toLowerCase() !== options.expectedPhotoId.toLowerCase()) {
    throw new ApiError(502, { code: "invalid_photo_response" }, "Invalid photo response");
  }
  requireFraming(photo);
  clearPlantPhotoCache();
  return photo;
}

export async function deletePlantPhoto(plantId: string | number, options: PhotoMutationOptions = {}): Promise<void> {
  if (options.expectedFramingRevision !== undefined && !validRevision(options.expectedFramingRevision)) {
    throw new ApiError(400, { code: "invalid_photo" }, "Invalid photo revision");
  }
  await request<void>(plantPath(plantId), "DELETE",
    options.expectedPhotoId === undefined && options.expectedFramingRevision === undefined ? undefined : {
      ...(options.expectedPhotoId === undefined ? {} : { expected_photo_id: expectedId(options.expectedPhotoId) }),
      ...(options.expectedFramingRevision === undefined ? {} : { expected_framing_revision: options.expectedFramingRevision }),
    },
    { auth: true });
  clearPlantPhotoCache();
}

function dataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const timer = setTimeout(() => { reader.abort(); reject(new ApiError(408, {}, "Photo decoding timed out")); }, 15_000);
    reader.onerror = () => { clearTimeout(timer); reject(new ApiError(502, {}, "Could not read the photo")); };
    reader.onabort = () => { clearTimeout(timer); reject(new ApiError(408, {}, "Photo decoding was cancelled")); };
    reader.onload = () => {
      clearTimeout(timer);
      const value = reader.result;
      if (typeof value !== "string" || !value.startsWith("data:image/jpeg;base64,")) {
        reject(new ApiError(502, { code: "invalid_photo_response" }, "Invalid photo response"));
      } else resolve(value);
    };
    reader.readAsDataURL(blob);
  });
}

function pruneCache() {
  let size = [...cache.values()].reduce((total, entry) => total + entry.size, 0);
  while (cache.size > CACHE_ENTRIES || size > CACHE_BYTES) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest === undefined) break;
    size -= cache.get(oldest)!.size;
    cache.delete(oldest);
  }
}

/** Cached bytes are reauthorized on reuse; periodic HEAD checks avoid redownloading JPEGs. */
export function loadPlantPhoto(photo: PlantPhoto, variant: PlantPhotoVariant = "display", revalidate = false): Promise<string> {
  let path: string;
  try { path = photoPath(photo, variant); } catch (error) { return Promise.reject(error); }
  ensureSessionSubscription();
  const session = getAuthSessionId();
  const generation = cacheGeneration;
  const key = `${session}:${photo.id}:${variant}:${path}`;
  const entry = cache.get(key);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const assertCurrent = () => {
    if (!hasAuthToken() || session !== getAuthSessionId() || generation !== cacheGeneration) {
      throw new ApiError(401, { code: "session_changed" }, "Photo session changed");
    }
  };
  const operation = (async () => {
    assertCurrent();
    let uri = entry?.uri;
    let verifiedAt = entry?.verifiedAt ?? Date.now();
    if (entry) {
      // Always recheck when a view explicitly requests authorization (mount/foreground/TTL).
      if (revalidate || Date.now() - entry.verifiedAt >= VERIFY_INTERVAL) {
        await request<void>(path, "HEAD", undefined, { auth: true });
        assertCurrent();
        verifiedAt = Date.now();
      }
    } else {
      const blob = await requestBlob(path, { auth: true, maxResponseBytes: MAX_IMAGE_BYTES });
      assertCurrent();
      if (!blob.size || blob.type.toLowerCase() !== "image/jpeg") {
        throw new ApiError(502, { code: "invalid_photo_response" }, "Invalid photo response");
      }
      uri = await dataUri(blob);
      assertCurrent();
      verifiedAt = Date.now();
    }
    const next = { uri: uri!, size: uri!.length * 2, verifiedAt };
    cache.delete(key);
    cache.set(key, next);
    pruneCache();
    return next.uri;
  })().catch(error => {
    cache.delete(key);
    throw error;
  }).finally(() => {
    if (pending.get(key) === operation) pending.delete(key);
  });
  pending.set(key, operation);
  return operation;
}
