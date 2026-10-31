import { request } from "../../client";
import { clearPlantPhotoCache } from "../plant-photos.service";
import { createJournalPhoto, deleteJournalPhoto, fetchJournalPhotoAvailability, fetchJournalPhotos,
  parseJournalPhoto, updateJournalPhoto } from "../journal-photos.service";

jest.mock("../../client", () => ({
  ...jest.requireActual("../../client"), request: jest.fn(),
}));
jest.mock("../plant-photos.service", () => ({
  ...jest.requireActual("../plant-photos.service"), clearPlantPhotoCache: jest.fn(),
}));

const photoId = "00000000-0000-4000-8000-000000000001";
const entryId = "00000000-0000-4000-8000-000000000002";
const uploadKey = "00000000-0000-4000-8000-000000000003";
const framing = { focal_x: 0.5, focal_y: 0.4, zoom: 1.3 };
const row = {
  id: entryId, plant_id: 9, plant_name: "Bird", location_name: "Kitchen", revision: 3,
  created_at: "2026-10-31T12:00:00Z", taken_on: "2026-10-28", notes: "New leaf",
  access: { is_owner: true, is_shared: false, can_edit: true, can_complete_tasks: true,
    owner: { id: "1", name: "Owner" }, expires_at: null },
  photo: { id: photoId, url: `/plant-instances/9/photo/${photoId}/`,
    thumbnail_url: `/plant-instances/9/photo/${photoId}/?variant=thumbnail`,
    width: 1000, height: 800, byte_size: 9000, framing },
};
const values = { notes: "New leaf", taken_on: null, framing };
const mockedRequest = request as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedRequest.mockResolvedValue(row);
});

it("lists only authenticated private entries and keeps upload date distinct from the optional photo date", async () => {
  mockedRequest.mockResolvedValue({ results: [row], availability: [{ plant_id: 9, next_photo_at: "2026-11-07T12:00:00Z" }] });
  const entries = await fetchJournalPhotos();
  expect(mockedRequest).toHaveBeenCalledWith("/journal/photos/", "GET", undefined, { auth: true });
  expect(entries[0]).toMatchObject({ id: entryId, type: "photo", plantId: "9", createdAt: row.created_at,
    completedAt: row.created_at, recordedDate: "2026-10-28", note: "New leaf", photo: row.photo });
  await expect(fetchJournalPhotoAvailability()).resolves.toEqual([{ plant_id: "9", next_photo_at: "2026-11-07T12:00:00Z" }]);
});

it("rejects malformed photos and unsafe source URLs before the tile can render them", () => {
  expect(() => parseJournalPhoto({ ...row, photo: { ...row.photo, url: "https://external.test/private.jpg" } }))
    .toThrow("Invalid journal photo response");
  expect(() => parseJournalPhoto({ ...row, revision: NaN })).toThrow();
  expect(() => parseJournalPhoto({ ...row, id: "../other" })).toThrow();
  expect(() => parseJournalPhoto({ ...row, access: null })).toThrow();
});

it("uploads with a stable retry key, optional date and sixty-second upload timeout", async () => {
  const append = jest.spyOn(FormData.prototype, "append");
  try {
    await createJournalPhoto("9", "file:///journal.jpg", uploadKey, values);
    await createJournalPhoto("9", "file:///journal.jpg", uploadKey, values);
    expect(mockedRequest).toHaveBeenCalledWith("/journal/photos/", "POST", expect.any(FormData), { auth: true, timeoutMs: 60_000 });
    expect(append.mock.calls.filter(([name]) => name === "upload_key").map(([, value]) => value)).toEqual([uploadKey, uploadKey]);
    expect(append).toHaveBeenCalledWith("taken_on", "");
    expect(append).toHaveBeenCalledWith("plant_id", "9");
    expect(append).toHaveBeenCalledWith("framing", JSON.stringify(framing));
    expect(clearPlantPhotoCache).toHaveBeenCalledTimes(2);
  } finally { append.mockRestore(); }
});

it("rejects remote images before any upload request", async () => {
  await expect(createJournalPhoto("9", "https://external.test/photo.jpg", uploadKey, values)).rejects.toMatchObject({ status: 400 });
  expect(mockedRequest).not.toHaveBeenCalled();
});

it("uses optimistic revision checks for metadata, replacement and deletion", async () => {
  const item = parseJournalPhoto(row);
  await updateJournalPhoto(item, values);
  expect(mockedRequest).toHaveBeenLastCalledWith(`/journal/photos/${entryId}/`, "PATCH",
    { ...values, expected_revision: 3 }, { auth: true });
  const append = jest.spyOn(FormData.prototype, "append");
  try {
    await updateJournalPhoto(item, values, { uri: "file:///replacement.jpg", uploadKey });
    expect(mockedRequest).toHaveBeenLastCalledWith(`/journal/photos/${entryId}/`, "PUT", expect.any(FormData), { auth: true, timeoutMs: 60_000 });
    expect(append).toHaveBeenCalledWith("expected_revision", "3");
  } finally { append.mockRestore(); }
  mockedRequest.mockResolvedValue(undefined);
  await deleteJournalPhoto(item);
  expect(mockedRequest).toHaveBeenLastCalledWith(`/journal/photos/${entryId}/`, "DELETE", { expected_revision: 3 }, { auth: true });
});

it("preserves cached bytes when the backend rejects a stale revision", async () => {
  mockedRequest.mockRejectedValue(new Error("Stale revision"));
  await expect(updateJournalPhoto(parseJournalPhoto(row), values)).rejects.toThrow("Stale revision");
  expect(clearPlantPhotoCache).not.toHaveBeenCalled();
});
