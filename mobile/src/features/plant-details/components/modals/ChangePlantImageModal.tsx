// ChangePlantImageModal.tsx
// C:\Projekty\Python\Flovers\mobile\src\features\plant-details\components\modals\ChangePlantImageModal.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Keyboard,
  Alert,
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

/** ✅ RN Image cache-buster for local file URIs */
function withCacheBuster(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const sep = uri.includes("?") ? "&" : "?";
  return `${uri}${sep}t=${Date.now()}`;
}

/** ✅ deleteLocalPhoto must receive the real file uri/path (no query params) */
function stripQuery(uri: string): string {
  return uri.split("?")[0];
}

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
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  // load existing local photo when opened
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!visible) return;
      setError(null);
      setLoading(true);

      try {
        if (!plantId) {
          setLocalUri(null);
          setError(tr("plantDetailsModals.changeImage.noPlantId", "No plant id found."));
          return;
        }
        const existing = await getPlantPhotoUri(String(plantId));
        if (!cancelled) setLocalUri(withCacheBuster(existing || null));
      } catch (e: any) {
        if (!cancelled) {
          setLocalUri(null);
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

  const doPickFromCamera = useCallback(async () => {
    if (!plantId) {
      Alert.alert(tr("plantDetailsModals.changeImage.noPlantId", "No plant id found."));
      return;
    }

    const ok = await ensureAndroidPermissionCameraAndRead();
    if (!ok) {
      Alert.alert(
        tr("plantDetailsModals.changeImage.permissionTitle", "Permission required"),
        tr(
          "plantDetailsModals.changeImage.permissionCamera",
          "Please grant camera and media permissions to take a photo."
        )
      );
      return;
    }

    const opts: CameraOptions = {
      mediaType: "photo",
      saveToPhotos: false,
      includeBase64: false,
      quality: 0.92,
    };

    const res = await launchCamera(opts);
    if (res.didCancel) return;
    if (res.errorCode) {
      Alert.alert(
        tr("plantDetailsModals.changeImage.cameraErrorTitle", "Camera error"),
        String(res.errorMessage || res.errorCode)
      );
      return;
    }

    const asset = res.assets?.[0];
    const uri = asset?.uri;
    if (!uri) return;

    setLoading(true);
    setError(null);

    try {
      const existing = await getPlantPhotoUri(String(plantId));
      if (existing) await deleteLocalPhoto(stripQuery(existing));

      const tmp = await persistTempPlantPhoto({
        sourceUri: uri,
        fileNameHint: asset?.fileName,
        tempKey: genTempKey(),
      });

      const finalUri = await promoteTempPhotoToPlant({
        tempPhotoUri: tmp,
        plantId: String(plantId),
      });

      const busted = withCacheBuster(finalUri);
      setLocalUri(busted);
      onChanged?.(busted);
    } catch (e: any) {
      Alert.alert(
        tr("plantDetailsModals.changeImage.saveFailedTitle", "Save failed"),
        e?.message || tr("plantDetailsModals.changeImage.saveFailedMsg", "Could not save this photo locally.")
      );
    } finally {
      setLoading(false);
    }
  }, [plantId, tr, onChanged]);

  const doPickFromGallery = useCallback(async () => {
    if (!plantId) {
      Alert.alert(tr("plantDetailsModals.changeImage.noPlantId", "No plant id found."));
      return;
    }

    const ok = await ensureAndroidPermissionCameraAndRead();
    if (!ok) {
      Alert.alert(
        tr("plantDetailsModals.changeImage.permissionTitle", "Permission required"),
        tr("plantDetailsModals.changeImage.permissionGallery", "Please grant media permission to pick a photo.")
      );
      return;
    }

    const opts: ImageLibraryOptions = {
      mediaType: "photo",
      selectionLimit: 1,
      includeBase64: false,
      quality: 0.92,
    };

    const res = await launchImageLibrary(opts);
    if (res.didCancel) return;
    if (res.errorCode) {
      Alert.alert(
        tr("plantDetailsModals.changeImage.pickerErrorTitle", "Picker error"),
        String(res.errorMessage || res.errorCode)
      );
      return;
    }

    const asset = res.assets?.[0];
    const uri = asset?.uri;
    if (!uri) return;

    setLoading(true);
    setError(null);

    try {
      const existing = await getPlantPhotoUri(String(plantId));
      if (existing) await deleteLocalPhoto(stripQuery(existing));

      const tmp = await persistTempPlantPhoto({
        sourceUri: uri,
        fileNameHint: asset?.fileName,
        tempKey: genTempKey(),
      });

      const finalUri = await promoteTempPhotoToPlant({
        tempPhotoUri: tmp,
        plantId: String(plantId),
      });

      const busted = withCacheBuster(finalUri);
      setLocalUri(busted);
      onChanged?.(busted);
    } catch (e: any) {
      Alert.alert(
        tr("plantDetailsModals.changeImage.saveFailedTitle", "Save failed"),
        e?.message || tr("plantDetailsModals.changeImage.saveFailedMsg", "Could not save this photo locally.")
      );
    } finally {
      setLoading(false);
    }
  }, [plantId, tr, onChanged]);

  const doRemove = useCallback(async () => {
    if (!plantId) return;

    Alert.alert(
      tr("plantDetailsModals.changeImage.confirmRemoveTitle", "Remove photo?"),
      tr("plantDetailsModals.changeImage.confirmRemoveMsg", "This will remove the locally stored photo."),
      [
        { text: tr("plantDetailsModals.common.cancel", "Cancel"), style: "cancel" },
        {
          text: tr("plantDetailsModals.common.remove", "Remove"),
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              setError(null);

              const existing = await getPlantPhotoUri(String(plantId));
              if (existing) await deleteLocalPhoto(stripQuery(existing));

              setLocalUri(null);
              onChanged?.(null);
            } catch (e: any) {
              Alert.alert(
                tr("plantDetailsModals.changeImage.removeFailedTitle", "Remove failed"),
                e?.message || tr("plantDetailsModals.changeImage.removeFailedMsg", "Could not remove this local photo.")
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [plantId, tr, onChanged]);

  const canRemove = useMemo(() => !!localUri && !loading, [localUri, loading]);

  if (!visible) return null;

  return (
    <>
      <Pressable style={styles.backdrop} onPress={close} />

      <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
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
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: scrollPadBottom }}>
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>{tr("plantDetailsModals.changeImage.error", "Something went wrong.")}</Text>
                <Text style={[styles.stateText, { opacity: 0.9 }]}>{error}</Text>
              </View>
            </ScrollView>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: scrollPadBottom }}>
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
                {localUri ? (
                  <Image source={{ uri: localUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View style={styles.previewEmpty}>
                    <MaterialCommunityIcons name="image-plus" size={28} color="#FFFFFF" />
                    <Text style={styles.previewEmptyText}>{tr("plantDetailsModals.changeImage.noPhoto", "No photo selected")}</Text>
                  </View>
                )}
              </View>

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
                    onPress={doRemove}
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
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={close} disabled={loading}>
              <Text style={[styles.btnText, styles.btnPrimaryText]}>{tr("plantDetailsModals.common.close", "Close")}</Text>
            </Pressable>
          </View>
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
    paddingHorizontal: 24,
    zIndex: 999,
    elevation: 999,
    backgroundColor: "transparent",
  },

  btn: {
    alignSelf: "stretch",
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  btnText: { color: "#FFFFFF", fontWeight: "800" },
  btnPrimary: { backgroundColor: "rgba(11,114,133,0.92)" },
  btnPrimaryText: { color: "#FFFFFF", fontWeight: "800" },
});
