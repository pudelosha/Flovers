// ChangePlantImageModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Keyboard,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";
import ModalCloseButton from "../../../../shared/ui/ModalCloseButton";
import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImageLibraryOptions,
} from "react-native-image-picker";

import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";
import { ApiError } from "../../../../api/client";
import { fetchPlantInstanceDetail } from "../../../../api/services/plant-instances.service";
import { uploadPlantPhoto, deletePlantPhoto, updatePlantPhotoFraming, type PlantPhoto } from "../../../../api/services/plant-photos.service";
import PlantPhotoFramingEditor from "../../../../shared/ui/PlantPhotoFramingEditor";
import { DEFAULT_PHOTO_FRAMING, normalizePhotoFraming, type PhotoFraming } from "../../../../shared/utils/photoFraming";
import { usePlantPhoto } from "../../../../shared/hooks/usePlantPhoto";
import {
  getPlantPhotoUri,
  deletePlantPhotoById,
} from "../../../../shared/utils/photoStorage";

type Props = {
  visible: boolean;
  onClose: () => void;
  plantId: string | number | null;

  /** Called ONLY after user presses Save. */
  onChanged?: (photo: PlantPhoto | null) => void;
};

async function ensureAndroidCameraPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  // The native photo picker grants access to its selected image. Camera
  // capture only needs CAMERA because we do not save to the public gallery.
  const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
  const results = await PermissionsAndroid.requestMultiple([permission]);
  return results[permission] === PermissionsAndroid.RESULTS.GRANTED;
}

function genUploadKey() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 3) | 8).toString(16);
  });
}

/** RN Image cache-buster for local file URIs */
function withCacheBuster(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const sep = uri.includes("?") ? "&" : "?";
  return `${uri}${sep}t=${Date.now()}`;
}

type PendingAction =
  | { kind: "none" }
  | { kind: "set"; uri: string; uploadKey: string }
  | { kind: "remove" };

function sameFraming(left: PhotoFraming, right: PhotoFraming) {
  return Math.abs(left.focal_x - right.focal_x) < 0.000001
    && Math.abs(left.focal_y - right.focal_y) < 0.000001
    && Math.abs(left.zoom - right.zoom) < 0.000001;
}

