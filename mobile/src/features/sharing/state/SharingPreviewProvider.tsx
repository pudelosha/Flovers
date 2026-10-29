import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { getAuthSessionId } from "../../../api/client";
import { fetchSharing, deletePlantShare, sharingErrorCode, updatePlantSharing } from "../../../api/services/sharing.service";
import { useAuth } from "../../../app/providers/useAuth";
import type {
  PlantSharingUpdate, ShareablePlant, SharePlantDraft, SharingRecipient, SharingSnapshot,
  SharingErrorCode, SharingMutationResult, SharingToast, SharingToastKind, SharingToastVariant,
} from "../types/sharing.types";

type SharingState = { snapshot: SharingSnapshot | null; loaded: boolean; loading: boolean; error: SharingErrorCode | null; pending: string | null };
type SharingContextValue = SharingState & {
  contacts: SharingSnapshot["contacts"];
  shares: SharingSnapshot["shares"];
  currentUser: SharingSnapshot["currentUser"] | null;
  versions: SharingSnapshot["versions"];
  shareDraft: SharePlantDraft | null;
  refresh: () => Promise<SharingSnapshot | null>;
  openSharePlant: (plant?: ShareablePlant, contactId?: string) => void;
  closeSharePlant: () => void;
  savePlantSharing: (plant: ShareablePlant, recipients: SharingRecipient[]) => Promise<SharingMutationResult>;
  savePlantsSharing: (updates: PlantSharingUpdate[]) => Promise<SharingMutationResult>;
  removeShare: (id: string) => Promise<SharingMutationResult>;
  removePlantSharing: (plant: ShareablePlant, expectedRevision: number) => Promise<SharingMutationResult>;
  /** Compatibility for an unused preview notice; this only refreshes server data. */
  resetPreview: () => void;
  toast: SharingToast | null;
  notify: (kind: SharingToastKind, variant?: SharingToastVariant) => void;
  dismissToast: (id: number) => void;
};

const SharingContext = createContext<SharingContextValue | null>(null);

