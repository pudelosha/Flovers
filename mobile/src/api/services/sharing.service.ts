import { ApiError, request } from "../client";
import { parsePlantPhoto } from "./plant-photos.service";
import type {
  PlantShare, PlantSharingUpdate, SharingContact, SharingErrorCode, SharingSnapshot,
} from "../../features/sharing/types/sharing.types";

export class SharingServiceError extends Error {
  constructor(public reason: SharingErrorCode) {
    super(reason);
    this.name = "SharingServiceError";
  }
}

const errorCodes: SharingErrorCode[] = ["invalid", "notFound", "notContact", "notOwner", "conflict", "expired", "throttled", "unavailable"];
export function sharingErrorCode(error: unknown): SharingErrorCode {
  if (error instanceof SharingServiceError) return error.reason;
  if (typeof ApiError === "function" && error instanceof ApiError) {
    if (error.status === 429) return "throttled";
    if (errorCodes.includes(error.body?.code)) return error.body.code;
    if (error.status === 404) return "notFound";
    if (error.status === 403) return "notOwner";
    if (error.status === 409) return "conflict";
  }
  return "unavailable";
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SharingServiceError("unavailable");
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) throw new SharingServiceError("unavailable");
  return value;
}
function person(value: unknown): SharingContact {
  const item = record(value);
  if (typeof item.name !== "string" || typeof item.email !== "string" ||
      typeof item.flovers_id !== "string" || !/^FL-[A-F0-9]{32}$/i.test(item.flovers_id)) throw new SharingServiceError("unavailable");
  return { id: id(item.id), name: item.name, email: item.email, floversId: item.flovers_id };
}
function optionalString(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw new SharingServiceError("unavailable");
  return value;
}
function date(value: unknown): string | undefined {
  const result = optionalString(value);
  if (result && (!/^\d{4}-\d{2}-\d{2}$/.test(result) || new Date(result + "T12:00:00Z").toISOString().slice(0, 10) !== result)) {
    throw new SharingServiceError("unavailable");
  }
  return result;
}

export function parseSharingSnapshot(response: unknown): SharingSnapshot {
  const envelope = record(response);
  if (envelope.status !== "success") throw new SharingServiceError("unavailable");
  const data = record(envelope.data);
  if (!Array.isArray(data.contacts) || !Array.isArray(data.shares)) throw new SharingServiceError("unavailable");
  const contacts = data.contacts.map(person);
  const shares: PlantShare[] = data.shares.map((raw) => {
    const item = record(raw), plant = record(item.plant);
    if ((item.direction !== "incoming" && item.direction !== "outgoing") || typeof item.can_complete_tasks !== "boolean" ||
        typeof item.is_expired !== "boolean" || typeof plant.name !== "string") throw new SharingServiceError("unavailable");
    return {
      id: id(item.id), contactId: id(item.contact_id), direction: item.direction,
      canCompleteTasks: item.can_complete_tasks, endsOn: date(item.ends_on),
      isExpired: item.is_expired, expiresAt: optionalString(item.expires_at),
      plant: { id: id(plant.id), name: plant.name, latin: optionalString(plant.latin),
        location: optionalString(plant.location), imageUrl: optionalString(plant.image_url),
        photo: parsePlantPhoto(plant.photo) },
    };
  });
  const rawVersions = record(data.versions), versions: Record<string, number> = {};
  Object.entries(rawVersions).forEach(([plantId, revision]) => {
    id(plantId);
    if (!Number.isSafeInteger(revision) || Number(revision) < 0) throw new SharingServiceError("unavailable");
    versions[plantId] = Number(revision);
  });
  return { currentUser: person(data.current_user), contacts, shares, versions };
}

async function sharingRequest(path: string, method: "GET" | "PUT" | "DELETE", body?: unknown) {
  try {
    return parseSharingSnapshot(await request<unknown>(path, method, body, { auth: true }));
  } catch (error) {
    throw new SharingServiceError(sharingErrorCode(error));
  }
}

export const fetchSharing = () => sharingRequest("/sharing/", "GET");
export function updatePlantSharing(updates: PlantSharingUpdate[], versions: Record<string, number>) {
  const body = { updates: updates.map(({ plant, recipients, expectedRevision }) => {
    if (!/^[1-9]\d*$/.test(plant.id) || !Number.isSafeInteger(Number(plant.id))) throw new SharingServiceError("invalid");
    return {
      plant_id: Number(plant.id), expected_revision: expectedRevision ?? versions[plant.id] ?? 0,
      recipients: recipients.map((recipient) => ({ contact_id: recipient.contactId,
        can_complete_tasks: recipient.canCompleteTasks, ends_on: recipient.endsOn ?? null })),
    };
  }) };
  return sharingRequest("/sharing/", "PUT", body);
}
export const deletePlantShare = (shareId: string) => sharingRequest(`/sharing/${encodeURIComponent(shareId)}/`, "DELETE");
