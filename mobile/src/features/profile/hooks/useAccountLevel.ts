import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getAuthSessionId } from "../../../api/client";
import { fetchProfileProgression } from "../../../api/services/profile.service";
import type { AccountLevelProgress } from "../types/account-level.types";

/** Read on entry/resume so completed care is reflected when returning to Profile. */
export function useAccountLevel(userId?: string | number | null) {
  const session = getAuthSessionId();
  const ownerKey = userId == null ? null : String(userId) + ":" + session;
  const currentOwner = useRef(ownerKey);
  currentOwner.current = ownerKey;
  const settledForFocus = useRef(false);
  const [state, setState] = useState<{
    ownerKey: string | null;
    progress: AccountLevelProgress | null;
    loading: boolean;
  }>({ ownerKey: null, progress: null, loading: false });

  useFocusEffect(useCallback(() => {
    let active = true;
    let sequence = 0;
    settledForFocus.current = false;
    if (!ownerKey) {
      setState({ ownerKey: null, progress: null, loading: false });
      return;
    }
    const refresh = async () => {
      const requestSequence = ++sequence;
      const isCurrent = () => active && sequence === requestSequence &&
        currentOwner.current === ownerKey && getAuthSessionId() === session;
      settledForFocus.current = false;
      setState({ ownerKey, progress: null, loading: true });
      try {
        const data = await fetchProfileProgression();
        if (!isCurrent()) return;
        settledForFocus.current = true;
        setState({ ownerKey, loading: false, progress: {
          level: data.level,
          xpIntoLevel: data.xp_into_level,
          xpForNextLevel: data.xp_for_next_level,
        } });
      } catch {
        if (isCurrent()) {
          settledForFocus.current = true;
          setState({ ownerKey, progress: null, loading: false });
        }
      }
    };
    void refresh();
    const subscription = AppState.addEventListener("change", next => {
      if (next === "active") void refresh();
    });
    return () => {
      active = false;
      settledForFocus.current = false;
      subscription.remove();
    };
  }, [ownerKey, session]));

  // Hide the previous account/focus response before the focus effect starts.
  // A settled failure still releases the screen spinner to show its error state.
  if (ownerKey == null) return { progress: null, loading: false };
  return state.ownerKey === ownerKey && settledForFocus.current
    ? { progress: state.progress, loading: state.loading }
    : { progress: null, loading: ownerKey != null };
}
