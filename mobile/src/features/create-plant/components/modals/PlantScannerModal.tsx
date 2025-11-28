// components/modals/PlantScannerModal.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Pressable,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { wiz } from "../../styles/wizard.styles";
import { s as remindersStyles } from "../../../reminders/styles/reminders.styles";
import type { Suggestion } from "../../types/create-plant.types";
import { recognizePlantFromUri } from "../../../../api/services/plant-recognition.service";

import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImageLibraryOptions,
} from "react-native-image-picker";

type Props = {
  visible: boolean;
  onClose: () => void;
  onPlantDetected?: (plant: Suggestion) => void;
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

export default function PlantScannerModal({
  visible,
  onClose,
  onPlantDetected,
}: Props) {
  const insets = useSafeAreaInsets();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = isPicking || isRecognizing;

  // RESET STATE WHEN OPENED
  useEffect(() => {
    if (visible) {
      setPhotoUri(null);
      setError(null);
      setIsPicking(false);
      setIsRecognizing(false);
    }
  }, [visible]);

  if (!visible) return null;

  const handleRecognitionSuccess = (plant: Suggestion) => {
    onPlantDetected?.(plant);
    onClose();
  };

  const doLaunchCamera = async () => {
    try {
      setError(null);
      setIsPicking(true);

      const ok = await ensureAndroidPermissionCameraAndRead();
      if (!ok) {
        Alert.alert(
          "Permission required",
          "Please grant camera and media permissions to take a photo."
        );
        return;
      }

      const res = await launchCamera({
        mediaType: "photo",
        includeBase64: false,
        quality: 0.92,
      });

      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert("Camera error", String(res.errorMessage));
        return;
      }

      const uri = res.assets?.[0]?.uri;
      if (uri) setPhotoUri(uri);
    } catch (e: any) {
      setError("Failed to open camera.");
    } finally {
      setIsPicking(false);
    }
  };

  const doLaunchLibrary = async () => {
    try {
      setError(null);
      setIsPicking(true);

      const ok = await ensureAndroidPermissionCameraAndRead();
      if (!ok) {
        Alert.alert(
          "Permission required",
          "Please grant media permissions to pick a photo."
        );
        return;
      }

      const res = await launchImageLibrary({
        mediaType: "photo",
        selectionLimit: 1,
        includeBase64: false,
        quality: 0.92,
      });

      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert("Picker error", String(res.errorMessage));
        return;
      }

      const uri = res.assets?.[0]?.uri;
      if (uri) setPhotoUri(uri);
    } catch (e: any) {
      setError("Failed to open gallery.");
    } finally {
      setIsPicking(false);
    }
  };

  const handleRecognize = async () => {
    if (!photoUri || isRecognizing) return;

    try {
      setError(null);
      setIsRecognizing(true);

      const suggestion = await recognizePlantFromUri(photoUri, { auth: true });

      handleRecognitionSuccess(suggestion);
    } catch (e: any) {
      console.log("Recognition error", e);
      setError(
        e?.message ??
        (e?.response?.data?.detail as string) ??
        "Failed to recognize the plant."
      );
    } finally {
      setIsRecognizing(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <Pressable
        style={remindersStyles.promptBackdrop}
        onPress={() => {
          if (!busy) onClose();
        }}
      />

      <View style={remindersStyles.promptWrap}>
        <View style={remindersStyles.promptGlass}>
          <BlurView
            style={{ position: "absolute", inset: 0 } as any}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          />
        </View>

        <View
          style={[
            remindersStyles.promptInner,
            { maxHeight: "86%", paddingBottom: insets.bottom || 12 },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 24 },
            ]}
          >
            {/* FIX: remove left padding from header */}
            <Text
              style={[
                remindersStyles.promptTitle,
                { paddingHorizontal: 0 }
              ]}
            >
              Scan plant
            </Text>

            <Text style={wiz.subtitle}>
              Take a photo or choose one from your gallery. We’ll try to
              recognize the plant and prefill its details.
            </Text>

            {/* Preview */}
            <View
              style={[
                wiz.hero,
                styles.previewFrame,
              ]}
            >
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <MaterialCommunityIcons name="image-plus" size={28} color="#FFFFFF" />
                  <Text style={styles.previewText}>No photo selected</Text>
                </View>
              )}
            </View>

            {/* Actions row */}
            <View style={styles.actionsRow}>
              <Pressable
                disabled={busy}
                style={styles.actionCard}
                onPress={doLaunchCamera}
              >
                <MaterialCommunityIcons name="camera" size={24} color="#FFFFFF" />
                <Text style={styles.actionLabel}>Take a photo</Text>
              </Pressable>

              <Pressable
                disabled={busy}
                style={styles.actionCard}
                onPress={doLaunchLibrary}
              >
                <MaterialCommunityIcons name="image-multiple" size={24} color="#FFFFFF" />
                <Text style={styles.actionLabel}>From gallery</Text>
              </Pressable>
            </View>

            {/* Recognize */}
            <Pressable
              disabled={!photoUri || isRecognizing}
              onPress={handleRecognize}
              style={[
                wiz.actionFull,
                {
                  marginTop: 12,
                  backgroundColor: "rgba(11,114,133,0.9)",
                  opacity: !photoUri || isRecognizing ? 0.45 : 1,
                },
              ]}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              {isRecognizing ? (
                <ActivityIndicator />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="leaf"
                    size={18}
                    color="#FFFFFF"
                    style={{ opacity: !photoUri ? 0.55 : 1 }}
                  />
                  <Text
                    style={[
                      wiz.actionText,
                      { opacity: !photoUri ? 0.55 : 1 }
                    ]}
                  >
                    Recognize plant
                  </Text>
                </>
              )}
            </Pressable>


            {error && (
              <Text style={[wiz.subtitle, { color: "#ffdddd", marginTop: 10 }]}>
                {error}
              </Text>
            )}

            {/* FIX: remove right margin of Close button */}
            <View style={[remindersStyles.promptButtonsRow, { marginRight: 0 }]}>
              <Pressable
                style={[remindersStyles.promptBtn, { marginRight: 0 }]}
                onPress={() => {
                  if (!busy) onClose();
                }}
              >
                <Text style={remindersStyles.promptBtnText}>Close</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  previewFrame: {
    marginTop: 8,
    marginBottom: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  previewPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  previewText: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 10,
  },
  actionCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  actionLabel: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
