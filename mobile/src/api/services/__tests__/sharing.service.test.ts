import { ApiError, request } from "../../client";
import { deletePlantShare, fetchSharing, parseSharingSnapshot, sharingErrorCode, updatePlantSharing } from "../sharing.service";

jest.mock("../../client", () => ({ request: jest.fn(), ApiError: jest.requireActual("../../client").ApiError }));
const person = (id: string) => ({ id, name: `Person ${id}`, email: `${id}@example.test`, flovers_id: `FL-${id.padStart(32, "0")}` });
const envelope = () => ({ status: "success", data: {
  current_user: person("1"), contacts: [person("2")], versions: { "10": 3 },
  shares: [{ id: "100", plant: { id: "10", name: "Bird", latin: "Strelitzia alba", location: "Room", image_url: "https://example.test/bird.jpg" },
    contact_id: "2", direction: "outgoing", can_complete_tasks: true, ends_on: "2030-05-01", expires_at: "2030-05-01T22:00:00Z", is_expired: false }],
} });
beforeEach(() => { (request as jest.Mock).mockReset().mockResolvedValue(envelope()); });

it("maps the authenticated snapshot, dates, metadata and revisions", async () => {
  const result = await fetchSharing(); expect(request).toHaveBeenCalledWith("/sharing/", "GET", undefined, { auth: true });
  expect(result.currentUser.floversId).toBe(person("1").flovers_id); expect(result.versions).toEqual({ "10": 3 });
  expect(result.shares[0]).toMatchObject({ id: "100", contactId: "2", direction: "outgoing", canCompleteTasks: true, endsOn: "2030-05-01", isExpired: false,
    plant: { id: "10", name: "Bird", imageUrl: "https://example.test/bird.jpg", latin: "Strelitzia alba", location: "Room" } });
});
it("sends only selected plant recipient matrices with optimistic revisions", async () => {
  await updatePlantSharing([
    { plant: { id: "10", name: "Bird" }, recipients: [{ contactId: "2", canCompleteTasks: true, endsOn: "2030-05-01" }] },
    { plant: { id: "11", name: "Pilea" }, recipients: [] },
  ], { "10": 3 });
  expect(request).toHaveBeenLastCalledWith("/sharing/", "PUT", { updates: [
    { plant_id: 10, expected_revision: 3, recipients: [{ contact_id: "2", can_complete_tasks: true, ends_on: "2030-05-01" }] },
    { plant_id: 11, expected_revision: 0, recipients: [] },
  ] }, { auth: true });
});
it("serializes no end date as null and leaves through the authenticated grant endpoint", async () => {
  await updatePlantSharing([{ plant: { id: "10", name: "Bird" }, recipients: [{ contactId: "2", canCompleteTasks: false }] }], {});
  expect((request as jest.Mock).mock.calls[0][2].updates[0].recipients[0].ends_on).toBeNull();
  await deletePlantShare("100"); expect(request).toHaveBeenLastCalledWith("/sharing/100/", "DELETE", undefined, { auth: true });
});
it("uses an explicit draft revision instead of silently rebasing onto newer context state", async () => {
  await updatePlantSharing([{ plant: { id: "10", name: "Bird" }, recipients: [], expectedRevision: 3 }], { "10": 8 });
  expect((request as jest.Mock).mock.calls[0][2].updates[0].expected_revision).toBe(3);
});
it.each([null, {}, { status: "error" }])("rejects an invalid envelope %s", (value) => { expect(() => parseSharingSnapshot(value)).toThrow(); });
it("rejects malformed identities, dates and version counters", () => {
  const identity = envelope(); identity.data.contacts[0].flovers_id = "FL-DEMO-ANNA"; expect(() => parseSharingSnapshot(identity)).toThrow();
  const dates = envelope(); dates.data.shares[0].ends_on = "2030-02-30"; expect(() => parseSharingSnapshot(dates)).toThrow();
  const revisions = envelope(); revisions.data.versions["10"] = -1; expect(() => parseSharingSnapshot(revisions)).toThrow();
});
it("requires explicit permission flags instead of assuming a caregiver role", () => {
  const response: any = envelope(); delete response.data.shares[0].can_complete_tasks; expect(() => parseSharingSnapshot(response)).toThrow();
});
it("keeps expired outgoing grants distinguishable", () => {
  const response = envelope(); response.data.shares[0].is_expired = true; expect(parseSharingSnapshot(response).shares[0].isExpired).toBe(true);
});
it.each(["conflict", "notContact", "notFound", "invalid"])("preserves server error %s", async (code) => {
  (request as jest.Mock).mockRejectedValue(new ApiError(409, { code })); await expect(deletePlantShare("100")).rejects.toMatchObject({ reason: code });
});
it("maps throttling and network failures without exposing transport payloads", () => {
  expect(sharingErrorCode(new ApiError(429, {}))).toBe("throttled"); expect(sharingErrorCode(new Error("offline"))).toBe("unavailable");
});
it("recognizes standard DRF errors when no custom sharing code is present", () => {
  expect(sharingErrorCode(new ApiError(404, { detail: "Not found." }))).toBe("notFound");
  expect(sharingErrorCode(new ApiError(403, { detail: "Forbidden." }))).toBe("notOwner");
  expect(sharingErrorCode(new ApiError(409, {}))).toBe("conflict");
});
it("rejects non-server plant IDs instead of sending demo plant names", () => {
  expect(() => updatePlantSharing([{ plant: { id: "preview-bird", name: "Bird" }, recipients: [] }], {})).toThrow();
});
