// C:\Projekty\Python\Flovers\mobile\src\features\plant-details\screens\PlantDetailsScreen.tsx
import React, { useMemo, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  ScrollView,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import GlassHeader from "../../../shared/ui/GlassHeader";

import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK, TILE_BLUR } from "../constants/plant-details.constants";
import { s } from "../styles/plant-details.styles";

import { fetchPlantDetailsById, fetchPlantDetailsByQr } from "../../../api/services/plant-details.service";

import type { PlantMetricKey, PlantDetailsComposite, LatestReadings } from "../types/plant-details.types";

import PlantLatestReadingsTile from "../components/PlantLatestReadingsTile";
import PlantRemindersTile from "../components/PlantRemindersTile";
import PlantQrTile from "../components/PlantQrTile";
import PlantInfoTile from "../components/PlantInfoTile";

import CompleteTaskModal from "../../home/components/modals/CompleteTaskModal";
import { markHomeTaskComplete } from "../../../api/services/home.service";

import RNFS from "react-native-fs";
import CameraRoll from "@react-native-camera-roll/camera-roll";

import TopSnackbar from "../../../shared/ui/TopSnackbar";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";

export default function PlantDetailsScreen() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  const nav = useNavigation();
  const route = useRoute<any>();

  const qrFromNav: string | undefined = route.params?.qrCode;
  const idFromNav: number | undefined = route.params?.plantId ?? route.params?.id;

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<PlantDetailsComposite | null>(null);
  const [error, setError] = useState<string>("");

  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completeReminderId, setCompleteReminderId] = useState<string | null>(null);
  const [completeNote, setCompleteNote] = useState("");

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] = useState<"default" | "success" | "error">("default");

  const [refreshCounter, setRefreshCounter] = useState(0);
  const [dismissMenusTick, setDismissMenusTick] = useState(0);

  const scrollRef = useRef<ScrollView | null>(null);

  const showToast = (message: string, variant: "default" | "success" | "error" = "default") => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };

  const loadDetails = useCallback(async () => {
    if (!qrFromNav && !idFromNav) {
      throw new Error(tr("plantDetails.errors.noId", "No plant id or QR code provided."));
    }

    if (qrFromNav) {
      const full = await fetchPlantDetailsByQr(qrFromNav);
      setDetails(full);
    } else if (idFromNav) {
      const full = await fetchPlantDetailsById(Number(idFromNav));
      setDetails(full);
    }
  }, [qrFromNav, idFromNav, tr]);

  const qrCodeValue = useMemo(() => {
    const code = details?.plant.qr_code || qrFromNav || "";
    if (!code) return "";
    return `https://flovers.app/api/plant-instances/by-qr/?code=${encodeURIComponent(code)}`;
  }, [details, qrFromNav]);

  const onSaveQr = async (svgRef: any) => {
    if (!svgRef?.toDataURL) {
      throw new Error(tr("plantDetails.qrErrors.rendererNotReady", "QR renderer not ready."));
    }

    const dataUrl: string = await new Promise((res, rej) =>
      svgRef.toDataURL((d: string) => (d ? res(d) : rej(new Error("No dataURL"))))
    );

    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const filePath = `${RNFS.CachesDirectoryPath}/plant_qr_${Date.now()}.png`;
    await RNFS.writeFile(filePath, base64, "base64");

    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: tr("plantDetails.permissions.storage.title", "Storage permission"),
          message: tr(
            "plantDetails.permissions.storage.message",
            "We need access to save the QR code to your gallery."
          ),
          buttonPositive: tr("plantDetails.permissions.storage.ok", "OK"),
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error(tr("plantDetails.permissions.storage.denied", "Storage permission denied."));
      }
    }

    await CameraRoll.save(filePath, { type: "photo" });
  };

  const goHistory = (metric?: PlantMetricKey) => {
    nav.navigate(
      "ReadingsHistory" as never,
      {
        metric: metric || "temperature",
        range: "day",
        name:
          details?.plant.display_name ||
          details?.plant.plant_definition?.name ||
          tr("plantDetails.common.plant", "Plant"),
      } as never
    );
  };

  const entry = useRef(new Animated.Value(0)).current;
  const contentOpacity = entry;
  const contentTranslateY = entry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const contentScale = entry.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const run = async () => {
        try {
          setLoading(true);
          setError("");
          await loadDetails();
          if (isActive) {
            setRefreshCounter((c) => c + 1);
            requestAnimationFrame(() => {
              scrollRef.current?.scrollTo({ y: 0, animated: false });
            });
          }
        } catch (e: any) {
          if (!isActive) return;
          setError(e?.message || tr("plantDetails.errors.failedToLoad", "Failed to load plant."));
          setDetails(null);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      Animated.timing(entry, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      run();

      return () => {
        isActive = false;

        Animated.timing(entry, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start();

        setToastVisible(false);
        setCompleteModalVisible(false);
        setCompleteReminderId(null);
        setCompleteNote("");
      };
    }, [entry, loadDetails, tr])
  );

  const latestRead = details?.latestReadings ?? null;
  const reminders = details?.reminders ?? [];

  const showLatestReadingsTile = !!details && details.deviceLinked;

  const latestReadSafe: LatestReadings = latestRead ?? {
    temperature: null,
    humidity: null,
    light: null,
    moisture: null,
    tsISO: null,
  };

  const openCompleteModal = (reminderId: string) => {
    setCompleteReminderId(reminderId);
    setCompleteNote("");
    setCompleteModalVisible(true);
  };

  const closeCompleteModal = () => {
    setCompleteModalVisible(false);
    setCompleteReminderId(null);
    setCompleteNote("");
  };

  const handleConfirmComplete = async () => {
    if (!completeReminderId || !details) {
      closeCompleteModal();
      return;
    }

    try {
      setLoading(true);

      const r = details.reminders.find((x) => x.id === completeReminderId);
      if (r?.taskId) {
        await markHomeTaskComplete(r.taskId, completeNote);
      } else {
        // placeholder
      }

      closeCompleteModal();

      await loadDetails();
      setRefreshCounter((c) => c + 1);

      showToast(tr("plantDetails.toasts.reminderCompleted", "Reminder marked as complete."), "success");
    } catch (e: any) {
      closeCompleteModal();
      Alert.alert(
        tr("plantDetails.alerts.completeFailed.title", "Complete failed"),
        e?.message ? String(e.message) : tr("plantDetails.alerts.completeFailed.msg", "Could not complete this reminder.")
      );
    } finally {
      setLoading(false);
    }
  };

  const isInitialLoading = loading && !details && !error;

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title={tr("plantDetails.headerTitle", "Plant details")}
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

      <Animated.View
        style={{
          flex: 1,
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }, { scale: contentScale }],
        }}
      >
        {isInitialLoading ? (
          <CenteredSpinner />
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.title}>{tr("plantDetails.states.error.title", "Error")}</Text>
            <Text style={styles.dim}>{error}</Text>
          </View>
        ) : !details ? (
          <View style={styles.centerBox}>
            <Text style={styles.title}>{tr("plantDetails.states.notFound.title", "Not found")}</Text>
            <Text style={styles.dim}>
              {tr("plantDetails.states.notFound.msg", "We couldn’t load this plant.")}
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{
              paddingBottom: 24,
              paddingHorizontal: 16,
              paddingTop: 21,
            }}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => setDismissMenusTick((t) => t + 1)}
          >
            <GlassFrame>
              <PlantInfoTile plant={details.plant} />
            </GlassFrame>

            {reminders.length > 0 && (
              <PlantRemindersTile
                key={refreshCounter}
                collapseMenusSignal={dismissMenusTick}
                reminders={reminders}
                onMarkComplete={(reminderId) => openCompleteModal(reminderId)}
                onEditReminder={(reminderId) => {
                  nav.navigate("Reminders" as never, { editReminderId: String(reminderId) } as never);
                }}
                onShowHistory={() => {
                  nav.navigate("TaskHistory" as never, { plantId: String(details.plant.id) } as never);
                }}
              />
            )}

            {showLatestReadingsTile && (
              <PlantLatestReadingsTile
                latestReadings={latestReadSafe}
                sensors={details.sensors}
                onTilePress={() => goHistory()}
                onMetricPress={(metric) => goHistory(metric)}
              />
            )}

            {!!qrCodeValue && (
              <GlassFrame>
                <PlantQrTile
                  qrCodeValue={qrCodeValue}
                  onPressSave={async () => {
                    try {
                      await onSaveQr((global as any).__qrRef);
                      showToast(tr("plantDetails.toasts.qrSaved", "QR code saved to your gallery."), "success");
                    } catch (err: any) {
                      console.warn("[PlantDetails] save QR failed:", err);
                      showToast(err?.message || tr("plantDetails.toasts.qrSaveFailed", "Failed to save QR code."), "error");
                    }
                  }}
                  onPressEmail={() => {
                    showToast(
                      tr(
                        "plantDetails.toasts.qrEmailPlaceholder",
                        "An email with this QR code will be sent to your account address."
                      ),
                      "default"
                    );
                  }}
                />
              </GlassFrame>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>
        )}
      </Animated.View>

      {loading && details && !error && <CenteredSpinner overlay size={36} color="#FFFFFF" />}

      <CompleteTaskModal
        visible={completeModalVisible}
        note={completeNote}
        onChangeNote={setCompleteNote}
        onCancel={closeCompleteModal}
        onConfirm={handleConfirmComplete}
      />

      <TopSnackbar
        visible={toastVisible}
        message={toastMsg}
        variant={toastVariant}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}

