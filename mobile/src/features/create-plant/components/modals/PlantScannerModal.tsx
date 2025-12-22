// components/modals/PlantScannerModal.tsx
import React, { useState, useEffect, useMemo } from "react";
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
import {
  recognizePlantFromUri,
  type ApiRecognitionResult,
} from "../../../../api/services/plant-recognition.service";

import { launchCamera, launchImageLibrary } from "react-native-image-picker";

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

function toPercent(prob01: number | undefined | null): string | null {
  if (prob01 === null || prob01 === undefined) return null;
  const n = Number(prob01);
  if (!Number.isFinite(n)) return null;

  const pct = Math.max(0, Math.min(1, n)) * 100;
  const rounded = Math.round(pct);
  if (Math.abs(pct - rounded) < 0.05) return `${rounded}%`;
  return `${Math.round(pct * 10) / 10}%`;
}

function toSuggestion(item: ApiRecognitionResult): Suggestion {
  return {
    id: item.id ?? `ml:${item.latin}`,
    name: item.name,
    latin: item.latin,
  } as Suggestion;
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

  const [candidates, setCandidates] = useState<ApiRecognitionResult[] | null>(
    null
  );

  const busy = isPicking || isRecognizing;

  const stage: "photo" | "results" = useMemo(
    () => (candidates && candidates.length > 0 ? "results" : "photo"),
    [candidates]
  );

  useEffect(() => {
    if (visible) {
      setPhotoUri(null);
      setError(null);
      setIsPicking(false);
      setIsRecognizing(false);
      setCandidates(null);
    }
  }, [visible]);

  if (!visible) return null;

  const handleSelectCandidate = (item: ApiRecognitionResult) => {
    onPlantDetected?.(toSuggestion(item));
    onClose();
  };

  const doLaunchCamera = async () => {
    try {
      setError(null);
      setCandidates(null);
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
    } catch {
      setError("Failed to open camera.");
    } finally {
      setIsPicking(false);
    }
  };

  const doLaunchLibrary = async () => {
    try {
      setError(null);
      setCandidates(null);
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
    } catch {
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

      const resp = await recognizePlantFromUri(photoUri, { auth: true, topk: 3 });
      const results = (resp?.results ?? []).slice(0, 3);

      if (results.length === 0) {
        setCandidates(null);
        setError("No results returned. Try a clearer photo.");
        return;
      }

      setCandidates(results);
    } catch (e: any) {
      console.log("Recognition error", e);
      setCandidates(null);
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
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={[remindersStyles.promptTitle, { paddingHorizontal: 0 }]}>
              {stage === "photo" ? "Scan plant" : "Select the detected plant"}
            </Text>

            {stage === "photo" ? (
              <>
                <Text style={wiz.subtitle}>
                  Take a photo or choose one from your gallery. Please use a clear,
                  good-quality image that shows the plant’s leaf shape well, centered
                  and not blocked by other plants or objects.
                </Text>

                {/* Preview */}
                <View style={[wiz.hero, styles.previewFrame]}>
                  {photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.previewPlaceholder}>
                      <MaterialCommunityIcons
                        name="image-plus"
                        size={28}
                        color="#FFFFFF"
                      />
                      <Text style={styles.previewText}>No photo selected</Text>
                    </View>
                  )}
                </View>

                {/* Actions row */}
                <View style={styles.actionsRow}>
                  <Pressable
                    disabled={busy}
                    style={[styles.actionCard, busy && { opacity: 0.6 }]}
                    onPress={doLaunchCamera}
                  >
                    <MaterialCommunityIcons name="camera" size={24} color="#FFFFFF" />
                    <Text style={styles.actionLabel}>Take a photo</Text>
                  </Pressable>

                  <Pressable
                    disabled={busy}
                    style={[styles.actionCard, busy && { opacity: 0.6 }]}
                    onPress={doLaunchLibrary}
                  >
                    <MaterialCommunityIcons
                      name="image-multiple"
                      size={24}
                      color="#FFFFFF"
                    />
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
                      <Text style={[wiz.actionText, { opacity: !photoUri ? 0.55 : 1 }]}>
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

                {/* Close */}
                <View style={styles.bottomRowFull}>
                  <Pressable
                    style={[styles.bottomBtn, { flex: 1 }]}
                    onPress={() => {
                      if (!busy) onClose();
                    }}
                  >
                    <Text style={styles.bottomBtnText}>Close</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={wiz.subtitle}>
                  We found a few possible matches. Pick one to prefill plant details.
                </Text>

                {/* Preview */}
                <View style={styles.previewMiniWrap}>
                  <View style={styles.previewMiniFrame}>
                    {photoUri ? (
                      <Image
                        source={{ uri: photoUri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.previewPlaceholder}>
                        <MaterialCommunityIcons
                          name="image-plus"
                          size={22}
                          color="#FFFFFF"
                        />
                        <Text style={styles.previewText}>No photo</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Candidates */}
                <View style={{ marginTop: 12, gap: 10 }}>
                  {(candidates ?? []).slice(0, 3).map((item, idx) => {
                    const pct = toPercent(item.probability ?? item.confidence);
                    return (
                      <Pressable
                        key={`${item.latin}-${idx}`}
                        onPress={() => handleSelectCandidate(item)}
                        style={styles.candidateCard}
                        android_ripple={{ color: "rgba(255,255,255,0.10)" }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.candidateName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          {!!item.latin && (
                            <Text style={styles.candidateLatin} numberOfLines={1}>
                              {item.latin}
                            </Text>
                          )}
                        </View>

                        <View style={styles.candidateRight}>
                          {pct ? (
                            <View style={styles.pill}>
                              <Text style={styles.pillText}>{pct}</Text>
                            </View>
                          ) : null}
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={22}
                            color="rgba(255,255,255,0.9)"
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {error && (
                  <Text style={[wiz.subtitle, { color: "#ffdddd", marginTop: 10 }]}>
                    {error}
                  </Text>
                )}

                {/* Bottom buttons: Back + Close (50/50, full width) */}
                <View style={styles.bottomRowFull}>
                  <Pressable
                    style={[styles.bottomBtn, { flex: 1 }]}
                    onPress={() => {
                      if (busy) return;
                      setCandidates(null);
                      setError(null);
                    }}
                  >
                    <Text style={styles.bottomBtnText}>Back</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.bottomBtn, { flex: 1 }]}
                    onPress={() => {
                      if (!busy) onClose();
                    }}
                  >
                    <Text style={styles.bottomBtnText}>Close</Text>
                  </Pressable>
                </View>
              </>
            )}
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
    // IMPORTANT: no extra bottom padding (prevents "empty bar" feeling)
    paddingBottom: 0,
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

  previewMiniWrap: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewMiniFrame: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  candidateCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  candidateName: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  candidateLatin: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontWeight: "600",
    fontSize: 13,
  },
  candidateRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(11,114,133,0.35)",
    borderWidth: 1,
    borderColor: "rgba(11,114,133,0.65)",
  },
  pillText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },

  // Full-width bottom buttons row
  bottomRowFull: {
    marginTop: 14,
    flexDirection: "row",
    width: "100%",
    gap: 10,
    paddingBottom: 12, // small breathing room
  },
  bottomBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  bottomBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
});
