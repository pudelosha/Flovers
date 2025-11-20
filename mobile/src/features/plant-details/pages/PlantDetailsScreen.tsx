// C:\Projekty\Python\Flovers\mobile\src\features\plant-details\screens\PlantDetailsScreen.tsx
import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
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
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";

import GlassHeader from "../../../shared/ui/GlassHeader";

import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
  TILE_BLUR,
} from "../constants/plant-details.constants";
import { s } from "../styles/plant-details.styles";

import {
  fetchPlantDetailsById,
  fetchPlantDetailsByQr,
} from "../../../api/services/plant-details.service";

import type {
  PlantMetricKey,
  PlantDetailsComposite,
  LatestReadings,
} from "../types/plant-details.types";

import PlantLatestReadingsTile from "../components/PlantLatestReadingsTile";
import PlantRemindersTile from "../components/PlantRemindersTile";
import PlantQrTile from "../components/PlantQrTile";
import PlantInfoTile from "../components/PlantInfoTile";

// Reuse CompleteTaskModal from Home for the "mark as complete" flow
import CompleteTaskModal from "../../home/components/CompleteTaskModal";

// If you want to hook into Home tasks for completion:
import { markHomeTaskComplete } from "../../../api/services/home.service";

// QR bits
import RNFS from "react-native-fs";
import CameraRoll from "@react-native-camera-roll/camera-roll";

// Shared toast
import TopSnackbar from "../../../shared/ui/TopSnackbar";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";

