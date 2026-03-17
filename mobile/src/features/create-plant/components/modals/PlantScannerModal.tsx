import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
    Number(Platform.Version) >= 33
      ? (PermissionsAndroid.PERMISSIONS as any).READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
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

function toPercentNumber(prob01: number | undefined | null): number {
  if (prob01 === null || prob01 === undefined) return 0;
  const n = Number(prob01);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n)) * 100;
}

function toSuggestion(item: ApiRecognitionResult): Suggestion {
  return {
    id: item.id ?? `ml:${item.latin}`,
    name: item.name,
    latin: item.latin,
  } as Suggestion;
}

const TranslatedText = ({
  text,
  style,
}: {
  text: string;
  style?: any;
}) => {
  return <Text style={style}>{text}</Text>;
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
  const scrollRef = useRef<ScrollView>(null);

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

  const closestMatch = candidates?.[0] ?? null;

  const getTranslation = useCallback(
    (key: string, fallback: string): string => {
      const translated = t(key, { defaultValue: fallback });
      if (!translated || translated === key) return fallback;
      return translated;
    },
    [t, currentLanguage]
  );

  const i18nText = useMemo(
    () => ({
      title: getTranslation("createPlant.scannerModal.title", "Scan Plant"),
      selectPlant: getTranslation(
        "createPlant.scannerModal.selectPlant",
        "Select the detected plant"
      ),
      scanInstructions: getTranslation(
        "createPlant.scannerModal.scanInstructions",
        "Take a photo or choose one from your gallery. Please use a clear, good-quality image that shows the plant's leaf shape well, centered and not blocked by other plants or objects."
      ),
      noPhoto: getTranslation(
        "createPlant.scannerModal.noPhoto",
        "No photo selected"
      ),
      takePhoto: getTranslation(
        "createPlant.scannerModal.takePhoto",
        "Take a photo"
      ),
      fromGallery: getTranslation(
        "createPlant.scannerModal.fromGallery",
        "From gallery"
      ),
      recognize: getTranslation(
        "createPlant.scannerModal.recognize",
        "Recognize plant"
      ),
      cameraRequired: getTranslation(
        "createPlant.scannerModal.cameraRequired",
        "Permission required"
      ),
      cameraPermissionMessage: getTranslation(
        "createPlant.scannerModal.cameraPermissionMessage",
        "Please grant camera and media permissions to take a photo."
      ),
      libraryRequired: getTranslation(
        "createPlant.scannerModal.libraryRequired",
        "Permission required"
      ),
      libraryPermissionMessage: getTranslation(
        "createPlant.scannerModal.libraryPermissionMessage",
        "Please grant media permissions to pick a photo."
      ),
      cameraError: getTranslation(
        "createPlant.scannerModal.cameraError",
        "Camera error"
      ),
      libraryError: getTranslation(
        "createPlant.scannerModal.libraryError",
        "Picker error"
      ),
      cameraFailure: getTranslation(
        "createPlant.scannerModal.cameraFailure",
        "Failed to open camera."
      ),
      libraryFailure: getTranslation(
        "createPlant.scannerModal.libraryFailure",
        "Failed to open gallery."
      ),
      recognitionFailure: getTranslation(
        "createPlant.scannerModal.recognitionFailure",
        "Failed to recognize the plant."
      ),
      noResults: getTranslation(
        "createPlant.scannerModal.noResults",
        "No results returned. Try a clearer photo."
      ),
      resultsDescription: getTranslation(
        "createPlant.scannerModal.resultsDescription",
        "These are the top 3 matches based on the provided picture. Tap one of the 3 images below to select the plant definition."
      ),
      matchRate: getTranslation(
        "createPlant.scannerModal.matchRate",
        "Match rate"
      ),
      closestMatch: getTranslation(
        "createPlant.scannerModal.closestMatch",
        "Closest match"
      ),
      back: getTranslation("createPlant.scannerModal.back", "Back"),
      close: getTranslation("createPlant.scannerModal.close", "Close"),
      plantRecognitionErrorTitle: getTranslation(
        "createPlant.scannerModal.plantRecognitionErrorTitle",
        "Plant Recognition Error"
      ),
      plantRecognitionErrorMessage: getTranslation(
        "createPlant.scannerModal.plantRecognitionErrorMessage",
        "Failed to fetch plant details for {{key}}. {{message}}"
      ),
      tryAgain: getTranslation(
        "createPlant.scannerModal.tryAgain",
        "Please try again."
      ),
    }),
    [getTranslation]
  );

  useEffect(() => {
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
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
    }
  }, [stage, visible]);

  if (!visible) return null;

  const handleSelectCandidate = async (item: ApiRecognitionResult) => {
    const plant = toSuggestion(item);
    const key = item.external_id;

    console.log("Fetching plant profile for key:", key);

    try {
      const plantProfile = await fetchPlantProfile(key, {
        auth: true,
        lang: currentLanguage,
      });

      onPlantDetected?.({
        ...plant,
        latin: plantProfile.latin,
        ...plantProfile,
      });

      onClose();
    } catch (error: any) {
      console.error("Error while fetching plant profile for key:", key, error);

      Alert.alert(
        i18nText.plantRecognitionErrorTitle,
        t("createPlant.scannerModal.plantRecognitionErrorMessage", {
          key,
          message: error?.message || i18nText.tryAgain,
          defaultValue: `Failed to fetch plant details for ${key}. ${
            error?.message || i18nText.tryAgain
          }`,
        })
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
        Alert.alert(i18nText.cameraRequired, i18nText.cameraPermissionMessage);
        return;
      }

      const res = await launchCamera({
        mediaType: "photo",
        includeBase64: false,
        quality: 0.92,
      });

      if (res.didCancel) return;

      if (res.errorCode) {
        Alert.alert(i18nText.cameraError, String(res.errorMessage));
        return;
      }

      const uri = res.assets?.[0]?.uri;
      if (uri) {
        setPhotoUri(uri);
        setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
      }
    } catch {
      setError(i18nText.cameraFailure);
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
        Alert.alert(i18nText.libraryRequired, i18nText.libraryPermissionMessage);
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
        Alert.alert(i18nText.libraryError, String(res.errorMessage));
        return;
      }

      const uri = res.assets?.[0]?.uri;
      if (uri) {
        setPhotoUri(uri);
        setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
      }
    } catch {
      setError(i18nText.libraryFailure);
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
        setError(i18nText.noResults);
        return;
      }

      setCandidates(results);
      setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 0);
    } catch (e: any) {
      setCandidates(null);
      setError(
        e?.message ??
          (e?.response?.data?.detail as string) ??
          i18nText.recognitionFailure
      );
    } finally {
      setIsRecognizing(false);
    }
  };

  return (
    <>
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
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[
                remindersStyles.promptTitle,
                styles.modalTitle,
                stage === "results" ? styles.resultsTitle : null,
              ]}
            >
              {stage === "photo" ? i18nText.title : i18nText.selectPlant}
            </Text>

            {stage === "photo" ? (
              <>
                <TranslatedText text={i18nText.scanInstructions} style={wiz.subtitle} />

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
                      <Text style={styles.previewText}>{i18nText.noPhoto}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.actionsRow}>
                  <Pressable
                    disabled={busy}
                    style={[styles.actionCard, busy && { opacity: 0.6 }]}
                    onPress={doLaunchCamera}
                  >
                    <MaterialCommunityIcons name="camera" size={24} color="#FFFFFF" />
                    <Text style={styles.actionLabel}>{i18nText.takePhoto}</Text>
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
                    <Text style={styles.actionLabel}>{i18nText.fromGallery}</Text>
                  </Pressable>
                </View>

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
                        {i18nText.recognize}
                      </Text>
                    </>
                  )}
                </Pressable>

                {error && (
                  <Text style={[wiz.subtitle, { color: "#ffdddd", marginTop: 10 }]}>
                    {error}
                  </Text>
                )}

                <View style={styles.bottomRowFull}>
                  <Pressable
                    style={[styles.bottomBtn, { flex: 1 }]}
                    onPress={() => {
                      if (!busy) onClose();
                    }}
                  >
                    <Text style={styles.bottomBtnText}>{i18nText.close}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={[wiz.subtitle, styles.resultsDescription]}>
                  {i18nText.resultsDescription}
                </Text>

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
                          size={28}
                          color="#FFFFFF"
                        />
                        <Text style={styles.previewText}>{i18nText.noPhoto}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.previewArrowWrap}>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={34}
                      color="rgba(255,255,255,0.95)"
                    />
                  </View>

                  <View style={styles.closestMatchFrame}>
                    {closestMatch?.image_thumb ? (
                      <Image
                        source={{ uri: closestMatch.image_thumb }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.candidateImagePlaceholder}>
                        <MaterialCommunityIcons
                          name="leaf"
                          size={28}
                          color="rgba(255,255,255,0.9)"
                        />
                      </View>
                    )}

                    <View style={styles.closestMatchBadge}>
                      <Text style={styles.closestMatchBadgeText}>
                        {i18nText.closestMatch}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: 12, gap: 10 }}>
                  {(candidates ?? []).slice(0, 3).map((item, idx) => {
                    const pct = toPercent(item.probability ?? item.confidence);
                    const pctValue = toPercentNumber(
                      item.probability ?? item.confidence
                    );

                    return (
                      <Pressable
                        key={`${item.latin}-${idx}`}
                        onPress={() => handleSelectCandidate(item)}
                        style={styles.candidateCard}
                        android_ripple={{ color: "rgba(255,255,255,0.10)" }}
                      >
                        <View style={styles.candidateImageWrap}>
                          {item.image_thumb ? (
                            <Image
                              source={{ uri: item.image_thumb }}
                              style={styles.candidateImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.candidateImagePlaceholder}>
                              <MaterialCommunityIcons
                                name="leaf"
                                size={28}
                                color="rgba(255,255,255,0.9)"
                              />
                            </View>
                          )}
                        </View>

                        <View style={styles.candidateContent}>
                          <Text style={styles.candidateLatin} numberOfLines={1}>
                            {item.latin || item.name}
                          </Text>

                          <View style={styles.matchMetaRow}>
                            <Text style={styles.matchLabelText}>
                              {i18nText.matchRate}
                            </Text>
                          </View>

                          <View style={styles.matchBarTrack}>
                            <View
                              style={[
                                styles.matchBarFill,
                                { width: `${pctValue}%` },
                              ]}
                            />
                            <View style={styles.matchBarTextOverlay}>
                              <Text style={styles.matchPercentText}>
                                {pct ?? "0%"}
                              </Text>
                            </View>
                          </View>
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

                <View style={styles.bottomRowFull}>
                  <Pressable
                    style={[styles.bottomBtn, { flex: 1 }]}
                    onPress={() => {
                      if (busy) return;
                      setCandidates(null);
                      setError(null);
                      setTimeout(
                        () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
                        0
                      );
                    }}
                  >
                    <Text style={styles.bottomBtnText}>{i18nText.back}</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.bottomBtn, { flex: 1 }]}
                    onPress={() => {
                      if (!busy) onClose();
                    }}
                  >
                    <Text style={styles.bottomBtnText}>{i18nText.close}</Text>
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
  },

  modalTitle: {
    paddingHorizontal: 0,
    marginLeft: 2,
  },

  resultsTitle: {},

  resultsDescription: {
    marginTop: 2,
    marginBottom: 10,
    paddingHorizontal: 2,
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
    width: "100%",
    gap: 12,
  },
  previewMiniFrame: {
    flex: 43,
    aspectRatio: 0.92,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  previewArrowWrap: {
    flex: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  closestMatchFrame: {
    flex: 43,
    aspectRatio: 0.92,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    position: "relative",
  },
  closestMatchBadge: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  closestMatchBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },

  candidateCard: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
    gap: 14,
    minHeight: 92,
  },
  candidateImageWrap: {
    width: 84,
    height: 84,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  candidateImage: {
    width: "100%",
    height: "100%",
  },
  candidateImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  candidateContent: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  candidateName: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  candidateLatin: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  candidateRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 10,
  },
  matchMetaRow: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  matchLabelText: {
    color: "rgba(255,255,255,0.82)",
    fontWeight: "700",
    fontSize: 12,
  },
  matchBarTrack: {
    width: "100%",
    height: 20,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    position: "relative",
    justifyContent: "center",
  },
  matchBarFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    minWidth: 36,
    borderRadius: 999,
    backgroundColor: "rgba(11,114,133,0.95)",
  },
  matchBarTextOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  matchPercentText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
    lineHeight: 14,
    textAlign: "center",
    paddingVertical: 1,
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