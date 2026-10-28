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
  | "contactUpdated" | "contactDeleted" | "sharingSaved" | "accessRemoved"
  | "plantLeft" | "idCopied" | "copyFailed" | "previewReset"
  | "contactsInvitationAdded" | "contactsInvitationAccepted" | "contactsInvitationDeclined"
  | "contactsInvitationCancelled" | "contactsContactUpdated" | "contactsContactDeleted";

export type SharingToastVariant = "default" | "success" | "error";

export type SharingToast = { id: number; kind: SharingToastKind; variant: SharingToastVariant };
