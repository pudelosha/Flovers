// ChangePlantImageModal.tsx
// C:\Projekty\Python\Flovers\mobile\src\features\plant-details\components\modals\ChangePlantImageModal.tsx
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
  Image,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";
import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImageLibraryOptions,
} from "react-native-image-picker";

import CenteredSpinner from "../../../../shared/ui/CenteredSpinner";
import {
  getPlantPhotoUri,
  persistTempPlantPhoto,
  promoteTempPhotoToPlant,
  deleteLocalPhoto,
} from "../../../../shared/utils/photoStorage";

type Props = {
  visible: boolean;
  onClose: () => void;
  plantId: string | number | null;

  /** Called ONLY after user presses Save. */
  onChanged?: (newLocalUri: string | null) => void;
};

async function ensureAndroidPermissionCameraAndRead(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  const perms: string[] = [
    PermissionsAndroid.PERMISSIONS.CAMERA,
    (Number(Platform.Version) >= 33
      ? (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE),
  ].filter(Boolean) as string[];

  const results = await PermissionsAndroid.requestMultiple(perms);
  return perms.every((p) => results[p] === PermissionsAndroid.RESULTS.GRANTED);
}

function genTempKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** RN Image cache-buster for local file URIs */
function withCacheBuster(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const sep = uri.includes("?") ? "&" : "?";
  return `${uri}${sep}t=${Date.now()}`;
}

/** deleteLocalPhoto must receive the real file uri/path (no query params) */
function stripQuery(uri: string): string {
  return uri.split("?")[0];
}

type PendingAction =
  | { kind: "none" }
  | { kind: "set"; uri: string } // set/replace with this local uri
  | { kind: "remove" }; // remove local photo

export default function ChangePlantImageModal({ visible, onClose, plantId, onChanged }: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const insets = useSafeAreaInsets();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // currently stored on disk
  const [persistedUri, setPersistedUri] = useState<string | null>(null);

  // preview state (may differ from persisted)
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  // pending action (applied only on Save)
  const [pending, setPending] = useState<PendingAction>({ kind: "none" });

  // in-app confirms (instead of native Alert)
  const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
  const [confirmDiscardVisible, setConfirmDiscardVisible] = useState(false);

  const initialPersistedUriRef = useRef<string | null>(null);

  const close = useCallback(() => {
    Keyboard.dismiss();

    const hasUnsaved = pending.kind !== "none";
    if (hasUnsaved) {
      setConfirmDiscardVisible(true);
      return;
    }

    onClose();
  }, [onClose, pending.kind]);

  // load existing local photo when opened
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!visible) return;

      // reset transient UI
      setConfirmRemoveVisible(false);
      setConfirmDiscardVisible(false);

      setError(null);
      setLoading(true);

      try {
        if (!plantId) {
          setPersistedUri(null);
          setPreviewUri(null);
          initialPersistedUriRef.current = null;
          setPending({ kind: "none" });
          setError(tr("plantDetailsModals.changeImage.noPlantId", "No plant id found."));
          return;
        }

        const existing = await getPlantPhotoUri(String(plantId));
        const busted = withCacheBuster(existing || null);

        if (!cancelled) {
          setPersistedUri(busted);
          setPreviewUri(busted);
          initialPersistedUriRef.current = busted;
          setPending({ kind: "none" });
        }
      } catch (e: any) {
        if (!cancelled) {
          setPersistedUri(null);
          setPreviewUri(null);
          initialPersistedUriRef.current = null;
          setPending({ kind: "none" });
          setError(e?.message || tr("plantDetailsModals.changeImage.loadFailed", "Could not load local image."));
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

  const bottomGap = Math.max(insets.bottom, 0) + 12;
  const scrollPadBottom = 44 + bottomGap + 24;

  const showOnlySpinner = loading && !error;

  const setPendingSet = useCallback((uri: string) => {
    const busted = withCacheBuster(uri);
    setPreviewUri(busted);
    setPending({ kind: "set", uri });
  }, []);

  const setPendingRemove = useCallback(() => {
    setPreviewUri(null);
    setPending({ kind: "remove" });
  }, []);

  const doPickFromCamera = useCallback(async () => {
    if (!plantId) return;

    const ok = await ensureAndroidPermissionCameraAndRead();
    if (!ok) return;

    const opts: CameraOptions = {
      mediaType: "photo",
      saveToPhotos: false,
      includeBase64: false,
      quality: 0.92,
    };

    const res = await launchCamera(opts);
    if (res.didCancel) return;
    if (res.errorCode) return;

    const asset = res.assets?.[0];
    const uri = asset?.uri;
    if (!uri) return;

    setPendingSet(uri);
  }, [plantId, setPendingSet]);

  const doPickFromGallery = useCallback(async () => {
    if (!plantId) return;

    const ok = await ensureAndroidPermissionCameraAndRead();
    if (!ok) return;

    const opts: ImageLibraryOptions = {
      mediaType: "photo",
      selectionLimit: 1,
      includeBase64: false,
      quality: 0.92,
    };

    const res = await launchImageLibrary(opts);
    if (res.didCancel) return;
    if (res.errorCode) return;

    const asset = res.assets?.[0];
    const uri = asset?.uri;
    if (!uri) return;

    setPendingSet(uri);
  }, [plantId, setPendingSet]);

  const requestRemove = useCallback(() => {
    if (!plantId) return;
    setConfirmRemoveVisible(true);
  }, [plantId]);

  const applyChanges = useCallback(async () => {
    if (!plantId) return;

    if (pending.kind === "none") {
      onClose();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const existing = await getPlantPhotoUri(String(plantId));
      if (existing) await deleteLocalPhoto(stripQuery(existing));

      if (pending.kind === "remove") {
        setPersistedUri(null);
        setPreviewUri(null);
        setPending({ kind: "none" });
        initialPersistedUriRef.current = null;

        onChanged?.(null);
        onClose();
        return;
      }

      // set
      const tmp = await persistTempPlantPhoto({
        sourceUri: pending.uri,
        fileNameHint: undefined,
        tempKey: genTempKey(),
      });

      const finalUri = await promoteTempPhotoToPlant({
        tempPhotoUri: tmp,
        plantId: String(plantId),
      });

      const bustedFinal = withCacheBuster(finalUri);

      setPersistedUri(bustedFinal);
      setPreviewUri(bustedFinal);
      setPending({ kind: "none" });
      initialPersistedUriRef.current = bustedFinal;

      onChanged?.(bustedFinal);
      onClose();
    } catch (e: any) {
      setError(e?.message || tr("plantDetailsModals.changeImage.saveFailedMsg", "Could not save this photo locally."));
    } finally {
      setLoading(false);
    }
  }, [plantId, pending, onChanged, onClose, tr]);

  const discardChanges = useCallback(() => {
    const orig = initialPersistedUriRef.current;
    setPersistedUri(orig);
    setPreviewUri(orig);
    setPending({ kind: "none" });
    setConfirmDiscardVisible(false);
    onClose();
  }, [onClose]);

  // Hide "Remove" once removal is initiated
  const canRemove = useMemo(() => {
    if (loading) return false;
    if (pending.kind === "remove") return false;
    return !!previewUri || !!persistedUri;
  }, [previewUri, persistedUri, loading, pending.kind]);

  const canSave = useMemo(() => pending.kind !== "none" && !loading, [pending.kind, loading]);

  if (!visible) return null;

  return (
    <>
      <Pressable style={styles.backdrop} onPress={close} />

      <View
        style={[
          styles.wrap,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
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
            <View style={[styles.spinnerBox, { paddingBottom: scrollPadBottom }]}>
              <CenteredSpinner size={42} />
            </View>
          ) : error ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: scrollPadBottom }}
            >
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>{tr("plantDetailsModals.changeImage.error", "Something went wrong.")}</Text>
                <Text style={[styles.stateText, { opacity: 0.9 }]}>{error}</Text>
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: scrollPadBottom }}
            >
              <View style={styles.headerRow}>
                <MaterialCommunityIcons name="image-edit-outline" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
                <Text style={styles.title} numberOfLines={2}>
                  {tr("plantDetailsModals.changeImage.title", "Change image")}
                </Text>
              </View>

              <Text style={styles.desc}>
                {tr("plantDetailsModals.changeImage.subtitle", "This photo is stored locally on your device and is not uploaded.")}
              </Text>

              <View style={styles.previewFrame}>
                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View style={styles.previewEmpty}>
                    <MaterialCommunityIcons name="image-plus" size={28} color="#FFFFFF" />
                    <Text style={styles.previewEmptyText}>
                      {pending.kind === "remove"
                        ? tr("plantDetailsModals.changeImage.removedPreview", "Photo will be removed")
                        : tr("plantDetailsModals.changeImage.noPhoto", "No photo selected")}
                    </Text>
                  </View>
                )}
              </View>

              {pending.kind !== "none" && (
                <View style={styles.unsavedPill}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.unsavedText}>{tr("plantDetailsModals.changeImage.unsaved", "Unsaved changes")}</Text>
                </View>
              )}

              <View style={styles.actions}>
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
            </ScrollView>
          )}

          <View style={[styles.bottomBar, { paddingBottom: bottomGap }]}>
            <View style={styles.bottomRow}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={close} disabled={loading}>
                <Text style={styles.btnText}>{tr("plantDetailsModals.common.close", "Close")}</Text>
              </Pressable>

              <Pressable style={[styles.btn, styles.btnPrimary, !canSave && { opacity: 0.55 }]} onPress={applyChanges} disabled={!canSave}>
                <Text style={[styles.btnText, styles.btnPrimaryText]}>{tr("plantDetailsModals.common.save", "Save")}</Text>
              </Pressable>
            </View>
          </View>

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
    maxHeight: "100%",
  },

  spinnerBox: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 22,
  },

  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, marginBottom: 6 },
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
    borderWidth: 1,
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

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    zIndex: 999,
    elevation: 999,
    backgroundColor: "transparent",
  },
  bottomRow: { flexDirection: "row", gap: 10 },

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

  // custom confirm sheet (NO dimming backdrop)
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
    elevation: 1200,
    justifyContent: "flex-end",
  },
  confirmCard: {
    margin: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(0,0,0,1)",
    borderWidth: 1,
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