function GlassFrame({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <View style={styles.frameWrap}>
      <View style={s.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={TILE_BLUR}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
        />
        <View pointerEvents="none" style={s.cardTint} />
        <View pointerEvents="none" style={s.cardBorder} />
      </View>
      <View style={[styles.frameInner, center && { alignItems: "center" }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerBox: { padding: 16, alignItems: "center", justifyContent: "center" },
  title: { color: "#FFFFFF", fontWeight: "800", fontSize: 18, marginBottom: 6 },

  frameWrap: {
    borderRadius: 28,
    overflow: "visible",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    marginBottom: 14,
  },
  frameInner: { padding: 16 },

  h1: { color: "#FFFFFF", fontWeight: "800", fontSize: 20, marginBottom: 6 },
  h2: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, marginBottom: 8 },

  latin: {
    color: "rgba(255,255,255,0.9)",
    fontStyle: "italic",
    fontWeight: "600",
    fontSize: 12,
    marginBottom: 4,
  },
  sub: { color: "rgba(255,255,255,0.9)", fontWeight: "600", fontSize: 12, marginBottom: 10 },
  dim: { color: "rgba(255,255,255,0.92)", fontWeight: "600" },

  infoGrid: { gap: 8, marginTop: 6 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoLabel: { color: "#FFFFFF", fontWeight: "800", marginRight: 6 },
  infoValue: { color: "rgba(255,255,255,0.95)", fontWeight: "600", flex: 1 },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  linkBtn: { paddingVertical: 4, paddingHorizontal: 6 },
  linkText: { color: "#FFFFFF", fontWeight: "800", textDecorationLine: "underline" },

  lastRead: { color: "rgba(255,255,255,0.85)", fontWeight: "600", fontSize: 12, marginTop: 6 },

  remRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  remIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  remTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  remWhen: { color: "rgba(255,255,255,0.9)", fontWeight: "600", fontSize: 12 },
});
