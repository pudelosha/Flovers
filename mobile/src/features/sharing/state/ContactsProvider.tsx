import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { getAuthSessionId } from "../../../api/client";
import { useAuth } from "../../../app/providers/useAuth";
import {
  acceptContactInvitation, contactsErrorCode, deleteContact, dismissContactInvitation,
  fetchContacts, isContactIdentifier, renameContact, sendContactInvitation,
} from "../../../api/services/contacts.service";
import type { ContactsErrorCode, ContactsMutationResult, ContactsSnapshot } from "../types/contacts.types";
import type { SharingToastKind } from "../types/sharing.types";
import { useSharingPreview } from "./SharingPreviewProvider";

type ContactsState = { snapshot: ContactsSnapshot | null; loading: boolean; error: ContactsErrorCode | null; pending: string | null };
type ContactsContextValue = ContactsState & {
  refresh: () => Promise<boolean>;
  inviteContact: (identifier: string) => Promise<ContactsMutationResult>;
  acceptInvitation: (id: string) => Promise<ContactsMutationResult>;
  dismissInvitation: (id: string) => Promise<ContactsMutationResult>;
  removeContact: (id: string) => Promise<ContactsMutationResult>;
  updateContactName: (id: string, name: string) => Promise<ContactsMutationResult>;
};

const ContactsContext = createContext<ContactsContextValue | null>(null);

function ContactsSession({ identity, session, children }: { identity: string | null; session: number; children: React.ReactNode }) {
  const { notify } = useSharingPreview();
  const [state, setState] = useState<ContactsState>({ snapshot: null, loading: identity !== null, error: null, pending: null });
  const stateRef = useRef(state);
  stateRef.current = state;
  const mounted = useRef(true);
  const sequence = useRef(0);
  const refreshing = useRef<Promise<boolean> | null>(null);
  const mutating = useRef(false);
  const isCurrent = useCallback((request: number) => mounted.current && identity !== null &&
    getAuthSessionId() === session && sequence.current === request, [identity, session]);

  const refresh = useCallback((): Promise<boolean> => {
    if (!mounted.current || identity === null || getAuthSessionId() !== session || mutating.current) return Promise.resolve(false);
    if (refreshing.current) return refreshing.current;
    const request = ++sequence.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    const work = fetchContacts().then((snapshot) => {
      if (!isCurrent(request)) return false;
      setState({ snapshot, loading: false, error: null, pending: null });
      return true;
    }, (error) => {
      if (!isCurrent(request)) return false;
      setState((previous) => ({ ...previous, loading: false, error: contactsErrorCode(error) }));
      return false;
    }).finally(() => { if (refreshing.current === work) refreshing.current = null; });
    refreshing.current = work;
    return work;
  }, [identity, session, isCurrent]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const subscription = AppState.addEventListener("change", (next) => { if (next === "active") void refresh(); });
    return () => { mounted.current = false; sequence.current += 1; refreshing.current = null; subscription.remove(); };
  }, [refresh]);

  const mutate = useCallback(async (key: string, operation: () => Promise<ContactsSnapshot>, toast: SharingToastKind): Promise<ContactsMutationResult> => {
    if (!mounted.current || identity === null || getAuthSessionId() !== session) return { ok: false, reason: "staleSession" };
    if (mutating.current) return { ok: false, reason: "busy" };
    if (!stateRef.current.snapshot) return { ok: false, reason: "unavailable" };
    mutating.current = true;
    const request = ++sequence.current;
    setState((previous) => ({ ...previous, loading: false, pending: key }));
    try {
      const snapshot = await operation();
      if (!isCurrent(request)) return { ok: false, reason: "staleSession" };
      setState({ snapshot, loading: false, error: null, pending: key });
      notify(toast);
      return { ok: true };
    } catch (error) {
      if (!isCurrent(request)) return { ok: false, reason: "staleSession" };
      return { ok: false, reason: contactsErrorCode(error) };
    } finally {
      mutating.current = false;
      if (isCurrent(request)) setState((previous) => ({ ...previous, loading: false, pending: null }));
    }
  }, [identity, session, isCurrent, notify]);

  const value = useMemo<ContactsContextValue>(() => ({
    ...state, refresh,
    inviteContact: (identifier) => !isContactIdentifier(identifier)
      ? Promise.resolve({ ok: false, reason: "invalid" })
      : mutate("invite", () => sendContactInvitation(identifier), "contactsInvitationAdded"),
    acceptInvitation: (id) => mutate(`accept:${id}`, () => acceptContactInvitation(id), "contactsInvitationAccepted"),
    dismissInvitation: (id) => mutate(`dismiss:${id}`, () => dismissContactInvitation(id),
      stateRef.current.snapshot?.invitations.find((invitation) => invitation.id === id)?.direction === "incoming"
        ? "contactsInvitationDeclined" : "contactsInvitationCancelled"),
    removeContact: (id) => mutate(`delete:${id}`, () => deleteContact(id), "contactsContactDeleted"),
    updateContactName: (id, name) => !name.trim() || name.trim().length > 80
      ? Promise.resolve({ ok: false, reason: "invalid" })
      : mutate(`rename:${id}`, () => renameContact(id, name), "contactsContactUpdated"),
  }), [state, refresh, mutate]);
  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>;
}

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const identity = user?.id ?? user?.email ?? null;
  const session = getAuthSessionId();
  return <ContactsSession key={`${session}:${identity}`} identity={identity == null ? null : String(identity)} session={session}>{children}</ContactsSession>;
}

export function useContacts() {
  const value = useContext(ContactsContext);
  if (!value) throw new Error("Contacts screens require ContactsProvider.");
  return value;
}
