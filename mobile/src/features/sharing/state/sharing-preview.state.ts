import type {
  InvitationResult, PlantShare, ShareablePlant, SharingContact,
  SharingPreviewState, SharingRecipient, PlantSharingUpdate,
} from "../types/sharing.types";

export function createSharingPreviewState(): SharingPreviewState {
  const anna = { id: "preview-anna", name: "Anna Kowalska", email: "anna@example.test", floversId: "FL-DEMO-ANNA" };
  const luca = { id: "preview-luca", name: "Luca Rossi", email: "luca@example.test", floversId: "FL-DEMO-LUCA" };
  const pothos: ShareablePlant = { id: "preview-pothos", name: "Golden pothos", latin: "Epipremnum aureum", location: "Living room", previewImage: "pothos" };
  return {
    contacts: [anna, luca],
    invitations: [
      { id: "preview-incoming", direction: "incoming", contact: { id: "preview-marta", name: "Marta Nowak", email: "marta@example.test", floversId: "FL-DEMO-MARTA" } },
      { id: "preview-outgoing", direction: "outgoing", contact: { id: "preview-alex", name: "Alex Taylor", email: "alex@example.test", floversId: "FL-DEMO-ALEX" } },
    ],
    shares: [
      { id: "preview-pothos-anna", plant: pothos, contactId: anna.id, direction: "outgoing", canCompleteTasks: true },
      { id: "preview-pothos-luca", plant: pothos, contactId: luca.id, direction: "outgoing", canCompleteTasks: false },
      { id: "preview-monstera-anna", plant: { id: "preview-monstera", name: "Monstera", latin: "Monstera deliciosa", location: "Bedroom", previewImage: "monstera" }, contactId: anna.id, direction: "incoming", canCompleteTasks: false },
      { id: "preview-peace-lily-luca", plant: { id: "preview-peace-lily", name: "Peace lily", latin: "Spathiphyllum wallisii", location: "Kitchen", previewImage: "peaceLily" }, contactId: luca.id, direction: "incoming", canCompleteTasks: true },
    ],
  };
}

function matchesIdentifier(contact: SharingContact, identifier: string) {
  const value = identifier.trim().toLowerCase();
  return contact.email.toLowerCase() === value || contact.floversId.toLowerCase() === value;
}

export function validatePreviewInvitation(
  state: SharingPreviewState, currentUser: SharingContact, identifier: string,
): InvitationResult {
  const value = identifier.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/^FL-[A-Z0-9][A-Z0-9-]{3,31}$/i.test(value)) {
    return { ok: false, reason: "invalid" };
  }
  if (matchesIdentifier(currentUser, value)) return { ok: false, reason: "self" };
  if (state.contacts.some((contact) => matchesIdentifier(contact, value))) return { ok: false, reason: "alreadyContact" };
  if (state.invitations.some((invitation) => matchesIdentifier(invitation.contact, value))) return { ok: false, reason: "alreadyPending" };
  return { ok: true };
}

export type SharingPreviewAction =
  | { type: "invite"; identifier: string; currentUser: SharingContact; id: string }
  | { type: "accept"; id: string }
  | { type: "dismiss"; id: string }
  | { type: "removeContact"; id: string }
  | { type: "renameContact"; id: string; name: string }
  | { type: "saveSharing"; plant: ShareablePlant; recipients: SharingRecipient[] }
  | { type: "savePlantsSharing"; updates: PlantSharingUpdate[] }
  | { type: "removeShare"; id: string }
  | { type: "reset" };

export function sharingPreviewReducer(state: SharingPreviewState, action: SharingPreviewAction): SharingPreviewState {
  switch (action.type) {
    case "invite": {
      if (!validatePreviewInvitation(state, action.currentUser, action.identifier).ok) return state;
      const identifier = action.identifier.trim();
      const email = identifier.includes("@") ? identifier.toLowerCase() : "";
      const contact: SharingContact = {
        id: action.id,
        name: email ? email.split("@")[0] : identifier.toUpperCase(),
        email,
        floversId: email ? "" : identifier.toUpperCase(),
      };
      return { ...state, invitations: [...state.invitations, { id: action.id, contact, direction: "outgoing" }] };
    }
    case "accept": {
      const invitation = state.invitations.find((item) => item.id === action.id && item.direction === "incoming");
      if (!invitation) return state;
      return {
        ...state,
        contacts: state.contacts.some((contact) => contact.id === invitation.contact.id)
          ? state.contacts : [...state.contacts, invitation.contact],
        invitations: state.invitations.filter((item) => item.id !== action.id),
      };
    }
    case "dismiss":
      return { ...state, invitations: state.invitations.filter((item) => item.id !== action.id) };
    case "renameContact": {
      const name = action.name.trim();
      if (!name || name.length > 80 || !state.contacts.some((contact) => contact.id === action.id)) return state;
      return { ...state, contacts: state.contacts.map((contact) => contact.id === action.id ? { ...contact, name } : contact) };
    }
    case "removeContact":
      return {
        contacts: state.contacts.filter((contact) => contact.id !== action.id),
        invitations: state.invitations.filter((item) => item.contact.id !== action.id),
        shares: state.shares.filter((share) => share.contactId !== action.id),
      };
    case "savePlantsSharing": {
      const updates = new Map(action.updates.map((update) => [update.plant.id, update] as const));
      return Array.from(updates.values()).reduce((next, update) =>
        sharingPreviewReducer(next, { type: "saveSharing", ...update }), state);
    }
    case "saveSharing": {
      const recipients = new Map(action.recipients
        .filter((recipient) => state.contacts.some((contact) => contact.id === recipient.contactId))
        .map((recipient) => [recipient.contactId, recipient]));
      const shares: PlantShare[] = Array.from(recipients.values()).map((recipient) => ({
        id: `preview-share:${action.plant.id}:${recipient.contactId}`,
        plant: action.plant,
        contactId: recipient.contactId,
        direction: "outgoing",
        canCompleteTasks: recipient.canCompleteTasks === true,
        ...(recipient.endsOn ? { endsOn: recipient.endsOn } : {}),
      }));
      return {
        ...state,
        shares: [...state.shares.filter((share) => share.direction !== "outgoing" || share.plant.id !== action.plant.id), ...shares],
      };
    }
    case "removeShare":
      return { ...state, shares: state.shares.filter((share) => share.id !== action.id) };
    case "reset": return createSharingPreviewState();
  }
}
