import { ApiError, request } from "../client";
import { clearPlantPhotoCache, parsePlantPhoto } from "./plant-photos.service";
import type { ApiPlantAccess } from "../../shared/utils/plantAccess";
import type { PhotoFraming } from "../../shared/utils/photoFraming";
import type { JournalPhotoItem } from "../../features/task-history/types/task-history.types";

export type JournalPlantOption = { id: string; name: string; latin?: string; location?: string; access?: ApiPlantAccess };
export type JournalPhotoAvailability = { plant_id: string; next_photo_at: string | null };
export type JournalPhotoValues = { notes: string; taken_on: string | null; framing: PhotoFraming };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid = () => new ApiError(502, { code: "invalid_journal_photo" }, "Invalid journal photo response");

export function newJournalUploadKey() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
    const value = Math.floor(Math.random() * 16);
    return (character === "x" ? value : (value & 3) | 8).toString(16);
  });
}

export function parseJournalPhoto(value: any): JournalPhotoItem {
  const photo = parsePlantPhoto(value?.photo);
  if (!photo || !UUID.test(value?.id ?? "") || !/^[1-9]\d*$/.test(String(value?.plant_id))
      || !Number.isSafeInteger(value?.revision) || value.revision < 0
      || !Number.isFinite(Date.parse(value?.created_at)) || !value?.access || typeof value.access !== "object"
      || (value.taken_on != null && !/^\d{4}-\d{2}-\d{2}$/.test(value.taken_on))) throw invalid();
  return { entryKind: "photo", type: "photo", id: value.id, plantId: String(value.plant_id),
    plant: typeof value.plant_name === "string" ? value.plant_name : "",
    location: typeof value.location_name === "string" ? value.location_name : "",
    completedAt: value.created_at, createdAt: value.created_at, recordedDate: value.taken_on ?? "",
    note: typeof value.notes === "string" ? value.notes : "", revision: value.revision, photo, access: value.access };
}

async function list() {
  const body = await request<any>("/journal/photos/", "GET", undefined, { auth: true });
  if (!Array.isArray(body?.results) || !Array.isArray(body?.availability)) throw invalid();
  return body;
}
export async function fetchJournalPhotos(): Promise<JournalPhotoItem[]> {
  return (await list()).results.map(parseJournalPhoto);
}
export async function fetchJournalPhoto(id: string): Promise<JournalPhotoItem> {
  if (!UUID.test(id)) throw invalid();
  return parseJournalPhoto(await request(`/journal/photos/${id}/`, "GET", undefined, { auth: true }));
}
export async function fetchJournalPhotoAvailability(): Promise<JournalPhotoAvailability[]> {
  return (await list()).availability.map((value: any) => {
    if (!/^[1-9]\d*$/.test(String(value?.plant_id)) || (value.next_photo_at !== null
        && !Number.isFinite(Date.parse(value.next_photo_at)))) throw invalid();
    return { plant_id: String(value.plant_id), next_photo_at: value.next_photo_at };
  });
}
function path(item: JournalPhotoItem) {
  if (!UUID.test(item.id) || !Number.isSafeInteger(item.revision) || item.revision < 0) throw invalid();
  return `/journal/photos/${item.id}/`;
}
function formPhoto(uri: string, uploadKey: string, values: JournalPhotoValues) {
  if (!/^(?:file|content|ph|assets-library):\/\//i.test(uri) || !UUID.test(uploadKey)) {
    throw new ApiError(400, { code: "invalid_photo" }, "A local photo and upload key are required");
  }
  const form = new FormData();
  const png = /\.png(?:[?#]|$)/i.test(uri);
  form.append("photo", { uri, name: png ? "journal.png" : "journal.jpg", type: png ? "image/png" : "image/jpeg" } as any);
  form.append("upload_key", uploadKey);
  form.append("notes", values.notes);
  // Empty multipart date is normalized to null by DRF's nullable date field.
  form.append("taken_on", values.taken_on ?? "");
  form.append("framing", JSON.stringify(values.framing));
  return form;
}
export async function createJournalPhoto(plantId: string, uri: string, uploadKey: string, values: JournalPhotoValues) {
  if (!/^[1-9]\d*$/.test(plantId)) throw new ApiError(400, { code: "invalid_plant" }, "Invalid plant ID");
  const form = formPhoto(uri, uploadKey, values);
  form.append("plant_id", plantId);
  const result = parseJournalPhoto(await request("/journal/photos/", "POST", form, { auth: true, timeoutMs: 60_000 }));
  clearPlantPhotoCache();
  return result;
}
export async function updateJournalPhoto(item: JournalPhotoItem, values: JournalPhotoValues,
  replacement?: { uri: string; uploadKey: string }) {
  const body = replacement ? formPhoto(replacement.uri, replacement.uploadKey, values)
    : { ...values, expected_revision: item.revision };
  if (replacement) (body as FormData).append("expected_revision", String(item.revision));
  const result = parseJournalPhoto(await request(path(item), replacement ? "PUT" : "PATCH", body,
    { auth: true, ...(replacement ? { timeoutMs: 60_000 } : {}) }));
  clearPlantPhotoCache();
  return result;
}
export async function deleteJournalPhoto(item: JournalPhotoItem): Promise<void> {
  await request(path(item), "DELETE", { expected_revision: item.revision }, { auth: true });
  clearPlantPhotoCache();
}
