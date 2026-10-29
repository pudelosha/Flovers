export type SharingContact = {
  id: string;
  name: string;
  email: string;
  floversId: string;
};

export type ContactInvitation = {
  id: string;
  contact: SharingContact;
  direction: "incoming" | "outgoing";
};

export type ShareablePlant = {
  id: string;
  name: string;
  location?: string;
  latin?: string;
  imageUrl?: string;
  previewImage?: "pothos" | "monstera" | "peaceLily";
};

export type PlantShare = {
  id: string;
  plant: ShareablePlant;
  contactId: string;
  direction: "incoming" | "outgoing";
  canCompleteTasks: boolean;
  endsOn?: string;
  expiresAt?: string;
  isExpired?: boolean;
};

export type SharingRecipient = {
  contactId: string;
  canCompleteTasks: boolean;
  endsOn?: string;
};

export type SharePlantDraft = {
  plant?: ShareablePlant;
  contactId?: string;
};

export type PlantSharingUpdate = {
  plant: ShareablePlant;
  recipients: SharingRecipient[];
  expectedRevision?: number;
};

export type SharingSnapshot = {
  currentUser: SharingContact;
  contacts: SharingContact[];
  shares: PlantShare[];
  versions: Record<string, number>;
};

export type SharingErrorCode =
  | "invalid" | "notFound" | "notContact" | "notOwner" | "conflict"
  | "expired" | "throttled" | "unavailable";

export type SharingMutationResult =
  | { ok: true }
  | { ok: false; reason: SharingErrorCode | "busy" | "staleSession" };

export const SHARING_ERROR_MESSAGES: Record<SharingErrorCode, string> = {
  invalid: "Check the selected plants, contacts and end dates.",
  notFound: "This plant or sharing permission is no longer available.",
  notContact: "You can only share plants with accepted contacts.",
  notOwner: "Only the plant owner can manage sharing.",
  conflict: "Sharing changed elsewhere. Reload and try again.",
  expired: "Choose an end date that has not passed.",
  throttled: "Too many requests. Wait a little and try again.",
  unavailable: "Could not load or update sharing. Please try again.",
};

export type InvitationResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "self" | "alreadyContact" | "alreadyPending" };

export type SharingPreviewState = {
  contacts: SharingContact[];
  invitations: ContactInvitation[];
  shares: PlantShare[];
};

export type SharingToastKind =
  | "invitationAdded" | "invitationAccepted" | "invitationDeclined" | "invitationCancelled"
  | "contactUpdated" | "contactDeleted" | "sharingSaved" | "sharingDeleted" | "accessRemoved"
  | "plantLeft" | "idCopied" | "copyFailed" | "previewReset"
  | "contactsInvitationAdded" | "contactsInvitationAccepted" | "contactsInvitationDeclined"
  | "contactsInvitationCancelled" | "contactsContactUpdated" | "contactsContactDeleted";

export type SharingToastVariant = "default" | "success" | "error";

export type SharingToast = { id: number; kind: SharingToastKind; variant: SharingToastVariant };
