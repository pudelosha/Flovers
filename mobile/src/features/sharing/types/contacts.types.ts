import type { ContactInvitation, SharingContact } from "./sharing.types";

export type ContactsSnapshot = {
  currentUser: SharingContact;
  contacts: SharingContact[];
  invitations: ContactInvitation[];
  counts: { contacts: number; incoming: number; outgoing: number };
};

export type ContactsErrorCode =
  | "invalid" | "notFound" | "self" | "alreadyContact" | "alreadyPending"
  | "alreadyRegistered" | "throttled" | "unavailable";

export type ContactsMutationResult =
  | { ok: true }
  | { ok: false; reason: ContactsErrorCode | "busy" | "staleSession" };

export const CONTACT_ERROR_MESSAGES: Record<ContactsErrorCode, string> = {
  alreadyRegistered: "This email is already registered. Use Add contact instead.",
  invalid: "Enter a valid email address or Flovers ID.",
  notFound: "No active Flovers account matches this email address or ID.",
  self: "You cannot invite yourself.",
  alreadyContact: "This person is already in your contacts.",
  alreadyPending: "An invitation for this person is already pending.",
  throttled: "Too many requests. Wait a little and try again.",
  unavailable: "Could not connect. Please try again.",
};
