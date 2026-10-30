import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { getAuthSessionId, hasAuthToken, onAuthSessionChanged } from "../../api/client";
import { loadPlantPhoto, onPlantPhotoCacheInvalidated } from "../../api/services/plant-photos.service";
import type { PlantPhoto, PlantPhotoVariant } from "../../api/services/plant-photos.service";

export type PhotoPreloadTarget = {
  photo?: PlantPhoto | null; variant?: PlantPhotoVariant; expiresAt?: string | null;
};

// Eight worst-case JPEG data URIs fit inside the existing 8 MiB private cache.
// Later list rows load on demand instead of downloading the whole collection.
const MAX_PRELOAD = 8;
const CONCURRENCY = 3;

/** Gate screen content on its first visible photos without mounting the tiles. */
export function usePlantPhotoPreload(targets: PhotoPreloadTarget[], enabled = true, reloadSignal?: number | string) {
  const [session, setSession] = useState(getAuthSessionId);
  const [retry, setRetry] = useState(0);
  const [settled, setSettled] = useState("");
  const seen = new Set<string>();
  const jobs = targets.filter((target): target is PhotoPreloadTarget & { photo: PlantPhoto } => {
    if (!target.photo || (target.expiresAt && Date.parse(target.expiresAt) <= Date.now())) return false;
    const identity = `${target.photo.id}:${target.variant ?? "display"}:${target.photo.url}:${target.photo.thumbnail_url}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  }).slice(0, MAX_PRELOAD);
  const signature = JSON.stringify(jobs.map(({ photo, variant, expiresAt }) =>
    [photo.id, photo.url, photo.thumbnail_url, variant ?? "display", expiresAt, photo.framing_revision]));
  const key = `${session}:${retry}:${reloadSignal ?? ""}:${signature}`;

  useEffect(() => onAuthSessionChanged(setSession), []);
  useEffect(() => onPlantPhotoCacheInvalidated(() => setRetry(value => value + 1)), []);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", status => { if (status === "active") setRetry(value => value + 1); });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!enabled) { setSettled(""); return; }
    if (!jobs.length || !hasAuthToken()) return;
    let active = true;
    let next = 0;
    const work = async () => {
      while (active && next < jobs.length) {
        const target = jobs[next++];
        try { await loadPlantPhoto(target.photo, target.variant ?? "display", true); }
        catch { /* The tile renders its failure placeholder; never hold the screen indefinitely. */ }
      }
    };
    void Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, work)).then(() => {
      if (active && session === getAuthSessionId()) setSettled(key);
    });
    return () => { active = false; };
    // Jobs are described by the stable signature; fresh API objects alone must
    // not restart the spinner during background sharing refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const loading = enabled && hasAuthToken() && jobs.length > 0 && settled !== key;
  return { loading, ready: enabled && !loading };
}
