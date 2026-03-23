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
import LinearGradient from "react-native-linear-gradient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import GlassHeader from "../../../shared/ui/GlassHeader";

import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/plant-details.constants";
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

import PlantDefinitionModal from "../components/modals/PlantDefinitionModal";
import ChangePlantImageModal from "../components/modals/ChangePlantImageModal";
import EditPlantModal from "../../plants/components/modals/EditPlantModal";

import {
  fetchPlantInstanceForEdit,
  updatePlantInstanceFromForm,
} from "../../../api/services/plant-instances.service";

// ✅ use env-driven public base URL (dev/prod aware)
import { PUBLIC_BASE_URL_NORM } from "../../../config";

// Same green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

type LightLevel5 =
  | "very-low"
  | "low"
  | "medium"
  | "bright-indirect"
  | "bright-direct";

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

  // Overdue info for modal (single-task)
  const [completeIsOverdue, setCompleteIsOverdue] = useState(false);
  const [completeIntervalText, setCompleteIntervalText] = useState<string>("");

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] = useState<"default" | "success" | "error">("default");

  const [refreshCounter, setRefreshCounter] = useState(0);
  const [dismissMenusTick, setDismissMenusTick] = useState(0);

  const scrollRef = useRef<ScrollView | null>(null);

  // Plant Definition modal state (screen root)
  const [defModalVisible, setDefModalVisible] = useState(false);
  const [defPlantDefinitionId, setDefPlantDefinitionId] = useState<number | null>(null);

  const openDefinition = useCallback((plantDefinitionId: number) => {
    setDefPlantDefinitionId(plantDefinitionId);
    setDefModalVisible(true);
  }, []);

  const closeDefinition = useCallback(() => {
    setDefModalVisible(false);
    setDefPlantDefinitionId(null);
  }, []);

  // Change Image modal state (screen root) — NEW
  const [changeImgVisible, setChangeImgVisible] = useState(false);
  const [changeImgPlantId, setChangeImgPlantId] = useState<string | null>(null);

  // Signal for PlantInfoTile to reload local photo from storage — NEW
  const [photoReloadSignal, setPhotoReloadSignal] = useState(0);

  const openChangeImage = useCallback((plantId: string) => {
    setChangeImgPlantId(plantId);
    setChangeImgVisible(true);
  }, []);

  const closeChangeImage = useCallback(() => {
    setChangeImgVisible(false);
    setChangeImgPlantId(null);
  }, []);

  // EDIT MODAL state
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [fName, setFName] = useState("");
  const [fLatinQuery, setFLatinQuery] = useState("");
  const [fLatinSelected, setFLatinSelected] = useState<string | undefined>(undefined);
  const [fLocation, setFLocation] = useState<string | undefined>(undefined);
  const [fNotes, setFNotes] = useState("");

  const [fPurchaseDateISO, setFPurchaseDateISO] = useState<string | null | undefined>(null);
  const [fLightLevel, setFLightLevel] = useState<LightLevel5>("medium");
  const [fOrientation, setFOrientation] = useState<"N" | "E" | "S" | "W">("S");
  const [fDistanceCm, setFDistanceCm] = useState<number>(0);
  const [fPotMaterial, setFPotMaterial] = useState<string | undefined>(undefined);
  const [fSoilMix, setFSoilMix] = useState<string | undefined>(undefined);

  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const showToast = (message: string, variant: "default" | "success" | "error" = "default") => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };

  // Date helpers (local time)
  const startOfTodayMs = useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const normDateMs = useCallback((val: any) => {
    const d = val instanceof Date ? val : new Date(val);
    return d.getTime();
  }, []);

  // Overdue test for a reminder row (uses reminder.dueDate)
  const isReminderOverdue = useCallback(
    (r: any) => {
      const due = r?.dueDate;
      if (!due) return false;
      const ms = normDateMs(due);
      return Number.isFinite(ms) && ms < startOfTodayMs();
    },
    [normDateMs, startOfTodayMs]
  );

  // Interval helper (best-effort; requires intervalValue/intervalUnit on reminder)
  const buildIntervalText = useCallback(
    (r: any) => {
      const v = r?.intervalValue;
      const u = r?.intervalUnit;
      if (!v || !u) return "";

      // If you add homeModals.interval.days/months in i18n, this becomes localized.
      const maybe = t(`homeModals.interval.${u}`, { count: v });
      if (typeof maybe === "string" && maybe.startsWith("homeModals.interval.")) {
        const unitLabel =
          u === "days"
            ? v === 1
              ? "day"
              : "days"
            : v === 1
              ? "month"
              : "months";
        return `+${v} ${unitLabel}`;
      }
      return maybe;
    },
    [t]
  );

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

  // ✅ FIX: no hardcoded flovers.app; use PUBLIC_BASE_URL_NORM
  const qrCodeValue = useMemo(() => {
    const code = details?.plant.qr_code || qrFromNav || "";
    if (!code) return "";
    return `${PUBLIC_BASE_URL_NORM}/api/plant-instances/by-qr/?code=${encodeURIComponent(code)}`;
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
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
        title: tr("plantDetails.permissions.storage.title", "Storage permission"),
        message: tr(
          "plantDetails.permissions.storage.message",
          "We need access to save the QR code to your gallery."
        ),
        buttonPositive: tr("plantDetails.permissions.storage.ok", "OK"),
      });
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

  const openEditModal = useCallback(
    async (plantId: string) => {
      setDismissMenusTick((t) => t + 1);
      setEditingId(plantId);
      setEditLoading(true);

      try {
        const detail = await fetchPlantInstanceForEdit(Number(plantId), {
          auth: true,
        });

        const resolvedName =
          detail.display_name?.trim() ||
          detail.plant_definition?.name?.trim() ||
          tr("plants.list.unnamed", "Unnamed plant");

        setFName(resolvedName);
        setFLatinQuery(detail.plant_definition?.name || "");
        setFLatinSelected(detail.plant_definition?.name || undefined);
        setFLocation(detail.location?.name || undefined);
        setFNotes(detail.notes || "");

        setFPurchaseDateISO(
          detail.purchase_date === undefined ? null : detail.purchase_date
        );

        setFLightLevel((detail.light_level as LightLevel5) || "medium");
        setFOrientation((detail.orientation as any) || "S");
        setFDistanceCm(detail.distance_cm ?? 0);

        setFPotMaterial(detail.pot_material ?? undefined);
        setFSoilMix(detail.soil_mix ?? undefined);

        setEditOpen(true);
      } catch (e: any) {
        Alert.alert(
          t("plants.alert.loadFailedTitle", { defaultValue: "Load failed" }),
          e?.message ||
            t("plants.alert.loadFailedMsg", {
              defaultValue: "Could not load plant details.",
            })
        );
      } finally {
        setEditLoading(false);
      }
    },
    [t, tr]
  );

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditingId(null);
  }, []);

  const onUpdate = useCallback(async () => {
    if (!editingId) return;
    if (!fName.trim()) return;

    setSaving(true);
    try {
      const form = {
        display_name: fName.trim(),
        notes: fNotes ?? "",
        purchase_date: fPurchaseDateISO ?? null,
        light_level: fLightLevel,
        orientation: fOrientation,
        distance_cm: fDistanceCm,
        pot_material: fPotMaterial ?? "",
        soil_mix: fSoilMix ?? "",
      } as const;

      await updatePlantInstanceFromForm(Number(editingId), form, { auth: true });

      closeEdit();
      await loadDetails();
      setRefreshCounter((c) => c + 1);

      showToast(
        t("plants.toast.updated", { defaultValue: "Plant updated" }),
        "success"
      );
    } catch (e: any) {
      Alert.alert(
        t("plants.alert.updateFailedTitle", { defaultValue: "Update failed" }),
        e?.message ||
          t("plants.alert.updateFailedMsg", {
            defaultValue: "Could not update this plant.",
          })
      );
    } finally {
      setSaving(false);
    }
  }, [
    editingId,
    fName,
    fNotes,
    fPurchaseDateISO,
    fLightLevel,
    fOrientation,
    fDistanceCm,
    fPotMaterial,
    fSoilMix,
    closeEdit,
    loadDetails,
    t,
  ]);

  const entry = useRef(new Animated.Value(0)).current;
  const contentOpacity = entry;
  const contentTranslateY = entry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const contentScale = entry.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const run = async () => {
        try {
          setDismissMenusTick((t) => t + 1);
          setDetails(null);

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

        setDismissMenusTick((t) => t + 1);

        setToastVisible(false);
        setCompleteModalVisible(false);
        setCompleteReminderId(null);
        setCompleteNote("");

        // Reset overdue info
        setCompleteIsOverdue(false);
        setCompleteIntervalText("");

        closeDefinition();
        closeChangeImage(); // (close on blur/unmount)
        closeEdit();
      };
    }, [entry, loadDetails, tr, closeDefinition, closeChangeImage, closeEdit])
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

  const latinOptions = useMemo(() => {
    const set = new Set<string>();
    const latin = details?.plant?.plant_definition?.latin;
    if (latin) set.add(latin);
    return Array.from(set);
  }, [details]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    const location = details?.plant?.location?.name;
    if (location) set.add(location);
    return Array.from(set);
  }, [details]);

  const openCompleteModal = (reminderId: string) => {
    setCompleteReminderId(reminderId);
    setCompleteNote("");

    // Compute overdue + interval for this reminder (single)
    const r = details?.reminders?.find((x) => x.id === reminderId);
    const overdue = r ? isReminderOverdue(r) : false;
    setCompleteIsOverdue(overdue);
    setCompleteIntervalText(r ? buildIntervalText(r) : "");

    setCompleteModalVisible(true);
  };

  const closeCompleteModal = () => {
    setCompleteModalVisible(false);
    setCompleteReminderId(null);
    setCompleteNote("");

    // Reset overdue info
    setCompleteIsOverdue(false);
    setCompleteIntervalText("");
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
            <Text style={styles.dim}>{tr("plantDetails.states.notFound.msg", "We couldn’t load this plant.")}</Text>
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
              {details?.plant ? (
                <PlantInfoTile
                  plant={details.plant}
                  collapseMenusSignal={dismissMenusTick}
                  photoReloadSignal={photoReloadSignal}
                  onOpenDefinition={(plantDefinitionId) => {
                    setDismissMenusTick((t) => t + 1);
                    openDefinition(plantDefinitionId);
                  }}
                  onOpenEditPlant={(plantId) => {
                    setDismissMenusTick((t) => t + 1);
                    openEditModal(plantId);
                  }}
                  onOpenChangeImage={(plantId) => {
                    setDismissMenusTick((t) => t + 1);
                    openChangeImage(plantId);
                  }}
                />
              ) : (
                <View>
                  <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                    {tr("plantDetails.info.loading", "Loading…")}
                  </Text>
                </View>
              )}
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
                      showToast(
                        err?.message || tr("plantDetails.toasts.qrSaveFailed", "Failed to save QR code."),
                        "error"
                      );
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

      {(editLoading || saving) && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <CenteredSpinner size={46} color="#FFFFFF" />
        </View>
      )}

      {/* Screen-level modals (full screen overlays) */}
      <PlantDefinitionModal visible={defModalVisible} onClose={closeDefinition} plantDefinitionId={defPlantDefinitionId} />

      <ChangePlantImageModal
        visible={changeImgVisible}
        onClose={closeChangeImage}
        plantId={changeImgPlantId}
        onChanged={() => {
          // Force PlantInfoTile to reload local uri (since the modal is no longer inside it)
          setPhotoReloadSignal((v) => v + 1);
        }}
      />

      <EditPlantModal
        visible={editOpen}
        latinCatalog={latinOptions}
        locations={locationOptions}
        fName={fName}
        setFName={setFName}
        fLatinQuery={fLatinQuery}
        setFLatinQuery={setFLatinQuery}
        fLatinSelected={fLatinSelected}
        setFLatinSelected={setFLatinSelected}
        fLocation={fLocation}
        setFLocation={setFLocation}
        fNotes={fNotes}
        setFNotes={setFNotes}
        fPurchaseDateISO={fPurchaseDateISO ?? null}
        setFPurchaseDateISO={setFPurchaseDateISO}
        fLightLevel={fLightLevel}
        setFLightLevel={setFLightLevel}
        fOrientation={fOrientation}
        setFOrientation={setFOrientation}
        fDistanceCm={fDistanceCm}
        setFDistanceCm={setFDistanceCm}
        fPotMaterial={fPotMaterial}
        setFPotMaterial={setFPotMaterial}
        fSoilMix={fSoilMix}
        setFSoilMix={setFSoilMix}
        onCancel={closeEdit}
        onSave={onUpdate}
      />

      <CompleteTaskModal
        visible={completeModalVisible}
        note={completeNote}
        onChangeNote={setCompleteNote}
        onCancel={closeCompleteModal}
        onConfirm={handleConfirmComplete}
        mode="single"
        isOverdue={completeIsOverdue}
        intervalText={completeIntervalText}
      />

      <TopSnackbar visible={toastVisible} message={toastMsg} variant={toastVariant} onDismiss={() => setToastVisible(false)} />
    </View>
  );
}

function GlassFrame({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <View style={styles.frameWrap}>
      <View style={s.cardGlass}>
        {/* Base green gradient */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        {/* Fog highlight */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={["rgba(255, 255, 255, 0.06)", "rgba(255, 255, 255, 0.02)", "rgba(255, 255, 255, 0.08)"]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
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
    elevation: 8,
    marginBottom: 14,
  },
  frameInner: { padding: 16 },

  dim: { color: "rgba(255,255,255,0.92)", fontWeight: "600" },
});