export default function PlantDetailsScreen() {
  const nav = useNavigation();
  const route = useRoute<any>();

  // Keep backward compatibility with both param names:
  const qrFromNav: string | undefined = route.params?.qrCode;
  const idFromNav: number | undefined =
    route.params?.plantId ?? route.params?.id;

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<PlantDetailsComposite | null>(null);
  const [error, setError] = useState<string>("");

  // "Mark as complete" modal state for reminders
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completeReminderId, setCompleteReminderId] = useState<string | null>(
    null
  );
  const [completeNote, setCompleteNote] = useState("");

  // Toast state (QR + reminders)
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] = useState<
    "default" | "success" | "error"
  >("default");

  // Used to force-remount child tiles when data is refreshed (e.g. reset 3-dot menu state)
  const [refreshCounter, setRefreshCounter] = useState(0);

  const showToast = (
    message: string,
    variant: "default" | "success" | "error" = "default"
  ) => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };

  // Helper to load / reload details (used on focus and after completion)
  const loadDetails = useCallback(async () => {
    if (!qrFromNav && !idFromNav) {
      throw new Error("No plant id or QR code provided.");
    }

    if (qrFromNav) {
      const full = await fetchPlantDetailsByQr(qrFromNav);
      setDetails(full);
    } else if (idFromNav) {
      const full = await fetchPlantDetailsById(Number(idFromNav));
      setDetails(full);
    }
  }, [qrFromNav, idFromNav]);

  const qrCodeValue = useMemo(() => {
    const code = details?.plant.qr_code || qrFromNav || "";
    if (!code) return "";
    return `https://flovers.app/api/plant-instances/by-qr/?code=${encodeURIComponent(
      code
    )}`;
  }, [details, qrFromNav]);

  // Save QR code (dataURL -> file -> CameraRoll)
  const onSaveQr = async (svgRef: any) => {
    if (!svgRef?.toDataURL) {
      throw new Error("QR renderer not ready.");
    }

    const dataUrl: string = await new Promise((res, rej) =>
      svgRef.toDataURL((d: string) =>
        d ? res(d) : rej(new Error("No dataURL"))
      )
    );

    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const filePath = `${RNFS.CachesDirectoryPath}/plant_qr_${Date.now()}.png`;
    await RNFS.writeFile(filePath, base64, "base64");

    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: "Storage permission",
          message: "We need access to save the QR code to your gallery.",
          buttonPositive: "OK",
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error("Storage permission denied.");
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
          "Plant",
      } as never
    );
  };

  // ---------- ENTER/EXIT CONTENT ANIMATION + REFRESH ON FOCUS ----------
  const entry = useRef(new Animated.Value(0)).current;
  const contentOpacity = entry;
  const contentTranslateY = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const contentScale = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const run = async () => {
        try {
          setLoading(true);
          setError("");
          await loadDetails();
          if (isActive) {
            // bump counter so children (e.g. Reminders tile) remount and reset internal state
            setRefreshCounter((c) => c + 1);
          }
        } catch (e: any) {
          if (!isActive) return;
          setError(e?.message || "Failed to load plant.");
          setDetails(null);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      // animate in on focus (same as Profile)
      Animated.timing(entry, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      // refresh data whenever the screen gains focus
      run();

      // animate out on blur + clean up transient UI
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
    }, [entry, loadDetails])
  );
  // ----------------------------------------------------

  const latestRead = details?.latestReadings ?? null;
  const reminders = details?.reminders ?? [];

  // Show tile whenever there is a linked device, even if there is no reading yet.
  const showLatestReadingsTile = !!details && details.deviceLinked;

  // Safe fallback LatestReadings object so the tile can render dashes
  const latestReadSafe: LatestReadings = latestRead ?? {
    temperature: null,
    humidity: null,
    light: null,
    moisture: null,
    tsISO: null,
  };

  // --- Mark complete modal helpers ---
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

      // Try to find underlying taskId if available (for markHomeTaskComplete)
      const r = details.reminders.find((x) => x.id === completeReminderId);
      if (r?.taskId) {
        await markHomeTaskComplete(r.taskId, completeNote);
      } else {
        // If you later add a dedicated reminders.complete API,
        // call it here instead.
      }

      closeCompleteModal();

      // Refresh the plant details (and thus the Reminders tile)
      await loadDetails();
      setRefreshCounter((c) => c + 1); // ensure 3-dot menu state resets as well

      // Use shared toast instead of Alert
      showToast("Reminder marked as complete.", "success");
    } catch (e: any) {
      closeCompleteModal();
      Alert.alert(
        "Complete failed",
        e?.message ? String(e.message) : "Could not complete this reminder."
      );
    } finally {
      setLoading(false);
    }
  };

  const isInitialLoading = loading && !details && !error;

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Plant details"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

      <Animated.View
        style={{
          flex: 1,
          opacity: contentOpacity,
          transform: [
            { translateY: contentTranslateY },
            { scale: contentScale },
          ],
        }}
      >
        {isInitialLoading ? (
          // Shared centered spinner while the plant details are loading for the first time
          <CenteredSpinner />
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.title}>Error</Text>
            <Text style={styles.dim}>{error}</Text>
          </View>
        ) : !details ? (
          <View style={styles.centerBox}>
            <Text style={styles.title}>Not found</Text>
            <Text style={styles.dim}>We couldn’t load this plant.</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingBottom: 24,
              paddingHorizontal: 16,
              // Match Home list top padding
              paddingTop: 21,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* ---------- INFO FRAME ---------- */}
            <GlassFrame>
              <PlantInfoTile plant={details.plant} />
            </GlassFrame>

            {/* ---------- LATEST READINGS TILE ---------- */}
            {showLatestReadingsTile && (
              <PlantLatestReadingsTile
                latestReadings={latestReadSafe}
                sensors={details.sensors}
                onTilePress={() => goHistory()}
                onMetricPress={(metric) => goHistory(metric)}
              />
            )}

            {/* ---------- REMINDERS TILE ---------- */}
            {reminders.length > 0 && (
              <PlantRemindersTile
                key={refreshCounter} // remount on refresh so 3-dot menu closes
                reminders={reminders}
                onMarkComplete={(reminderId) => openCompleteModal(reminderId)}
                onEditReminder={(reminderId) => {
                  // IMPORTANT: this must be the real reminder ID
                  // for the Reminders screen to open the edit form.
                  nav.navigate(
                    "Reminders" as never,
                    { editReminderId: String(reminderId) } as never
                  );
                }}
                onShowHistory={() => {
                  nav.navigate(
                    "TaskHistory" as never,
                    { plantId: String(details.plant.id) } as never
                  );
                }}
              />
            )}

            {/* ---------- QR FRAME ---------- */}
            {!!qrCodeValue && (
              <GlassFrame>
                <PlantQrTile
                  qrCodeValue={qrCodeValue}
                  onPressSave={async () => {
                    try {
                      await onSaveQr((global as any).__qrRef);
                      showToast("QR code saved to your gallery.", "success");
                    } catch (err: any) {
                      console.warn("[PlantDetails] save QR failed:", err);
                      showToast(
                        err?.message || "Failed to save QR code.",
                        "error"
                      );
                    }
                  }}
                  onPressEmail={() => {
                    // Placeholder – hook actual email endpoint later
                    showToast(
                      "An email with this QR code will be sent to your account address.",
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

      {/* Overlay spinner when refreshing while details are already shown */}
      {loading && details && !error && (
        <CenteredSpinner overlay size={36} color="#FFFFFF" />
      )}

      {/* Complete-with-note modal for Plant Reminders */}
      <CompleteTaskModal
        visible={completeModalVisible}
        note={completeNote}
        onChangeNote={setCompleteNote}
        onCancel={closeCompleteModal}
        onConfirm={handleConfirmComplete}
      />

      {/* Toast for QR + reminders */}
      <TopSnackbar
        visible={toastVisible}
        message={toastMsg}
        variant={toastVariant}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}

/* -------------------- Small glass wrapper -------------------- */
function GlassFrame({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
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
      <View style={[styles.frameInner, center && { alignItems: "center" }]}>
        {children}
      </View>
    </View>
  );
}

/* -------------------- Local styles for this screen -------------------- */
const styles = StyleSheet.create({
  centerBox: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 6,
  },

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
  sub: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    fontSize: 12,
    marginBottom: 10,
  },
  dim: { color: "rgba(255,255,255,0.92)", fontWeight: "600" },

  infoGrid: { gap: 8, marginTop: 6 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoLabel: { color: "#FFFFFF", fontWeight: "800", marginRight: 6 },
  infoValue: {
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
    flex: 1,
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkBtn: { paddingVertical: 4, paddingHorizontal: 6 },
  linkText: {
    color: "#FFFFFF",
    fontWeight: "800",
    textDecorationLine: "underline",
  },

  lastRead: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 6,
  },

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
  remTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  remWhen: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    fontSize: 12,
  },
});
