import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { getAuthSessionId, hasAuthToken, onAuthSessionChanged } from "../../api/client";
import { loadPlantPhoto, onPlantPhotoCacheInvalidated } from "../../api/services/plant-photos.service";
import type { PlantPhoto, PlantPhotoVariant } from "../../api/services/plant-photos.service";

type Options = { variant?: PlantPhotoVariant; reloadSignal?: number; expiresAt?: string | null };

/** Only authorized, session-bound bytes are exposed to Image/ImageBackground. */
export function usePlantPhoto(photo: PlantPhoto | null | undefined, options: Options = {}) {
  const variant = options.variant ?? "display";
  const [sessionId, setSessionId] = useState(getAuthSessionId);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [state, setState] = useState<{ key: string; uri: string | null; loading: boolean; error: unknown }>(
    { key: "", uri: null, loading: false, error: null });
  const key = photo ? `${sessionId}:${photo.id}:${variant}:${photo.url}:${photo.thumbnail_url}` : "";
  const refresh = useCallback(() => { setRefreshSignal(value => value + 1); }, []);

  useEffect(() => onAuthSessionChanged(next => {
    setState({ key: "", uri: null, loading: false, error: null });
    setSessionId(next);
  }), []);

  useEffect(() => {
    let active = true;
    let attempt = 0;
    const expired = () => !!options.expiresAt && Date.parse(options.expiresAt) <= Date.now();
    const update = async (conceal = false) => {
      const current = ++attempt;
      if (!photo || !hasAuthToken() || expired()) {
        setState({ key, uri: null, loading: false, error: null });
        return;
      }
      setState(previous => ({ key, uri: conceal || previous.key !== key ? null : previous.uri,
        loading: true, error: null }));
      try {
        const uri = await loadPlantPhoto(photo, variant, true);
        if (active && current === attempt && !expired()) setState({ key, uri, loading: false, error: null });
      } catch (error) {
        if (active && current === attempt) setState({ key, uri: null, loading: false, error });
      }
    };
    void update(true);
    if (!photo || !hasAuthToken()) return () => { active = false; attempt += 1; };
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void update();
    }, 60_000);
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleExpiry = () => {
      if (!options.expiresAt || !Number.isFinite(Date.parse(options.expiresAt))) return;
      const remaining = Date.parse(options.expiresAt) - Date.now();
      expiryTimer = setTimeout(() => {
        if (!active) return;
        void update(true);
        if (remaining > 86_400_000) scheduleExpiry();
      }, Math.min(Math.max(0, remaining), 86_400_000));
    };
    scheduleExpiry();
    const foreground = AppState.addEventListener("change", status => {
      if (status === "active") void update(true);
    });
    const invalidation = onPlantPhotoCacheInvalidated(reason => {
      if (reason === "session") {
        attempt += 1;
        setState({ key: "", uri: null, loading: false, error: null });
      } else void update(true);
    });
    return () => {
      active = false;
      attempt += 1;
      clearInterval(timer);
      if (expiryTimer) clearTimeout(expiryTimer);
      foreground.remove(); invalidation();
    };
  }, [key, variant, options.reloadSignal, options.expiresAt, refreshSignal, sessionId]);

  return { uri: state.key === key ? state.uri : null, loading: !!photo && (state.key !== key || state.loading),
    error: state.key === key ? state.error : null, refresh };
}
