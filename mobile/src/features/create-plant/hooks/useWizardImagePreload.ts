import { useEffect, useState } from "react";
import { Image } from "react-native";
import { getAuthSessionId, onAuthSessionChanged } from "../../../api/client";

const readyImages = new Set<string>();
const pendingImages = new Map<string, Promise<void>>();
const MAX_READY_IMAGES = 64;
const IMAGE_TIMEOUT = 8000;

function prepareImage(uri: string, session: number): Promise<void> {
  const key = `${session}:${uri}`;
  if (readyImages.has(key)) return Promise.resolve();
  const pending = pendingImages.get(key);
  if (pending) return pending;
  const work = new Promise<void>(resolve => {
    let finished = false;
    const finish = (success: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (success && session === getAuthSessionId()) {
        readyImages.add(key);
        if (readyImages.size > MAX_READY_IMAGES) readyImages.delete(readyImages.values().next().value!);
      }
      resolve();
    };
    const timer = setTimeout(() => finish(false), IMAGE_TIMEOUT);
    try {
      // Native image loading works for catalogue URLs and local camera files,
      // without needing a visible Image or writing private photos to disk caches.
      Image.getSize(uri, (width, height) => finish(width > 0 && height > 0), () => finish(false));
    } catch { finish(false); }
  }).finally(() => { pendingImages.delete(key); });
  pendingImages.set(key, work);
  return work;
}

/** Wait for a step's known images before displaying its complete card. */
export function useWizardImagePreload(values: Array<string | null | undefined>, enabled = true) {
  const [session, setSession] = useState(getAuthSessionId);
  const [settled, setSettled] = useState("");
  const uris = [...new Set(values.filter((value): value is string => typeof value === "string" && !!value.trim()).map(value => value.trim()))];
  const key = `${session}:${JSON.stringify(uris)}`;
  const cached = uris.every(uri => readyImages.has(`${session}:${uri}`));
  useEffect(() => onAuthSessionChanged(next => {
    readyImages.clear(); pendingImages.clear(); setSession(next);
  }), []);
  useEffect(() => {
    if (!enabled) { setSettled(""); return; }
    if (!uris.length || cached) return;
    let active = true;
    let next = 0;
    const worker = async () => {
      while (active && next < uris.length) await prepareImage(uris[next++], session);
    };
    void Promise.all(Array.from({ length: Math.min(4, uris.length) }, worker)).then(() => {
      if (active && session === getAuthSessionId()) setSettled(key);
    });
    return () => { active = false; };
    // The URI signature, not new array instances from render, describes the job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, cached]);
  return { loading: enabled && uris.length > 0 && !cached && settled !== key };
}