function SharingSession({ identity, session, children }: { identity: string | null; session: number; children: React.ReactNode }) {
  const [state, setState] = useState<SharingState>({ snapshot: null, loaded: false, loading: false, error: null, pending: null });
  const stateRef = useRef(state);
  stateRef.current = state;
  const [shareDraft, setShareDraft] = useState<SharePlantDraft | null>(null);
  const [toast, setToast] = useState<SharingToast | null>(null);
  const toastSequence = useRef(0);
  const sequence = useRef(0);
  const mounted = useRef(true);
  const refreshing = useRef<Promise<SharingSnapshot | null> | null>(null);
  const mutating = useRef(false);
  const isCurrent = useCallback((request: number) => mounted.current && identity !== null &&
    getAuthSessionId() === session && sequence.current === request, [identity, session]);
  const notify = useCallback((kind: SharingToastKind, variant: SharingToastVariant = "success") => {
    setToast({ id: ++toastSequence.current, kind, variant });
  }, []);

  const refresh = useCallback((): Promise<SharingSnapshot | null> => {
    if (!mounted.current || identity === null || getAuthSessionId() !== session || mutating.current) return Promise.resolve(null);
    if (refreshing.current) return refreshing.current;
    const request = ++sequence.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    const work = fetchSharing().then((snapshot) => {
      if (!isCurrent(request)) return null;
      setState({ snapshot, loaded: true, loading: false, error: null, pending: null });
      return snapshot;
    }, (error) => {
      if (!isCurrent(request)) return null;
      setState((previous) => ({ ...previous, loading: false, error: sharingErrorCode(error) }));
      return null;
    }).finally(() => { if (refreshing.current === work) refreshing.current = null; });
    refreshing.current = work;
    return work;
  }, [identity, session, isCurrent]);

  useLayoutEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active" && stateRef.current.loaded) void refresh();
    });
    return () => { mounted.current = false; sequence.current += 1; refreshing.current = null; subscription.remove(); };
  }, [refresh]);

  const mutate = useCallback(async (key: string, operation: () => Promise<SharingSnapshot>, kind: SharingToastKind): Promise<SharingMutationResult> => {
    if (!mounted.current || identity === null || getAuthSessionId() !== session) return { ok: false, reason: "staleSession" };
    if (mutating.current) return { ok: false, reason: "busy" };
    if (!stateRef.current.loaded) return { ok: false, reason: "unavailable" };
    mutating.current = true;
    const request = ++sequence.current;
    setState((previous) => ({ ...previous, loading: false, pending: key }));
    try {
      const snapshot = await operation();
      if (!isCurrent(request)) return { ok: false, reason: "staleSession" };
      setState({ snapshot, loaded: true, loading: false, error: null, pending: key });
      notify(kind);
      return { ok: true };
    } catch (error) {
      if (!isCurrent(request)) return { ok: false, reason: "staleSession" };
      const reason = sharingErrorCode(error);
      // Refresh the cache after an external change. Forms retain their own frozen
      // expected revisions until the user explicitly reloads the recipient matrix.
      if (reason === "conflict" || reason === "notContact" || reason === "notFound") {
        try {
          const snapshot = await fetchSharing();
          if (isCurrent(request)) setState({ snapshot, loaded: true, loading: false, error: null, pending: key });
        } catch { /* Preserve the last known data and show the original action error. */ }
      }
      return { ok: false, reason };
    } finally {
      mutating.current = false;
      if (isCurrent(request)) setState((previous) => ({ ...previous, loading: false, pending: null }));
    }
  }, [identity, session, isCurrent, notify]);

  const value = useMemo<SharingContextValue>(() => ({
    ...state,
    contacts: state.snapshot?.contacts ?? [], shares: state.snapshot?.shares ?? [],
    currentUser: state.snapshot?.currentUser ?? null, versions: state.snapshot?.versions ?? {},
    shareDraft, refresh,
    openSharePlant: (plant, contactId) => setShareDraft({ plant, contactId }),
    closeSharePlant: () => setShareDraft(null),
    savePlantSharing: (plant, recipients) => mutate("save", () => updatePlantSharing([{ plant, recipients }], stateRef.current.snapshot?.versions ?? {}), "sharingSaved"),
    savePlantsSharing: (updates) => updates.length === 0 ? Promise.resolve({ ok: false, reason: "invalid" })
      : mutate("save", () => updatePlantSharing(updates, stateRef.current.snapshot?.versions ?? {}), "sharingSaved"),
    removeShare: (id) => {
      const share = stateRef.current.snapshot?.shares.find((item) => item.id === id);
      return share ? mutate(`remove:${id}`, () => deletePlantShare(id), share.direction === "incoming" ? "plantLeft" : "accessRemoved")
        : Promise.resolve({ ok: false, reason: "notFound" });
    },
    removePlantSharing: (plant, expectedRevision) => {
      const snapshot = stateRef.current.snapshot;
      if (!snapshot?.shares.some((share) => share.plant.id === plant.id && share.direction === "outgoing")) {
        return Promise.resolve({ ok: false, reason: "notOwner" });
      }
      return mutate(`remove-plant:${plant.id}`, () => updatePlantSharing([
        { plant, recipients: [], expectedRevision },
      ], snapshot.versions), "sharingDeleted");
    },
    resetPreview: () => { void refresh(); },
    toast, notify, dismissToast: (id) => setToast((current) => current?.id === id ? null : current),
  }), [state, shareDraft, refresh, mutate, toast, notify]);
  return <SharingContext.Provider value={value}>{children}</SharingContext.Provider>;
}

/** Persisted sharing, scoped to a login session. The historical name preserves imports. */
export function SharingPreviewProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const identity = user?.id ?? user?.email ?? null;
  const session = getAuthSessionId();
  return <SharingSession key={`${session}:${identity}`} identity={identity == null ? null : String(identity)} session={session}>{children}</SharingSession>;
}

export function useSharingPreview() {
  const value = useContext(SharingContext);
  if (!value) throw new Error("Sharing screens require SharingPreviewProvider.");
  return value;
}
