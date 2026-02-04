import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";
import { fetchPlantProfile } from "../../../../api/services/plant-definitions.service";

import { wiz } from "../../styles/wizard.styles";
import { s as remindersStyles } from "../../../reminders/styles/reminders.styles";
import type { Suggestion } from "../../types/create-plant.types";
import {
  recognizePlantFromUri,
  type ApiRecognitionResult,
} from "../../../../api/services/plant-recognition.service";

import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { useSettings } from "../../../../app/providers/SettingsProvider";

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

// Create a wrapper component that ensures translations are ready
const TranslatedText = ({
  tKey,
  children,
  style,
  variant,
}: {
  tKey: string;
  children?: any;
  style?: any;
  variant?: "title" | "subtitle" | "body";
}) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  // Use currentLanguage to force re-render when language changes
  React.useMemo(() => {}, [currentLanguage]);

  try {
    const text = t(tKey);

    // Treat "key echo" as missing translation
    const isMissing = !text || text === tKey;
    const fallbackText = tKey.split(".").pop() || tKey;

    return <Text style={style}>{isMissing ? fallbackText : text}</Text>;
  } catch {
    const fallbackText = tKey.split(".").pop() || tKey;
    return <Text style={style}>{fallbackText}</Text>;
  }
};

export default function PlantScannerModal({
  visible,
  onClose,
  onPlantDetected,
}: Props) {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
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

  // Safe translation function that treats key-echo as missing
  const getTranslation = useCallback(
    (key: string, fallback?: string): string => {
      try {
        const translation = t(key);
        const isMissing = !translation || translation === key;

        return (
          (isMissing ? undefined : translation) ||
          fallback ||
          key.split(".").pop() ||
          key
        );
      } catch (err) {
        console.warn("Translation error for key:", key, err);
        return fallback || key.split(".").pop() || key;
      }
    },
    [t, currentLanguage]
  );

  // Debug: Log when component renders with current language
  React.useEffect(() => {
    if (visible) {
      console.log("PlantScannerModal rendering with language:", currentLanguage);
    }
  }, [currentLanguage, visible]);

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

  const handleSelectCandidate = async (item: ApiRecognitionResult) => {
    const plant = toSuggestion(item);

    // use backend-normalized key (matches PlantDefinition.external_id)
    const key = item.external_id;

    console.log("Fetching plant profile for key:", key);

    try {
      const plantProfile = await fetchPlantProfile(key, {
        auth: true,
        lang: currentLanguage,
      });

      onPlantDetected?.({
        ...plant,
        // display latin comes from the profile (canonical)
        latin: plantProfile.latin,
        ...plantProfile,
      });

      onClose();
    } catch (error: any) {
      console.error("Error while fetching plant profile for key:", key, error);

      Alert.alert(
        "Plant Recognition Error",
        `Failed to fetch plant details for ${key}. ${error?.message || "Please try again."}`
      );
    }
  };

  const doLaunchCamera = async () => {
    try {
      setError(null);
      setCandidates(null);
      setIsPicking(true);

      const ok = await ensureAndroidPermissionCameraAndRead();
      if (!ok) {
        Alert.alert(
          getTranslation(
            "createPlant.scannerModal.cameraRequired",
            "Permission required"
          ),
          getTranslation(
            "createPlant.scannerModal.cameraPermissionMessage",
            "Please grant camera and media permissions to take a photo."
          )
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
        Alert.alert(
          getTranslation("createPlant.scannerModal.cameraError", "Camera error"),
          String(res.errorMessage)
        );
        return;
      }

      const uri = res.assets?.[0]?.uri;
      if (uri) setPhotoUri(uri);
    } catch {
      setError(
        getTranslation(
          "createPlant.scannerModal.cameraFailure",
          "Failed to open camera."
        )
      );
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
          getTranslation(
            "createPlant.scannerModal.libraryRequired",
            "Permission required"
          ),
          getTranslation(
            "createPlant.scannerModal.libraryPermissionMessage",
            "Please grant media permissions to pick a photo."
          )
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
        Alert.alert(
          getTranslation("createPlant.scannerModal.libraryError", "Picker error"),
          String(res.errorMessage)
        );
        return;
      }

      const uri = res.assets?.[0]?.uri;
      if (uri) setPhotoUri(uri);
    } catch {
      setError(
        getTranslation(
          "createPlant.scannerModal.libraryFailure",
          "Failed to open gallery."
        )
      );
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
        setError(
          getTranslation(
            "createPlant.scannerModal.noResults",
            "No results returned. Try a clearer photo."
          )
        );
        return;
      }

      setCandidates(results);
    } catch (e: any) {
      setCandidates(null);
      setError(
        e?.message ??
          (e?.response?.data?.detail as string) ??
          getTranslation(
            "createPlant.scannerModal.recognitionFailure",
            "Failed to recognize the plant."
          )
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
            {/* Title */}
            <Text style={[remindersStyles.promptTitle, { paddingHorizontal: 0 }]}>
              {stage === "photo"
                ? getTranslation("createPlant.scannerModal.title", "Scan Plant")
                : getTranslation(
                    "createPlant.scannerModal.selectPlant",
                    "Select the detected plant"
                  )}
            </Text>

            {stage === "photo" ? (
              <>
                {/* Subtitle */}
                <TranslatedText
                  tKey="createPlant.scannerModal.scanInstructions"
                  style={wiz.subtitle}
                />

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
                      <Text style={styles.previewText}>
                        {getTranslation(
                          "createPlant.scannerModal.noPhoto",
                          "No photo selected"
                        )}
                      </Text>
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
                    <Text style={styles.actionLabel}>
                      {getTranslation("createPlant.scannerModal.takePhoto", "Take a photo")}
                    </Text>
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
                    <Text style={styles.actionLabel}>
                      {getTranslation("createPlant.scannerModal.fromGallery", "From gallery")}
                    </Text>
                  </Pressable>
                </View>

                {/* Recognize button */}
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
                        {getTranslation("createPlant.scannerModal.recognize", "Recognize plant")}
                      </Text>
                    </>
                  )}
                </Pressable>

                {error && (
                  <Text style={[wiz.subtitle, { color: "#ffdddd", marginTop: 10 }]}>
                    {error}
                  </Text>
                )}

                {/* Close button */}
                <View style={styles.bottomRowFull}>
                  <Pressable
                    style={[styles.bottomBtn, { flex: 1 }]}
                    onPress={() => {
                      if (!busy) onClose();
                    }}
                  >
                    <Text style={styles.bottomBtnText}>
                      {getTranslation("createPlant.scannerModal.close", "Close")}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                {/* Results view subtitle */}
                <TranslatedText
                  tKey="createPlant.scannerModal.selectPlant"
                  style={wiz.subtitle}
                />

                {/* Preview mini */}
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
                        <Text style={styles.previewText}>
                          {getTranslation(
                            "createPlant.scannerModal.noPhoto",
                            "No photo selected"
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Candidates list */}
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

                {/* Bottom buttons: Back + Close */}
                <View style={styles.bottomRowFull}>
                  <Pressable
                    style={[styles.bottomBtn, { flex: 1 }]}
                    onPress={() => {
                      if (busy) return;
                      setCandidates(null);
                      setError(null);
                    }}
                  >
                    <Text style={styles.bottomBtnText}>
                      {getTranslation("createPlant.scannerModal.back", "Back")}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.bottomBtn, { flex: 1 }]}
                    onPress={() => {
                      if (!busy) onClose();
                    }}
                  >
                    <Text style={styles.bottomBtnText}>
                      {getTranslation("createPlant.scannerModal.close", "Close")}
                    </Text>
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

  bottomRowFull: {
    marginTop: 14,
    flexDirection: "row",
    width: "100%",
    gap: 10,
    paddingBottom: 12,
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