export default function ChangePlantImageModal({ visible, onClose, plantId, onChanged }: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any): string => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      if (typeof txt === "string" && txt && txt !== key) return txt;
      return fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  const [loading, setLoading] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<PlantPhoto | null>(null);
  const [legacySourceUri, setLegacySourceUri] = useState<string | null>(null);
  const privatePhoto = usePlantPhoto(visible ? currentPhoto : null, { variant: "display" });

  // currently stored on disk
  const [persistedUri, setPersistedUri] = useState<string | null>(null);

  // preview state (may differ from persisted)
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [framing, setFraming] = useState<PhotoFraming>(DEFAULT_PHOTO_FRAMING);
  const initialFramingRef = useRef<PhotoFraming>(DEFAULT_PHOTO_FRAMING);
  const [photoInteracting, setPhotoInteracting] = useState(false);
  const framingChanged = !!previewUri && !sameFraming(framing, initialFramingRef.current);

  // pending action (applied only on Save)
  const [pending, setPending] = useState<PendingAction>({ kind: "none" });

  // in-app confirms (instead of native Alert)
  const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
  const [confirmDiscardVisible, setConfirmDiscardVisible] = useState(false);

  const initialPersistedUriRef = useRef<string | null>(null);
  const contextRef = useRef({ visible, plantId, generation: 0 });
  if (contextRef.current.visible !== visible || contextRef.current.plantId !== plantId) {
    contextRef.current = { visible, plantId, generation: contextRef.current.generation + 1 };
  }

  const close = useCallback(() => {
    if (savingRef.current) return;
    Keyboard.dismiss();

    const hasUnsaved = pending.kind !== "none" || framingChanged;
    if (hasUnsaved) {
      setConfirmDiscardVisible(true);
      return;
    }

    onClose();
  }, [onClose, pending.kind, framingChanged]);

  // Load the current server version before permitting mutations. Older local
  // photos remain an explicit upload choice instead of being silently shared.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!visible) return;

      // reset transient UI
      setConfirmRemoveVisible(false);
      setConfirmDiscardVisible(false);

      setError(null);
      setLoadFailed(false);
      setConflicted(false);
      setLoading(true);
      setCurrentPhoto(null);
      setLegacySourceUri(null);
      setPhotoInteracting(false);
      setFraming(DEFAULT_PHOTO_FRAMING);
      initialFramingRef.current = DEFAULT_PHOTO_FRAMING;

      try {
        if (!plantId) {
          setPersistedUri(null);
          setPreviewUri(null);
          initialPersistedUriRef.current = null;
          setPending({ kind: "none" });
          setError(tr("plantDetailsModals.changeImage.noPlantId", "No plant id found."));
          return;
        }

        const plant = await fetchPlantInstanceDetail(Number(plantId), { auth: true });
        if (cancelled) return;
        const photo = plant.photo ?? null;
        setCurrentPhoto(photo);
        const savedFraming = normalizePhotoFraming(photo?.framing);
        setFraming(savedFraming);
        initialFramingRef.current = savedFraming;
        const existing = photo ? null : await getPlantPhotoUri(String(plantId));
        const busted = withCacheBuster(existing || null);

        if (!cancelled) {
          setPersistedUri(busted);
          setLegacySourceUri(existing || null);
          setPreviewUri(busted);
          initialPersistedUriRef.current = busted;
          setPending({ kind: "none" });
          setLoadFailed(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoadFailed(true);
          setPersistedUri(null);
          setPreviewUri(null);
          initialPersistedUriRef.current = null;
          setPending({ kind: "none" });
          setError(tr("plantDetailsModals.changeImage.loadFailed", "Could not load this plant's photo. Please try again."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [visible, plantId, tr]);

  useEffect(() => {
    if (!visible || !currentPhoto || savingRef.current) return;
    if (privatePhoto.uri) {
      setPersistedUri(privatePhoto.uri);
      initialPersistedUriRef.current = privatePhoto.uri;
      if (pending.kind === "none") setPreviewUri(privatePhoto.uri);
    } else if (privatePhoto.error) {
      setLoadFailed(true);
      setError(tr("plantDetailsModals.changeImage.loadFailed", "Could not load this plant's photo. Please try again."));
    }
  }, [visible, currentPhoto, privatePhoto.uri, privatePhoto.error, pending.kind, tr]);

  const showOnlySpinner = !error && (loading || (currentPhoto && !privatePhoto.uri && !privatePhoto.error));

  const setPendingSet = useCallback((uri: string) => {
    const busted = withCacheBuster(uri);
    setPreviewUri(busted);
    setFraming(DEFAULT_PHOTO_FRAMING);
    setPending({ kind: "set", uri, uploadKey: genUploadKey() });
    setError(null);
  }, []);

  const changeFraming = useCallback((value: PhotoFraming) => {
    setFraming(normalizePhotoFraming(value));
    // Moving an older local photo and then pressing Save is also an explicit
    // choice to sync it; merely opening the editor never uploads anything.
    if (!currentPhoto && legacySourceUri && pending.kind === "none") {
      setPending({ kind: "set", uri: legacySourceUri, uploadKey: genUploadKey() });
    }
    setError(null);
  }, [currentPhoto, legacySourceUri, pending.kind]);

  const setPendingRemove = useCallback(() => {
    setPreviewUri(null);
    setPending({ kind: "remove" });
  }, []);

  const doPickFromCamera = useCallback(async () => {
    if (!plantId) return;

    const opts: CameraOptions = {
      mediaType: "photo",
      saveToPhotos: false,
      includeBase64: false,
      quality: 0.8,
      maxWidth: 1280,
      maxHeight: 1280,
      assetRepresentationMode: "compatible",
    };

    try {
      const ok = await ensureAndroidCameraPermission();
      if (!ok) {
        setError(tr("plantDetailsModals.changeImage.cameraPermission", "Allow camera access in your phone settings to take a photo."));
        return;
      }
      const res = await launchCamera(opts);
      if (res.didCancel) return;
      const uri = res.assets?.[0]?.uri;
      if (res.errorCode || !uri) throw new Error("Camera did not return a photo.");
      setPendingSet(uri);
    } catch {
      setError(tr("plantDetailsModals.changeImage.cameraFailed", "Could not open the camera. Please try again."));
    }
  }, [plantId, setPendingSet, tr]);

  const doPickFromGallery = useCallback(async () => {
    if (!plantId) return;

    const opts: ImageLibraryOptions = {
      mediaType: "photo",
      selectionLimit: 1,
      includeBase64: false,
      quality: 0.8,
      maxWidth: 1280,
      maxHeight: 1280,
      assetRepresentationMode: "compatible",
    };

    try {
      const res = await launchImageLibrary(opts);
      if (res.didCancel) return;
      const uri = res.assets?.[0]?.uri;
      if (res.errorCode || !uri) throw new Error("Picker did not return a photo.");
      setPendingSet(uri);
    } catch {
      setError(tr("plantDetailsModals.changeImage.pickerFailed", "Could not open the photo picker. Please try again."));
    }
  }, [plantId, setPendingSet, tr]);

  const requestRemove = useCallback(() => {
    if (!plantId) return;
    setConfirmRemoveVisible(true);
  }, [plantId]);

  const applyChanges = useCallback(async () => {
    if (!plantId || savingRef.current) return;

    if (pending.kind === "none" && !framingChanged) {
      onClose();
      return;
    }

    savingRef.current = true;
    const targetPlantId = String(plantId);
    const generation = contextRef.current.generation;
    const isCurrent = () => contextRef.current.visible && contextRef.current.generation === generation
      && String(contextRef.current.plantId) === targetPlantId;
    setLoading(true);
    setPhotoInteracting(false);
    setError(null);

    try {
      if (pending.kind === "remove") {
        await deletePlantPhoto(plantId, {
          expectedPhotoId: currentPhoto?.id ?? null,
          ...(currentPhoto ? { expectedFramingRevision: currentPhoto.framing_revision ?? 0 } : {}),
        });
        await deletePlantPhotoById(plantId).catch(() => {});
        if (!isCurrent()) return;
        setCurrentPhoto(null);
        setLegacySourceUri(null);
        setPersistedUri(null);
        setPreviewUri(null);
        setPending({ kind: "none" });
        initialPersistedUriRef.current = null;

        onChanged?.(null);
        onClose();
        return;
      }

      let photo: PlantPhoto;
      if (pending.kind === "none") {
        if (!currentPhoto) return;
        photo = await updatePlantPhotoFraming(plantId, framing, {
          expectedPhotoId: currentPhoto.id,
          expectedFramingRevision: currentPhoto.framing_revision ?? 0,
        });
      } else {
        photo = await uploadPlantPhoto(plantId, pending.uri, {
          uploadKey: pending.uploadKey,
          expectedPhotoId: currentPhoto?.id ?? null,
          ...(currentPhoto ? { expectedFramingRevision: currentPhoto.framing_revision ?? 0 } : {}),
          framing,
        });
        // A retry after a lost upload response may return its earlier framing.
        // Update only the coordinates, retaining the committed file and key.
        if (!sameFraming(normalizePhotoFraming(photo.framing), framing)) {
          photo = await updatePlantPhotoFraming(plantId, framing, {
            expectedPhotoId: photo.id,
            // A freshly uploaded photo starts at revision 0. A later revision
            // belongs to another edit and must not be overwritten by a retry.
            expectedFramingRevision: 0,
          });
        }
      }
      // Once the server has committed the replacement, obsolete legacy photos
      // must not override it or reappear after a later server-side removal.
      await deletePlantPhotoById(plantId).catch(() => {});
      if (!isCurrent()) return;
      setCurrentPhoto(photo);
      setLegacySourceUri(null);
      setPending({ kind: "none" });
      onChanged?.(photo);
      onClose();
    } catch (e: any) {
      if (!isCurrent()) return;
      const code = e instanceof ApiError ? e.body?.code : undefined;
      const key = code === "invalid_photo" ? "invalidPhoto"
        : code === "upload_too_large" ? "uploadTooLarge"
        : code === "photo_quota_exceeded" ? "photoQuota"
        : code === "photo_storage_unavailable" ? "photoStorage"
        : code === "photo_conflict" ? "photoConflict"
        : code === "photo_framing_unavailable" ? "framingUnsupported" : "saveFailedMsg";
      if (code === "photo_conflict") setConflicted(true);
      const fallback = code === "photo_conflict"
        ? "The photo changed on another device. Close this window and reopen it before saving."
        : code === "photo_framing_unavailable"
          ? "Photo positioning is not available on the server yet. Please update the server and try again."
          : "Could not update the photo. Your previous photo is unchanged. Please try again.";
      setError(tr(`plantDetailsModals.changeImage.${key}`, fallback));
    } finally {
      savingRef.current = false;
      if (isCurrent()) setLoading(false);
    }
  }, [plantId, pending, currentPhoto, framing, framingChanged, onChanged, onClose, tr]);

  const discardChanges = useCallback(() => {
    if (savingRef.current) return;
    const orig = initialPersistedUriRef.current;
    setPersistedUri(orig);
    setPreviewUri(orig);
    setPending({ kind: "none" });
    setFraming(initialFramingRef.current);
    setConfirmDiscardVisible(false);
    onClose();
  }, [onClose]);

  // Hide "Remove" once removal is initiated
  const canRemove = useMemo(() => {
    if (loading) return false;
    if (pending.kind === "remove") return false;
    return !!previewUri || !!persistedUri;
  }, [previewUri, persistedUri, loading, pending.kind]);

  const canSave = useMemo(() => (pending.kind !== "none" || framingChanged) && !loading && !loadFailed && !conflicted,
    [pending.kind, framingChanged, loading, loadFailed, conflicted]);

  if (!visible) return null;

  return (
    <>
      <Pressable style={styles.backdrop} onPress={close} />

      <View style={styles.wrap}>
        <View style={styles.glass} pointerEvents="none">
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={14}
            overlayColor="transparent"
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View pointerEvents="none" style={styles.glassTint} />
          <View pointerEvents="none" style={styles.glassHaze} />
        </View>

        <View style={styles.inner}>
          {showOnlySpinner ? (
            <View style={styles.spinnerBox}>
              <CenteredSpinner size={42} />
            </View>
          ) : error && loadFailed ? (
            <ScrollView
              style={styles.scroll}
              scrollEnabled={!photoInteracting}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>{tr("plantDetailsModals.changeImage.error", "Something went wrong.")}</Text>
                <Text style={[styles.stateText, { opacity: 0.9 }]}>{error}</Text>
              </View>

              <View style={styles.bottomRow}>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={close} disabled={loading}>
                  <Text style={styles.btnText}>{tr("plantDetailsModals.common.close", "Close")}</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.scroll}
              scrollEnabled={!photoInteracting}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.headerRow}>
                <Text style={styles.title} numberOfLines={2}>
                  {tr("plantDetailsModals.changeImage.title", "Change image")}
                </Text>
              </View>

              <Text style={styles.desc}>
                {tr("plantDetailsModals.changeImage.subtitle", "Your photo is synced privately and is visible only to you and people with access to this plant.")}
              </Text>

              {!!legacySourceUri && !currentPhoto && <Text style={styles.desc}>
                {tr("plantDetailsModals.changeImage.legacyInfo", "This older photo is stored only on this phone. Choose Upload this photo to sync it.")}
              </Text>}

              {previewUri ? (
                <PlantPhotoFramingEditor
                  uri={previewUri}
                  width={pending.kind === "none" ? currentPhoto?.width : undefined}
                  height={pending.kind === "none" ? currentPhoto?.height : undefined}
                  value={framing}
                  onChange={changeFraming}
                  disabled={loading || loadFailed || conflicted}
                  onInteractionChange={setPhotoInteracting}
                />
              ) : (
                <View style={styles.previewFrame}>
                  <View style={styles.previewEmpty}>
                    <MaterialCommunityIcons name="image-plus" size={28} color="#FFFFFF" />
                    <Text style={styles.previewEmptyText}>
                      {pending.kind === "remove"
                        ? tr("plantDetailsModals.changeImage.removedPreview", "Photo will be removed")
                        : tr("plantDetailsModals.changeImage.noPhoto", "No photo selected")}
                    </Text>
                  </View>
                </View>
              )}

              {(pending.kind !== "none" || framingChanged) && (
                <View style={styles.unsavedPill}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.unsavedText}>{tr("plantDetailsModals.changeImage.unsaved", "Unsaved changes")}</Text>
                </View>
              )}
              {!!error && <Text accessibilityRole="alert" style={[styles.desc, { color: "#FFB4B4" }]}>{error}</Text>}

              <View style={styles.actions}>
                {!!legacySourceUri && !currentPhoto && <Pressable style={styles.actionFull}
                  onPress={() => setPendingSet(legacySourceUri)} disabled={loading || conflicted}>
                  <MaterialCommunityIcons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionText}>{tr("plantDetailsModals.changeImage.uploadExisting", "Upload this photo")}</Text>
                </Pressable>}
                <Pressable
                  style={[styles.actionFull, styles.actionPrimary]}
                  onPress={doPickFromCamera}
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="camera" size={18} color="#FFFFFF" />
                  <Text style={styles.actionText}>{tr("plantDetailsModals.changeImage.takePhoto", "Take a photo")}</Text>
                </Pressable>

                <Pressable
                  style={styles.actionFull}
                  onPress={doPickFromGallery}
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                  disabled={loading}
                >
                  <MaterialCommunityIcons name="image-multiple" size={18} color="#FFFFFF" />
                  <Text style={styles.actionText}>{tr("plantDetailsModals.changeImage.chooseGallery", "Choose from gallery")}</Text>
                </Pressable>

                {canRemove && (
                  <Pressable
                    style={styles.actionFull}
                    onPress={requestRemove}
                    android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                    disabled={loading}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.actionText}>{tr("plantDetailsModals.changeImage.remove", "Remove photo")}</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.bottomRow}>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={close} disabled={loading}>
                  <Text style={styles.btnText}>{tr("plantDetailsModals.common.close", "Close")}</Text>
                </Pressable>

                <Pressable style={[styles.btn, styles.btnPrimary, !canSave && { opacity: 0.55 }]} onPress={applyChanges} disabled={!canSave}>
                  <Text style={[styles.btnText, styles.btnPrimaryText]}>{tr("plantDetailsModals.common.save", "Save")}</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          <ModalCloseButton
            onPress={close}
            accessibilityLabel={tr("plantDetailsModals.common.close", "Close")}
            style={styles.closeButton}
          />

          {/* In-app confirm sheet: Remove (NO dimming backdrop) */}
          {confirmRemoveVisible && (
            <View style={styles.confirmOverlay} pointerEvents="box-none">
              <View style={styles.confirmCard}>
                <View style={styles.confirmHeader}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmTitle}>{tr("plantDetailsModals.changeImage.confirmRemoveTitle", "Remove photo?")}</Text>
                </View>

                <Text style={styles.confirmBody}>
                  {tr("plantDetailsModals.changeImage.confirmRemoveMsg", "The photo will be removed after you press Save.")}
                </Text>

                <View style={styles.confirmRow}>
                  <Pressable style={[styles.confirmBtn, styles.confirmBtnGhost]} onPress={() => setConfirmRemoveVisible(false)}>
                    <Text style={styles.confirmBtnText}>{tr("plantDetailsModals.common.cancel", "Cancel")}</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.confirmBtn, styles.confirmBtnDanger]}
                    onPress={() => {
                      setConfirmRemoveVisible(false);
                      setPendingRemove();
                    }}
                  >
                    <Text style={styles.confirmBtnText}>{tr("plantDetailsModals.common.remove", "Remove")}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* In-app confirm sheet: Discard (NO dimming backdrop) */}
          {confirmDiscardVisible && (
            <View style={styles.confirmOverlay} pointerEvents="box-none">
              <View style={styles.confirmCard}>
                <View style={styles.confirmHeader}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmTitle}>{tr("plantDetailsModals.changeImage.confirmDiscardTitle", "Discard changes?")}</Text>
                </View>

                <Text style={styles.confirmBody}>
                  {tr("plantDetailsModals.changeImage.confirmDiscardMsg", "Your changes will not be saved.")}
                </Text>

                <View style={styles.confirmRow}>
                  <Pressable style={[styles.confirmBtn, styles.confirmBtnGhost]} onPress={() => setConfirmDiscardVisible(false)}>
                    <Text style={styles.confirmBtnText}>{tr("plantDetailsModals.common.cancel", "Cancel")}</Text>
                  </Pressable>

                  <Pressable style={[styles.confirmBtn, styles.confirmBtnDanger]} onPress={discardChanges}>
                    <Text style={styles.confirmBtnText}>{tr("plantDetailsModals.changeImage.discard", "Discard")}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.42)", zIndex: 80 },

  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 81,
    paddingHorizontal: 24,
  },

  glass: { ...StyleSheet.absoluteFillObject, borderRadius: 18, overflow: "hidden" },
  glassTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.22)" },
  glassHaze: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.06)" },

  inner: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "transparent",
    minHeight: 260,
    height: "86%",
    maxHeight: "86%",
  },

  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 44,
    paddingBottom: 120,
  },

  spinnerBox: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingVertical: 22,
  },

  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 6 },
  headerIcon: { marginRight: 10 },
  title: { color: "#FFFFFF", fontWeight: "800", fontSize: 18, flex: 1 },

  desc: {
    marginHorizontal: 16,
    marginBottom: 10,
    color: "rgba(255,255,255,0.95)",
    fontSize: 13,
    fontWeight: "300",
    lineHeight: 18,
    textAlign: "justify",
  },

  stateBox: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    gap: 10,
  },
  stateText: { color: "rgba(255,255,255,0.92)", fontWeight: "600", lineHeight: 18, textAlign: "center" },

  previewFrame: {
    marginHorizontal: 16,
    height: 190,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0.18)",
  },
  previewEmpty: { alignItems: "center", justifyContent: "center" },
  previewEmptyText: { color: "rgba(255,255,255,0.92)", fontWeight: "700", marginTop: 8 },

  unsavedPill: {
    marginTop: 10,
    marginHorizontal: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  unsavedText: { color: "rgba(255,255,255,0.92)", fontWeight: "800", fontSize: 12 },

  actions: { marginTop: 10, gap: 10, paddingHorizontal: 16 },

  actionFull: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  actionPrimary: { backgroundColor: "rgba(11,114,133,0.92)" },
  actionText: { color: "#FFFFFF", fontWeight: "800" },

  bottomRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12 },

  btn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "#FFFFFF", fontWeight: "800" },

  btnPrimary: { backgroundColor: "rgba(11,114,133,0.92)" },
  btnPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
  btnGhost: { backgroundColor: "rgba(255,255,255,0.12)" },
  closeButton: {
    top: 8,
    right: 8,
  },

  // custom confirm sheet (NO dimming backdrop)
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
    elevation: 1200,
    justifyContent: "center",
  },
  confirmCard: {
    margin: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(0,0,0,1)",
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  confirmHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  confirmTitle: { color: "#FFFFFF", fontWeight: "900", fontSize: 14, flex: 1 },
  confirmBody: { color: "rgba(255,255,255,0.92)", fontWeight: "500", lineHeight: 18, marginBottom: 12 },
  confirmRow: { flexDirection: "row", gap: 10 },

  confirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  confirmBtnGhost: { backgroundColor: "rgba(255,255,255,0.10)" },
  confirmBtnDanger: { backgroundColor: "rgba(160, 34, 34, 0.85)" },
  confirmBtnText: { color: "#FFFFFF", fontWeight: "900" },
});
