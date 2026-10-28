import { ApiError, request } from "../client";
import type { ContactsErrorCode, ContactsSnapshot } from "../../features/sharing/types/contacts.types";
import type { ContactInvitation, SharingContact } from "../../features/sharing/types/sharing.types";

export class ContactsServiceError extends Error {
  constructor(public reason: ContactsErrorCode) {
    super(reason);
    this.name = "ContactsServiceError";
  }
}

const errorCodes: ContactsErrorCode[] = ["invalid", "notFound", "self", "alreadyContact", "alreadyPending", "throttled", "unavailable"];

export function contactsErrorCode(error: unknown): ContactsErrorCode {
  if (error instanceof ContactsServiceError) return error.reason;
  if (error instanceof ApiError) {
    if (error.status === 429) return "throttled";
    if (errorCodes.includes(error.body?.code)) return error.body.code;
  }
  return "unavailable";
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ContactsServiceError("unavailable");
  return value as Record<string, unknown>;
}

function person(value: unknown): SharingContact {
  const item = record(value);
  if (typeof item.id !== "string" || !item.id || typeof item.name !== "string" ||
      typeof item.email !== "string" || typeof item.flovers_id !== "string" ||
      !/^FL-[A-F0-9]{32}$/i.test(item.flovers_id)) throw new ContactsServiceError("unavailable");
  return { id: item.id, name: item.name, email: item.email, floversId: item.flovers_id };
}

export function parseContactsSnapshot(response: unknown): ContactsSnapshot {
  const envelope = record(response);
  if (envelope.status !== "success") throw new ContactsServiceError("unavailable");
  const data = record(envelope.data);
  if (!Array.isArray(data.contacts) || !Array.isArray(data.invitations)) throw new ContactsServiceError("unavailable");
  const contacts = data.contacts.map(person);
  const invitations: ContactInvitation[] = data.invitations.map((raw) => {
    const item = record(raw);
    if (typeof item.id !== "string" || !item.id || (item.direction !== "incoming" && item.direction !== "outgoing")) {
      throw new ContactsServiceError("unavailable");
    }
    return { id: item.id, contact: person(item.contact), direction: item.direction };
  });
  const counts = record(data.counts);
  const incoming = invitations.filter((invitation) => invitation.direction === "incoming").length;
  const outgoing = invitations.length - incoming;
  if (counts.contacts !== contacts.length || counts.incoming !== incoming || counts.outgoing !== outgoing) {
    throw new ContactsServiceError("unavailable");
  }
  return {
    currentUser: person(data.current_user), contacts, invitations,
    counts: { contacts: contacts.length, incoming, outgoing },
  };
}

async function contactsRequest(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown) {
  try {
    return parseContactsSnapshot(await request<unknown>(path, method, body, { auth: true }));
  } catch (error) {
    throw new ContactsServiceError(contactsErrorCode(error));
  }
}

export function isContactIdentifier(value: string) {
  const identifier = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier) || /^FL[A-F0-9]{32}$/i.test(identifier.replace(/-/g, ""));
}

export const fetchContacts = () => contactsRequest("/contacts/", "GET");
export const sendContactInvitation = (identifier: string) => contactsRequest("/contacts/invitations/", "POST", { identifier: identifier.trim() });
export const acceptContactInvitation = (id: string) => contactsRequest(`/contacts/invitations/${encodeURIComponent(id)}/accept/`, "POST", {});
export const dismissContactInvitation = (id: string) => contactsRequest(`/contacts/invitations/${encodeURIComponent(id)}/`, "DELETE");
export const renameContact = (id: string, name: string) => contactsRequest(`/contacts/${encodeURIComponent(id)}/`, "PATCH", { name: name.trim() });
export const deleteContact = (id: string) => contactsRequest(`/contacts/${encodeURIComponent(id)}/`, "DELETE");
