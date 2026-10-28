import React, { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState } from "react";
import { getAuthSessionId } from "../../../api/client";
import { useAuth } from "../../../app/providers/useAuth";
import type { InvitationResult, PlantSharingUpdate, ShareablePlant, SharePlantDraft, SharingContact, SharingPreviewState, SharingRecipient } from "../types/sharing.types";
import type { SharingToast, SharingToastKind, SharingToastVariant } from "../types/sharing.types";
import { createSharingPreviewState, sharingPreviewReducer, validatePreviewInvitation } from "./sharing-preview.state";

type SharingPreviewContextValue = SharingPreviewState & {
  currentUser: SharingContact;
  shareDraft: SharePlantDraft | null;
  inviteContact: (identifier: string) => InvitationResult;
  acceptInvitation: (id: string) => void;
  dismissInvitation: (id: string) => void;
  removeContact: (id: string) => void;
  updateContactName: (id: string, name: string) => boolean;
  openSharePlant: (plant?: ShareablePlant, contactId?: string) => void;
  closeSharePlant: () => void;
  savePlantSharing: (plant: ShareablePlant, recipients: SharingRecipient[]) => void;
  savePlantsSharing: (updates: PlantSharingUpdate[]) => void;
  removeShare: (id: string) => void;
  resetPreview: () => void;
  toast: SharingToast | null;
  notify: (kind: SharingToastKind, variant?: SharingToastVariant) => void;
  dismissToast: (id: number) => void;
};

const SharingPreviewContext = createContext<SharingPreviewContextValue | null>(null);

function SharingPreviewSession({ currentUser, children }: { currentUser: SharingContact; children: React.ReactNode }) {
  const [state, dispatch] = useReducer(sharingPreviewReducer, undefined, createSharingPreviewState);
  const [shareDraft, setShareDraft] = useState<SharePlantDraft | null>(null);
  const sequence = useRef(0);
  const toastSequence = useRef(0);
  const [toast, setToast] = useState<SharingToast | null>(null);
  const notify = useCallback((kind: SharingToastKind, variant: SharingToastVariant = "success") => {
    toastSequence.current += 1;
    setToast({ id: toastSequence.current, kind, variant });
  }, []);
  const value = useMemo<SharingPreviewContextValue>(() => ({
    ...state,
    currentUser,
    shareDraft,
    toast,
    notify,
    dismissToast: (id) => setToast((current) => current?.id === id ? null : current),
    inviteContact: (identifier) => {
      const result = validatePreviewInvitation(state, currentUser, identifier);
      if (result.ok) {
        sequence.current += 1;
        dispatch({ type: "invite", identifier, currentUser, id: `preview-invitation-${sequence.current}` });
        notify("invitationAdded");
      }
      return result;
    },
    acceptInvitation: (id) => {
      if (!state.invitations.some((invitation) => invitation.id === id && invitation.direction === "incoming")) return;
      dispatch({ type: "accept", id });
      notify("invitationAccepted");
    },
    dismissInvitation: (id) => {
      const invitation = state.invitations.find((item) => item.id === id);
      if (!invitation) return;
      dispatch({ type: "dismiss", id });
      notify(invitation.direction === "incoming" ? "invitationDeclined" : "invitationCancelled");
    },
    removeContact: (id) => {
      if (!state.contacts.some((contact) => contact.id === id)) return;
      dispatch({ type: "removeContact", id });
      notify("contactDeleted");
    },
    updateContactName: (id, value) => {
      const name = value.trim();
      if (!name || name.length > 80 || !state.contacts.some((contact) => contact.id === id)) return false;
      dispatch({ type: "renameContact", id, name });
      notify("contactUpdated");
      return true;
    },
    openSharePlant: (plant, contactId) => setShareDraft({ plant, contactId }),
    closeSharePlant: () => setShareDraft(null),
    savePlantSharing: (plant, recipients) => {
      dispatch({ type: "saveSharing", plant, recipients });
      notify("sharingSaved");
    },
    savePlantsSharing: (updates) => {
      if (!updates.length) return;
      dispatch({ type: "savePlantsSharing", updates });
      notify("sharingSaved");
    },
    removeShare: (id) => {
      const share = state.shares.find((item) => item.id === id);
      if (!share) return;
      dispatch({ type: "removeShare", id });
      notify(share.direction === "incoming" ? "plantLeft" : "accessRemoved");
    },
    resetPreview: () => {
      dispatch({ type: "reset" });
      setShareDraft(null);
      notify("previewReset");
    },
  }), [state, currentUser, shareDraft, toast, notify]);
  return <SharingPreviewContext.Provider value={value}>{children}</SharingPreviewContext.Provider>;
}

/** UI-only, per-login state: this provider never writes to the API or device storage. */
export function SharingPreviewProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const identity = user?.id ?? user?.email ?? "anonymous";
  const currentUser = useMemo<SharingContact>(() => ({
    id: String(identity),
    name: user?.first_name || user?.email || "You",
    email: user?.email || "",
    floversId: "FL-DEMO-ME",
  }), [identity, user?.email, user?.first_name]);
  return <SharingPreviewSession key={`${getAuthSessionId()}:${identity}`} currentUser={currentUser}>{children}</SharingPreviewSession>;
}

export function useSharingPreview() {
  const value = useContext(SharingPreviewContext);
  if (!value) throw new Error("Sharing screens require SharingPreviewProvider.");
  return value;
}
