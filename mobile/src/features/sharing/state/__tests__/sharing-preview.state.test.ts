import { createSharingPreviewState, sharingPreviewReducer, validatePreviewInvitation } from "../sharing-preview.state";
import type { SharingContact } from "../../types/sharing.types";

const self: SharingContact = { id: "owner", name: "Owner", email: "owner@example.test", floversId: "FL-DEMO-ME" };

describe("Sharing preview state", () => {
  it("saves several selected plants together while preserving unrelated access", () => {
    const original = createSharingPreviewState();
    const withOther = sharingPreviewReducer(original, { type: "saveSharing", plant: { id: "untouched", name: "Fern" },
      recipients: [{ contactId: "preview-luca", canCompleteTasks: true, endsOn: "2030-08-01" }] });
    const state = sharingPreviewReducer(withOther, { type: "savePlantsSharing", updates: [
      { plant: { id: "bird", name: "Bird" }, recipients: [{ contactId: "preview-anna", canCompleteTasks: true }] },
      { plant: { id: "pilea", name: "Pilea" }, recipients: [{ contactId: "preview-anna", canCompleteTasks: false, endsOn: "2030-06-01" }] },
    ] });
    expect(state.shares.filter((share) => share.plant.id === "bird")[0].canCompleteTasks).toBe(true);
    expect(state.shares.filter((share) => share.plant.id === "pilea")[0].canCompleteTasks).toBe(false);
    expect(state.shares.filter((share) => share.plant.id === "pilea")[0].endsOn).toBe("2030-06-01");
    expect(state.shares.filter((share) => share.plant.id === "untouched")).toEqual(withOther.shares.filter((share) => share.plant.id === "untouched"));
    expect(state.shares.filter((share) => share.direction === "incoming")).toEqual(original.shares.filter((share) => share.direction === "incoming"));
  });

  it("clears selected sharing without removing the other plants", () => {
    const original = createSharingPreviewState();
    const state = sharingPreviewReducer(original, { type: "savePlantsSharing", updates: [
      { plant: original.shares[0].plant, recipients: [] },
    ] });
    expect(state.shares.some((share) => share.direction === "outgoing")).toBe(false);
    expect(state.shares.filter((share) => share.direction === "incoming")).toEqual(original.shares.filter((share) => share.direction === "incoming"));
    expect(sharingPreviewReducer(original, { type: "savePlantsSharing", updates: [] })).toBe(original);
  });

  it("edits a private contact name without changing identity or shared access", () => {
    const original = createSharingPreviewState();
    const state = sharingPreviewReducer(original, { type: "renameContact", id: "preview-anna", name: "  Mom  " });
    expect(state.contacts[0]).toEqual({ ...original.contacts[0], name: "Mom" });
    expect(state.contacts[1]).toEqual(original.contacts[1]);
    expect(state.shares).toBe(original.shares);
    expect(state.invitations).toBe(original.invitations);
  });

  it("rejects empty, oversized or unknown contact-name edits", () => {
    const original = createSharingPreviewState();
    for (const edit of [{ id: "preview-anna", name: "  " }, { id: "preview-anna", name: "a".repeat(81) }, { id: "missing", name: "Mom" }]) {
      expect(sharingPreviewReducer(original, { type: "renameContact", ...edit })).toBe(original);
    }
  });

  it("rejects invalid, self, accepted and pending identities without case-sensitive duplicates", () => {
    const state = createSharingPreviewState();
    expect(validatePreviewInvitation(state, self, "not an address")).toEqual({ ok: false, reason: "invalid" });
    expect(validatePreviewInvitation(state, self, " OWNER@EXAMPLE.TEST ")).toEqual({ ok: false, reason: "self" });
    expect(validatePreviewInvitation(state, self, "fl-demo-me")).toEqual({ ok: false, reason: "self" });
    expect(validatePreviewInvitation(state, self, "ANNA@EXAMPLE.TEST")).toEqual({ ok: false, reason: "alreadyContact" });
    expect(validatePreviewInvitation(state, self, "fl-demo-marta")).toEqual({ ok: false, reason: "alreadyPending" });
  });

  it("does not let repeated submissions create duplicate outgoing invitations", () => {
    const action = { type: "invite" as const, identifier: "friend@example.test", currentUser: self, id: "new" };
    const first = sharingPreviewReducer(createSharingPreviewState(), action);
    const second = sharingPreviewReducer(first, { ...action, id: "second" });
    expect(second.invitations.filter((invitation) => invitation.contact.email === action.identifier)).toHaveLength(1);
  });

  it("only accepts incoming requests and accepts each person once", () => {
    const state = createSharingPreviewState();
    expect(sharingPreviewReducer(state, { type: "accept", id: "preview-outgoing" })).toBe(state);
    const accepted = sharingPreviewReducer(state, { type: "accept", id: "preview-incoming" });
    expect(accepted.contacts).toHaveLength(3);
    expect(sharingPreviewReducer(accepted, { type: "accept", id: "preview-incoming" }).contacts).toHaveLength(3);
  });

  it("removes a contact's sharing in both directions without touching other contacts", () => {
    const state = sharingPreviewReducer(createSharingPreviewState(), { type: "removeContact", id: "preview-anna" });
    expect(state.contacts.map((contact) => contact.id)).toEqual(["preview-luca"]);
    expect(state.shares).toHaveLength(2);
    expect(state.shares.every((share) => share.contactId === "preview-luca")).toBe(true);
  });

  it("saves one plant with independent permissions, known recipients and no duplicate access", () => {
    const original = createSharingPreviewState();
    const plant = { id: "owner-plant", name: "Bird" };
    const state = sharingPreviewReducer(original, { type: "saveSharing", plant, recipients: [
      { contactId: "preview-anna", canCompleteTasks: true },
      { contactId: "preview-luca", canCompleteTasks: false, endsOn: "2026-12-12" },
      { contactId: "preview-luca", canCompleteTasks: false, endsOn: "2026-12-12" },
      { contactId: "not-a-contact", canCompleteTasks: true },
    ] });
    const added = state.shares.filter((share) => share.plant.id === plant.id);
    expect(added).toHaveLength(2);
    expect(added.map((share) => share.canCompleteTasks)).toEqual([true, false]);
    expect(added[1].endsOn).toBe("2026-12-12");
    expect(state.shares.filter((share) => share.direction === "incoming")).toEqual(original.shares.filter((share) => share.direction === "incoming"));
  });

  it("editing access replaces the old recipients without duplicating the plant", () => {
    const original = createSharingPreviewState();
    const state = sharingPreviewReducer(original, { type: "saveSharing", plant: original.shares[0].plant,
      recipients: [{ contactId: "preview-luca", canCompleteTasks: false }] });
    const outgoing = state.shares.filter((share) => share.direction === "outgoing");
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0].contactId).toBe("preview-luca");
  });
});
