import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  RefreshControl,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
  Text,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";

import GlassHeader from "../../../shared/ui/GlassHeader";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import FAB from "../../../shared/ui/FAB";
import TopSnackbar from "../../../shared/ui/TopSnackbar";

import { s } from "../styles/readings.styles";
import ReadingTile from "../components/ReadingTile";
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
} from "../constants/readings.constants";
import type { ReadingTileModel as BaseReadingTileModel } from "../types/readings.types";

// Modals
import SortReadingsModal, {
  SortKey,
  SortDir,
} from "../components/modals/SortReadingsModal";
import FilterReadingsModal from "../components/modals/FilterReadingsModal";
import ConfirmDeleteReadingModal from "../components/modals/ConfirmDeleteReadingModal";
import DeviceSetupModal from "../components/modals/DeviceSetupModal";
import DeviceDetailsModal from "../components/modals/DeviceDetailsModal";
import WateringScheduleModal from "../components/modals/WateringScheduleModal";
import UpsertReadingDeviceModal from "../components/modals/UpsertReadingDeviceModal";
import SendReadingsExportModal from "../components/modals/SendReadingsExportModal";

// === Services (readings) ===
import {
  listReadingDevices,
  getReadingDevice,
  createReadingDevice,
  updateReadingDevice,
  deleteReadingDevice as apiDeleteReadingDevice,
  rotateAccountSecret,
  toReadingTile,
  fetchDeviceSetup,
  sendDeviceCodeByEmail,
  sendReadingsExportEmail,
  toggleAutoPump,
  fetchPumpStatus,
  schedulePumpWatering,
  recallPumpWatering,
  type ReadingsExportEmailRequest,
} from "../../../api/services/readings.service";

// Pull the API type from centralized readings types
import { ApiReadingDevice, ApiPumpTask } from "../types/readings.types";

// === Services (plants → Plant Instances) ===
import {
  fetchPlantInstances,
  type ApiPlantInstanceListItem,
} from "../../../api/services/plant-instances.service";

// i18n
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider";

// ===== Extend the reading model locally (non-breaking) =====
type Status = "enabled" | "disabled";
type ReadingTileModel = BaseReadingTileModel & {
  location?: string | null;
  status?: Status;
};

// ===== Filters shape for the modal =====
type Filters = {
  plantId?: string;
  location?: string;
  status?: Status;
};

// Empty-state gradient colors
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

export default function ReadingsScreen() {
  const nav = useNavigation();

  const { t, i18n } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const [items, setItems] = useState<ReadingTileModel[]>([]);
  const [devicesRaw, setDevicesRaw] = useState<ApiReadingDevice[]>([]);
  const [plantInstances, setPlantInstances] = useState<ApiPlantInstanceListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // FAB-related flags
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Sort modal state
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<Filters>({});

  // Export modal state
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Backwards-compat: legacy quick filter query
  const [filterQuery, setFilterQuery] = useState<string>("");

  // Delete modal state
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");

  // Device setup modal state + fetched data
  const [deviceSetupVisible, setDeviceSetupVisible] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupIngest, setSetupIngest] = useState<string>("");
  const [setupRead, setSetupRead] = useState<string>("");

  // Device details modal state
  const [deviceDetailsVisible, setDeviceDetailsVisible] = useState(false);
  const [deviceDetailsId, setDeviceDetailsId] = useState<string | null>(null);
  const [deviceDetailsLoading, setDeviceDetailsLoading] = useState(false);
  const [deviceDetailsSending, setDeviceDetailsSending] = useState(false);
  const [deviceDetailsData, setDeviceDetailsData] =
    useState<ApiReadingDevice | null>(null);
  const [deviceDetailsSecret, setDeviceDetailsSecret] = useState<string>("");

  // Watering schedule modal state
  const [wateringScheduleVisible, setWateringScheduleVisible] = useState(false);
  const [wateringScheduleId, setWateringScheduleId] = useState<string | null>(null);
  const [wateringScheduleName, setWateringScheduleName] = useState<string>("");
  const [wateringScheduleLoading, setWateringScheduleLoading] = useState(false);
  const [wateringScheduleWorking, setWateringScheduleWorking] = useState(false);
  const [wateringSchedulePendingTask, setWateringSchedulePendingTask] =
    useState<ApiPumpTask | null>(null);
  const [wateringScheduleLastPumpRunAt, setWateringScheduleLastPumpRunAt] =
    useState<string | null>(null);

  // Upsert modal state
  const [upsertVisible, setUpsertVisible] = useState(false);
  const [upsertMode, setUpsertMode] = useState<"add" | "edit">("add");
  const [upsertReadingId, setUpsertReadingId] = useState<string | null>(null);
  const [upsertReadingName, setUpsertReadingName] =
    useState<string | undefined>(undefined);

  // Shared toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] =
    useState<"default" | "success" | "error">("default");

  const showToast = useCallback(
    (message: string, variant: "default" | "success" | "error" = "default") => {
      setToastMsg(message);
      setToastVariant(variant);
      setToastVisible(true);
    },
    []
  );

  // FlatList ref to force scroll-to-top on focus
  const listRef = useRef<Animated.FlatList<any>>(null);

  // ===== Load devices and plant instances =====
  const load = useCallback(async () => {
    try {
      const [devices, plantsList] = await Promise.all([
        listReadingDevices(),
        fetchPlantInstances(),
      ]);

      setDevicesRaw(devices);
      setPlantInstances(Array.isArray(plantsList) ? plantsList : []);

      const tiles = devices.map(toReadingTile);
      setItems(tiles);
    } catch (e: any) {
      const msg =
        typeof e?.message === "string" &&
        e.message.toLowerCase().includes("401")
          ? tr("readings.toasts.unauthorized", "Unauthorized. Please log in again.")
          : e?.message || tr("readings.toasts.loadFailed", "Failed to load devices");

      showToast(msg, "error");
      setDevicesRaw([]);
      setPlantInstances([]);
      setItems([]);
    }
  }, [showToast, tr]);

  // Clear stale tiles on entry so only spinner is visible
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      (async () => {
        setLoading(true);
        setItems([]);

        try {
          await load();
        } finally {
          if (mounted) setLoading(false);
        }
      })();

      return () => {
        mounted = false;
      };
    }, [load])
  );

  // On focus: reset page state
  useFocusEffect(
    useCallback(() => {
      setSortModalVisible(false);
      setFilterModalVisible(false);
      setExportModalVisible(false);
      setDeleteVisible(false);
      setDeviceSetupVisible(false);
      setDeviceDetailsVisible(false);
      setWateringScheduleVisible(false);
      setUpsertVisible(false);
      setSortSheetOpen(false);
      setFilterSheetOpen(false);

      setDeviceDetailsId(null);
      setDeviceDetailsData(null);
      setDeviceDetailsSecret("");
      setDeviceDetailsLoading(false);
      setDeviceDetailsSending(false);

      setWateringScheduleId(null);
      setWateringScheduleName("");
      setWateringScheduleLoading(false);
      setWateringScheduleWorking(false);
      setWateringSchedulePendingTask(null);
      setWateringScheduleLastPumpRunAt(null);

      setMenuOpenId(null);

      setFilters({});
      setFilterQuery("");

      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
      });

      return undefined;
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // ----- Derived plants & locations -----
  const plantOptions = useMemo(
    () => items.map((x) => ({ id: x.id, name: x.name })),
    [items]
  );

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((x) => {
      if (x.location) set.add(x.location);
    });
    return Array.from(set);
  }, [items]);

  const effectiveExportFilters = useMemo<ReadingsExportEmailRequest>(() => {
    return {
      plantId: filters.plantId || undefined,
      location: filters.location || undefined,
      status: filters.status || undefined,
      sortKey,
      sortDir,
    };
  }, [filters, sortKey, sortDir]);

  const exportPlantName = useMemo(() => {
    if (!effectiveExportFilters.plantId) return undefined;
    return plantOptions.find((p) => p.id === effectiveExportFilters.plantId)?.name;
  }, [effectiveExportFilters.plantId, plantOptions]);

  // ---------- Entrance animation ----------
  const animMapRef = useRef<Map<string, Animated.Value>>(new Map());

  const getAnimForId = (id: string) => {
    const m = animMapRef.current;
    if (!m.has(id)) m.set(id, new Animated.Value(0));
    return m.get(id)!;
  };

  const primeAnimations = useCallback((ids: string[]) => {
    ids.forEach((id) => {
      getAnimForId(id).setValue(0);
    });
  }, []);

  const runStaggerIn = useCallback((ids: string[]) => {
    const seq = ids.map((id, i) =>
      Animated.timing(getAnimForId(id), {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        delay: i * 50,
      })
    );
    Animated.stagger(50, seq).start();
  }, []);

  const isFilterActive = useMemo(() => {
    return Boolean(
      filters.plantId ||
        filters.location ||
        filters.status ||
        (filterQuery && filterQuery.trim().length > 0)
    );
  }, [filters, filterQuery]);

  // ----- Apply filtering & sorting -----
  const derivedItems = useMemo(() => {
    let arr = [...items];

    if (filters.plantId) {
      arr = arr.filter((x) => x.id === filters.plantId);
    }

    const q = (filterQuery || "").trim().toLowerCase();
    if (q) {
      arr = arr.filter((x) => x.name?.toLowerCase().includes(q));
    }

    if (filters.location) {
      arr = arr.filter(
        (x) => (x.location ?? "").toLowerCase() === filters.location!.toLowerCase()
      );
    }

    if (filters.status) {
      arr = arr.filter((x) => (x.status ?? "enabled") === filters.status);
    }

    const collator = new Intl.Collator(undefined, { sensitivity: "base" });

    arr.sort((a, b) => {
      let cmp = 0;

      if (sortKey === "name") {
        cmp = collator.compare(a.name ?? "", b.name ?? "");
      } else if (sortKey === "location") {
        cmp = collator.compare(a.location ?? "", b.location ?? "");
      } else {
        const ad = a.lastReadISO ? new Date(a.lastReadISO).getTime() : -Infinity;
        const bd = b.lastReadISO ? new Date(b.lastReadISO).getTime() : -Infinity;
        cmp = ad === bd ? 0 : ad < bd ? -1 : 1;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [items, filters, filterQuery, sortKey, sortDir]);

  useEffect(() => {
    if (loading) return;

    const ids = derivedItems.map((x) => x.id);
    primeAnimations(ids);

    const raf = requestAnimationFrame(() => runStaggerIn(ids));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, derivedItems.length]);

  // ---------- Empty-state animation ----------
  const emptyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      emptyAnim.setValue(0);
      return;
    }

    if (derivedItems.length === 0) {
      emptyAnim.setValue(0);
      Animated.timing(emptyAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      emptyAnim.setValue(0);
    }
  }, [loading, derivedItems.length, emptyAnim]);

  const emptyTranslateY = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  const emptyScale = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  const emptyOpacity = emptyAnim;

  const showFAB =
    !sortSheetOpen &&
    !filterSheetOpen &&
    !sortModalVisible &&
    !filterModalVisible &&
    !exportModalVisible &&
    !deleteVisible &&
    !deviceSetupVisible &&
    !deviceDetailsVisible &&
    !wateringScheduleVisible &&
    !upsertVisible;

  // ---- Delete handlers ----
  const openDeleteFor = useCallback(
    (id: string) => {
      const item = items.find((x) => x.id === id);
      setDeleteId(id);
      setDeleteName(item?.name ?? tr("readings.defaults.thisDevice", "this device"));
      setDeleteVisible(true);
    },
    [items, tr]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return;

    try {
      await apiDeleteReadingDevice(Number(deleteId));
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      setDevicesRaw((prev) => prev.filter((d) => String(d.id) !== deleteId));
      showToast(tr("readings.toasts.deviceDeleted", "Device deleted"), "success");
    } catch (e: any) {
      showToast(
        e?.message
          ? `${tr("readings.toasts.deleteFailedPrefix", "Delete failed")}: ${e.message}`
          : tr("readings.toasts.deleteFailed", "Delete failed"),
        "error"
      );
    } finally {
      setDeleteVisible(false);
      setDeleteId(null);
      setDeleteName("");
    }
  }, [deleteId, showToast, tr]);

  const handleSendExport = useCallback(async () => {
    setMenuOpenId(null);

    try {
      setExporting(true);

      const res = await sendReadingsExportEmail({
        ...effectiveExportFilters,
        lang: (i18n.language || currentLanguage || "en").split("-")[0],
      });

      setExportModalVisible(false);
      showToast(
        res?.detail || tr("readings.toasts.exportSent", "Readings export request sent"),
        "success"
      );
    } catch (e: any) {
      if (e?.status === 404) {
        showToast(
          tr("readings.toasts.exportNotAvailableYet", "Export is not available yet."),
          "error"
        );
      } else {
        showToast(
          e?.message ||
            tr("readings.toasts.failedToSendExport", "Failed to send readings export"),
          "error"
        );
      }
    } finally {
      setExporting(false);
    }
  }, [effectiveExportFilters, i18n.language, currentLanguage, showToast, tr]);

  // ---- Upsert handlers ----
  const openAddDevice = useCallback(async () => {
    if (!plantInstances || plantInstances.length === 0) {
      try {
        const latest = await fetchPlantInstances();
        setPlantInstances(Array.isArray(latest) ? latest : []);
      } catch {}
    }

    setUpsertMode("add");
    setUpsertReadingId(null);
    setUpsertReadingName(undefined);
    setUpsertVisible(true);
  }, [plantInstances]);

  const openEditDevice = useCallback(
    async (id: string) => {
      try {
        const data = await fetchDeviceSetup();
        setSetupSecret(data.secret);
        setSetupIngest(data.endpoints?.ingest || "");
        setSetupRead(data.endpoints?.read || "");
      } catch {
        setSetupSecret(null);
      }

      const item = items.find((x) => x.id === id);
      setUpsertMode("edit");
      setUpsertReadingId(id);
      setUpsertReadingName(item?.name);
      setUpsertVisible(true);
    },
    [items]
  );

  const openDeviceDetails = useCallback(
    async (id: string) => {
      setDeviceDetailsId(id);
      setDeviceDetailsLoading(true);
      setDeviceDetailsData(null);
      setDeviceDetailsSecret("");

      try {
        const [device, setup] = await Promise.all([
          getReadingDevice(Number(id)),
          fetchDeviceSetup(),
        ]);

        setDeviceDetailsData(device);
        setDeviceDetailsSecret(setup?.secret || "");
        setDeviceDetailsVisible(true);
      } catch (e: any) {
        showToast(
          e?.message ||
            tr("readings.toasts.deviceDetailsLoadFailed", "Failed to load device details"),
          "error"
        );
      } finally {
        setDeviceDetailsLoading(false);
      }
    },
    [showToast, tr]
  );

  const handleEmailCodeFromDeviceDetails = useCallback(async () => {
    if (!deviceDetailsId) {
      showToast(tr("readings.toasts.missingDeviceId", "Missing device ID"), "error");
      return;
    }

    try {
      setDeviceDetailsSending(true);

      const res = await sendDeviceCodeByEmail(Number(deviceDetailsId));

      showToast(
        res?.detail || tr("readings.toasts.codeSentByEmail", "Code sent to your email"),
        "success"
      );
    } catch (e: any) {
      showToast(
        e?.message
          ? `${tr("readings.toasts.sendCodeEmailFailedPrefix", "Send email failed")}: ${e.message}`
          : tr("readings.toasts.sendCodeEmailFailed", "Send email failed"),
        "error"
      );
    } finally {
      setDeviceDetailsSending(false);
    }
  }, [deviceDetailsId, showToast, tr]);

  const openWateringSchedule = useCallback(
    async (id: string) => {
      const item = items.find((x) => x.id === id);

      setWateringScheduleId(id);
      setWateringScheduleName(item?.name ?? "");
      setWateringSchedulePendingTask(null);
      setWateringScheduleLastPumpRunAt(null);
      setWateringScheduleLoading(true);
      setWateringScheduleWorking(false);

      try {
        const res = await fetchPumpStatus(Number(id));

        setWateringSchedulePendingTask(res.pending_pump_task ?? null);
        setWateringScheduleLastPumpRunAt(res.last_pump_run_at ?? null);

        setDevicesRaw((curr) =>
          curr.map((d) =>
            String(d.id) === id
              ? {
                  ...d,
                  pending_pump_task: res.pending_pump_task ?? null,
                  last_pump_run_at: res.last_pump_run_at ?? null,
                  last_pump_run_source: res.last_pump_run_source ?? null,
                }
              : d
          )
        );

        setItems((curr) =>
          curr.map((x) =>
            x.id === id
              ? {
                  ...x,
                  lastPumpRunAt: res.last_pump_run_at ?? null,
                  pendingPumpTask: res.pending_pump_task ?? null,
                }
              : x
          )
        );

        setWateringScheduleVisible(true);
      } catch (e: any) {
        showToast(
          e?.message ||
            tr(
              "readings.toasts.pumpStatusLoadFailed",
              "Failed to load watering schedule"
            ),
          "error"
        );
      } finally {
        setWateringScheduleLoading(false);
      }
    },
    [items, showToast, tr]
  );

  const handleScheduleWatering = useCallback(async () => {
    if (!wateringScheduleId) {
      showToast(tr("readings.toasts.missingDeviceId", "Missing device ID"), "error");
      return;
    }

    try {
      setWateringScheduleWorking(true);

      const res = await schedulePumpWatering(Number(wateringScheduleId));
      const pendingTask = res.pending_pump_task ?? null;

      setWateringSchedulePendingTask(pendingTask);

      setDevicesRaw((curr) =>
        curr.map((d) =>
          String(d.id) === wateringScheduleId
            ? {
                ...d,
                pending_pump_task: pendingTask,
              }
            : d
        )
      );

      setItems((curr) =>
        curr.map((x) =>
          x.id === wateringScheduleId
            ? {
                ...x,
                pendingPumpTask: pendingTask,
              }
            : x
        )
      );

      showToast(
        res?.detail || tr("readings.toasts.wateringScheduled", "Watering scheduled"),
        "success"
      );
    } catch (e: any) {
      showToast(
        e?.message ||
          tr("readings.toasts.wateringScheduleFailed", "Failed to schedule watering"),
        "error"
      );
    } finally {
      setWateringScheduleWorking(false);
    }
  }, [wateringScheduleId, showToast, tr]);

  const handleRecallWatering = useCallback(async () => {
    if (!wateringScheduleId) {
      showToast(tr("readings.toasts.missingDeviceId", "Missing device ID"), "error");
      return;
    }

    try {
      setWateringScheduleWorking(true);

      const res = await recallPumpWatering(Number(wateringScheduleId));

      setWateringSchedulePendingTask(null);

      setDevicesRaw((curr) =>
        curr.map((d) =>
          String(d.id) === wateringScheduleId
            ? {
                ...d,
                pending_pump_task: null,
              }
            : d
        )
      );

      setItems((curr) =>
        curr.map((x) =>
          x.id === wateringScheduleId
            ? {
                ...x,
                pendingPumpTask: null,
              }
            : x
        )
      );

      showToast(
        res?.detail ||
          tr("readings.toasts.wateringRecalled", "Scheduled watering recalled"),
        "success"
      );
    } catch (e: any) {
      showToast(
        e?.message ||
          tr("readings.toasts.wateringRecallFailed", "Failed to recall watering"),
        "error"
      );
    } finally {
      setWateringScheduleWorking(false);
    }
  }, [wateringScheduleId, showToast, tr]);

  const closeWateringSchedule = useCallback(() => {
    setWateringScheduleVisible(false);
    setWateringScheduleId(null);
    setWateringScheduleName("");
    setWateringScheduleLoading(false);
    setWateringScheduleWorking(false);
    setWateringSchedulePendingTask(null);
    setWateringScheduleLastPumpRunAt(null);
  }, []);

  const handleUpsertSave = useCallback(
    async (payload: {
      mode: "add" | "edit";
      plantId: string;
      name: string;
      notes?: string;
      enabled?: boolean;
      sensors: {
        temperature: boolean;
        humidity: boolean;
        light: boolean;
        moisture: boolean;
        moistureAlertEnabled?: boolean;
        moistureAlertPct?: number;
      };
      intervalHours: number;
      sendEmailNotifications?: boolean;
      sendPushNotifications?: boolean;
      pumpIncluded?: boolean;
      automaticPumpLaunch?: boolean;
      pumpThresholdPct?: number;
      sendEmailWateringNotifications?: boolean;
      sendPushWateringNotifications?: boolean;
    }) => {
      const isCreate = payload.mode === "add";

      const moistureAlertEnabled = !!(
        payload.sensors.moisture && payload.sensors.moistureAlertEnabled
      );

      const moistureAlertThreshold =
        payload.sensors.moisture && payload.sensors.moistureAlertEnabled
          ? payload.sensors.moistureAlertPct ?? null
          : null;

      const pumpIncluded = !!payload.pumpIncluded;
      const automaticPumpLaunch = pumpIncluded && !!payload.automaticPumpLaunch;

      try {
        if (isCreate) {
          await createReadingDevice({
            plant: Number(payload.plantId),
            device_name: payload.name,
            notes: payload.notes,
            interval_hours: payload.intervalHours,
            sensors: {
              temperature: payload.sensors.temperature,
              humidity: payload.sensors.humidity,
              light: payload.sensors.light,
              moisture: payload.sensors.moisture,
            },
            moisture_alert_enabled: moistureAlertEnabled,
            moisture_alert_threshold: moistureAlertThreshold,
            send_email_notifications: payload.sensors.moisture
              ? !!payload.sendEmailNotifications
              : false,
            send_push_notifications: payload.sensors.moisture
              ? !!payload.sendPushNotifications
              : false,
            pump_included: pumpIncluded,
            automatic_pump_launch: automaticPumpLaunch,
            pump_threshold_pct: automaticPumpLaunch
              ? payload.pumpThresholdPct ?? 30
              : null,
            send_email_watering_notifications: pumpIncluded
              ? !!payload.sendEmailWateringNotifications
              : false,
            send_push_watering_notifications: pumpIncluded
              ? !!payload.sendPushWateringNotifications
              : false,
          });
        } else {
          if (!upsertReadingId) return;

          await updateReadingDevice(Number(upsertReadingId), {
            plant: Number(payload.plantId),
            device_name: payload.name,
            notes: payload.notes ?? null,
            is_active:
              typeof payload.enabled === "boolean" ? payload.enabled : undefined,
            interval_hours: payload.intervalHours,
            sensors: {
              temperature: payload.sensors.temperature,
              humidity: payload.sensors.humidity,
              light: payload.sensors.light,
              moisture: payload.sensors.moisture,
            },
            moisture_alert_enabled: moistureAlertEnabled,
            moisture_alert_threshold: moistureAlertThreshold,
            send_email_notifications: payload.sensors.moisture
              ? !!payload.sendEmailNotifications
              : false,
            send_push_notifications: payload.sensors.moisture
              ? !!payload.sendPushNotifications
              : false,
            pump_included: pumpIncluded,
            automatic_pump_launch: automaticPumpLaunch,
            pump_threshold_pct: automaticPumpLaunch
              ? payload.pumpThresholdPct ?? 30
              : null,
            send_email_watering_notifications: pumpIncluded
              ? !!payload.sendEmailWateringNotifications
              : false,
            send_push_watering_notifications: pumpIncluded
              ? !!payload.sendPushWateringNotifications
              : false,
          });
        }

        setUpsertVisible(false);
        await load();

        showToast(
          tr(
            isCreate
              ? "readings.toasts.deviceAdded"
              : "readings.toasts.deviceUpdated",
            isCreate ? "Device added" : "Device updated"
          ),
          "success"
        );
      } catch (e: any) {
        setUpsertVisible(false);

        showToast(
          isCreate
            ? e?.message
              ? `${tr("readings.toasts.addFailedPrefix", "Add failed")}: ${e.message}`
              : tr("readings.toasts.addFailed", "Add failed")
            : e?.message
            ? `${tr("readings.toasts.updateFailedPrefix", "Update failed")}: ${e.message}`
            : tr("readings.toasts.updateFailed", "Update failed"),
          "error"
        );
      }
    },
    [upsertReadingId, load, showToast, tr]
  );

  const handleSendCodeByEmail = useCallback(async () => {
    if (!upsertReadingId) {
      showToast(tr("readings.toasts.missingDeviceId", "Missing device ID"), "error");
      return;
    }

    try {
      const res = await sendDeviceCodeByEmail(Number(upsertReadingId));
      showToast(
        res?.detail || tr("readings.toasts.codeSentByEmail", "Code sent to your email"),
        "success"
      );
    } catch (e: any) {
      showToast(
        e?.message
          ? `${tr("readings.toasts.sendCodeEmailFailedPrefix", "Send email failed")}: ${e.message}`
          : tr("readings.toasts.sendCodeEmailFailed", "Send email failed"),
        "error"
      );
    }
  }, [upsertReadingId, showToast, tr]);

  const handleToggleAutoPump = useCallback(
    async (id: string, enabled: boolean) => {
      const prevItems = items;
      const prevDevicesRaw = devicesRaw;

      setItems((curr) =>
        curr.map((x) =>
          x.id === id ? { ...x, automaticPumpLaunch: enabled } : x
        )
      );

      setDevicesRaw((curr) =>
        curr.map((d) =>
          String(d.id) === id ? { ...d, automatic_pump_launch: enabled } : d
        )
      );

      try {
        const updated = await toggleAutoPump(Number(id), {
          automatic_pump_launch: enabled,
        });

        setDevicesRaw((curr) =>
          curr.map((d) => (String(d.id) === id ? updated : d))
        );

        setItems((curr) =>
          curr.map((x) =>
            x.id === id
              ? {
                  ...x,
                  automaticPumpLaunch: updated.automatic_pump_launch,
                  pumpIncluded: updated.pump_included,
                  pumpThresholdPct: updated.pump_threshold_pct ?? undefined,
                  lastPumpRunAt: updated.last_pump_run_at ?? null,
                  sendEmailWateringNotifications:
                    updated.send_email_watering_notifications ?? false,
                  sendPushWateringNotifications:
                    updated.send_push_watering_notifications ?? false,
                  pendingPumpTask: updated.pending_pump_task ?? null,
                  status: updated.is_active ? "enabled" : "disabled",
                  location: updated.plant_location ?? null,
                }
              : x
          )
        );

        showToast(
          enabled
            ? tr("readings.toasts.autoPumpEnabled", "Automatic pump enabled")
            : tr("readings.toasts.autoPumpDisabled", "Automatic pump disabled"),
          "success"
        );
      } catch (e: any) {
        setItems(prevItems);
        setDevicesRaw(prevDevicesRaw);

        showToast(
          e?.message ||
            tr(
              "readings.toasts.autoPumpUpdateFailed",
              "Failed to update automatic pump setting"
            ),
          "error"
        );
      }
    },
    [items, devicesRaw, showToast, tr]
  );

  const openDeviceSetup = useCallback(async () => {
    try {
      const data = await fetchDeviceSetup();
      setSetupSecret(data.secret);
      setSetupIngest(data.endpoints?.ingest || "");
      setSetupRead(data.endpoints?.read || "");
    } catch (e: any) {
      showToast(
        e?.message
          ? `${tr("readings.toasts.setupLoadFailedPrefix", "Failed to load setup")}: ${e.message}`
          : tr("readings.toasts.setupLoadFailed", "Failed to load setup"),
        "error"
      );
      setSetupSecret(null);
      setSetupIngest("");
      setSetupRead("");
    } finally {
      setDeviceSetupVisible(true);
    }
  }, [showToast, tr]);

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title={tr("readings.header.title", "Readings")}
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          rightIconName="qrcode-scan"
          onPressRight={() => nav.navigate("Scanner" as never)}
          showSeparator={false}
        />
        <CenteredSpinner size={56} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title={tr("readings.header.title", "Readings")}
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate("Scanner" as never)}
        showSeparator={false}
      />

      {menuOpenId && (
        <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} />
      )}

      <Animated.FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={derivedItems}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => {
          const v = getAnimForId(item.id);
          const translateY = v.interpolate({
            inputRange: [0, 1],
            outputRange: [14, 0],
          });
          const scale = v.interpolate({
            inputRange: [0, 1],
            outputRange: [0.98, 1],
          });
          const opacity = v;

          const dev = devicesRaw.find((d) => String(d.id) === item.id);

          return (
            <Animated.View
              style={{ opacity, transform: [{ translateY }, { scale }] }}
            >
              <ReadingTile
                data={item}
                isMenuOpen={menuOpenId === item.id}
                onPressBody={() =>
                  nav.navigate("ReadingDetails" as never, { id: item.id } as never)
                }
                onPressMenu={() =>
                  setMenuOpenId((curr) => (curr === item.id ? null : item.id))
                }
                onEdit={() => {
                  setMenuOpenId(null);
                  openEditDevice(item.id);
                }}
                onDeviceDetails={() => {
                  setMenuOpenId(null);
                  openDeviceDetails(item.id);
                }}
                onHistory={() => {
                  setMenuOpenId(null);
                  nav.navigate("ReadingsHistory" as never, { id: item.id } as never);
                }}
                onPlantDetails={() => {
                  setMenuOpenId(null);
                  if (dev?.plant) {
                    nav.navigate(
                      "PlantDetails" as never,
                      { id: String(dev.plant) } as never
                    );
                  }
                }}
                onDelete={() => {
                  setMenuOpenId(null);
                  openDeleteFor(item.id);
                }}
                onMetricPress={(metric) =>
                  nav.navigate(
                    "ReadingsHistory" as never,
                    { metric, range: "day", id: item.id } as never
                  )
                }
                deviceName={dev?.device_name}
                sensors={{
                  temperature: !!dev?.sensors?.temperature,
                  humidity: !!dev?.sensors?.humidity,
                  light: !!dev?.sensors?.light,
                  moisture: !!dev?.sensors?.moisture,
                }}
                onLaunchPump={() => openWateringSchedule(item.id)}
                onAutoPumpToggle={(enabled) =>
                  handleToggleAutoPump(item.id, enabled)
                }
              />
            </Animated.View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={() => <View style={{ height: 0 }} />}
        ListFooterComponent={() => <View style={{ height: 200 }} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setMenuOpenId(null)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <Animated.View
              style={[
                s.emptyWrap,
                {
                  opacity: emptyOpacity,
                  transform: [{ translateY: emptyTranslateY }, { scale: emptyScale }],
                },
              ]}
            >
              <View style={s.emptyGlass}>
                <LinearGradient
                  pointerEvents="none"
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
                  locations={[0, 1]}
                  style={StyleSheet.absoluteFill}
                />

                <LinearGradient
                  pointerEvents="none"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  colors={[
                    "rgba(255,255,255,0.06)",
                    "rgba(255,255,255,0.02)",
                    "rgba(255,255,255,0.08)",
                  ]}
                  locations={[0, 0.5, 1]}
                  style={StyleSheet.absoluteFill}
                />

                <View pointerEvents="none" style={s.emptyTint} />
                <View pointerEvents="none" style={s.emptyBorder} />

                <View style={s.emptyInner}>
                  <MaterialCommunityIcons
                    name="access-point"
                    size={26}
                    color="#FFFFFF"
                    style={{ marginBottom: 10 }}
                  />
                  <Text style={s.emptyTitle}>
                    {tr("readings.empty.title", "No devices yet")}
                  </Text>

                  <View style={s.emptyDescBox}>
                    <Text style={s.emptyText}>
                      {tr(
                        "readings.empty.description",
                        'Devices let you ingest temperature, humidity, light, and soil moisture readings for a plant.\n\nTap the “+ Link device” action to add one. Pick a plant, name the device, choose sensors, and set a sampling interval. You can then open Device setup to view your account secret, rotate it, and email a ready-to-paste Arduino/ESP sketch.'
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          ) : null
        }
      />

      {showFAB && (
        <View
          onStartShouldSetResponderCapture={() => {
            setMenuOpenId(null);
            return false;
          }}
        >
          <FAB
            bottomOffset={92}
            position={settings.fabPosition}
            actions={[
              {
                key: "link-device",
                icon: "link-variant",
                label: tr("readings.fab.linkDevice", "Link device"),
                onPress: openAddDevice,
              },
              {
                key: "device-setup",
                icon: "key-variant",
                label: tr("readings.fab.deviceSetup", "Device setup"),
                onPress: openDeviceSetup,
              },
              {
                key: "sort",
                icon: "sort",
                label: tr("readings.fab.sort", "Sort"),
                onPress: () => {
                  setSortSheetOpen(true);
                  setSortModalVisible(true);
                },
              },
              {
                key: "filter",
                icon: "filter-variant",
                label: tr("readings.fab.filter", "Filter"),
                onPress: () => {
                  setFilterSheetOpen(true);
                  setFilterModalVisible(true);
                },
              },
              {
                key: "send-export",
                icon: "email-send-outline",
                label: tr("readings.fab.sendExport", "Send export"),
                onPress: () => {
                  setMenuOpenId(null);
                  setExportModalVisible(true);
                },
              },
              ...(isFilterActive
                ? [
                    {
                      key: "clear-filter",
                      icon: "filter-remove",
                      label: tr("readings.fab.clearFilter", "Clear filter"),
                      onPress: () => {
                        setFilters({});
                        setFilterQuery("");
                      },
                    } as const,
                  ]
                : []),
            ]}
          />
        </View>
      )}

      <ConfirmDeleteReadingModal
        visible={deleteVisible}
        name={deleteName}
        onCancel={() => {
          setDeleteVisible(false);
          setDeleteId(null);
          setDeleteName("");
        }}
        onConfirm={confirmDelete}
      />

      <DeviceSetupModal
        visible={deviceSetupVisible}
        writeEndpoint={setupIngest || "—"}
        readEndpoint={setupRead || "—"}
        authSecret={setupSecret ?? "••••••••••••••"}
        onClose={() => setDeviceSetupVisible(false)}
        onRotateSecret={async () => {
          try {
            const { secret } = await rotateAccountSecret();
            setSetupSecret(secret);
            showToast(tr("readings.toasts.secretRotated", "Secret rotated"), "success");
          } catch (e: any) {
            showToast(
              e?.message
                ? `${tr("readings.toasts.rotateFailedPrefix", "Rotate failed")}: ${e.message}`
                : tr("readings.toasts.rotateFailed", "Rotate failed"),
              "error"
            );
          }
        }}
      />

      <DeviceDetailsModal
        visible={deviceDetailsVisible}
        loading={deviceDetailsLoading}
        sending={deviceDetailsSending}
        accountSecret={deviceDetailsSecret || "—"}
        deviceId={deviceDetailsData?.id ?? deviceDetailsId}
        deviceKey={deviceDetailsData?.device_key ?? "—"}
        deviceName={deviceDetailsData?.device_name ?? "—"}
        plantName={deviceDetailsData?.plant_name ?? "—"}
        location={deviceDetailsData?.plant_location ?? "—"}
        sensors={deviceDetailsData?.sensors ?? null}
        pumpIncluded={Boolean(deviceDetailsData?.pump_included)}
        onClose={() => {
          setDeviceDetailsVisible(false);
          setDeviceDetailsId(null);
          setDeviceDetailsData(null);
          setDeviceDetailsSecret("");
          setDeviceDetailsLoading(false);
          setDeviceDetailsSending(false);
        }}
        onEmailCode={handleEmailCodeFromDeviceDetails}
      />

      <WateringScheduleModal
        visible={wateringScheduleVisible}
        loading={wateringScheduleLoading}
        working={wateringScheduleWorking}
        deviceId={wateringScheduleId}
        deviceName={wateringScheduleName}
        plantName={
          (() => {
            const dev = devicesRaw.find(
              (d) => String(d.id) === wateringScheduleId
            );
            return dev?.plant_name ?? "—";
          })()
        }
        location={
          (() => {
            const dev = devicesRaw.find(
              (d) => String(d.id) === wateringScheduleId
            );
            return dev?.plant_location ?? "—";
          })()
        }
        pumpIncluded={
          (() => {
            const dev = devicesRaw.find(
              (d) => String(d.id) === wateringScheduleId
            );
            return Boolean(dev?.pump_included);
          })()
        }
        lastPumpRunAt={
          wateringScheduleLastPumpRunAt ??
          (() => {
            const dev = devicesRaw.find(
              (d) => String(d.id) === wateringScheduleId
            );
            return dev?.last_pump_run_at ?? "—";
          })()
        }
        pendingPumpTask={wateringSchedulePendingTask}
        scheduledJobExists={Boolean(wateringSchedulePendingTask)}
        scheduledJobCreatedAt={wateringSchedulePendingTask?.requested_at ?? null}
        onScheduleWatering={handleScheduleWatering}
        onRecallWatering={handleRecallWatering}
        onClose={closeWateringSchedule}
      />

      <UpsertReadingDeviceModal
        visible={upsertVisible}
        mode={upsertMode}
        plants={plantInstances.map((p) => ({
          id: String(p.id),
          name: (p as any).display_name ?? `Plant #${p.id}`,
          location:
            (p as any).location_name ??
            (p as any).location_label ??
            (p as any).location_display ??
            (p as any).location?.name ??
            (p as any).location ??
            undefined,
        }))}
        initialPlantId={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return dev ? String(dev.plant) : "";
              })()
            : ""
        }
        initialName={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return dev?.device_name ?? "";
              })()
            : ""
        }
        initialEnabled={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return dev ? !!dev.is_active : true;
              })()
            : true
        }
        initialIntervalHours={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return dev?.interval_hours ?? 1;
              })()
            : 1
        }
        initialNotes={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return (dev?.notes ?? "") || "";
              })()
            : ""
        }
        initialSensors={
          upsertMode === "edit"
            ? (() => {
                const ss = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                )?.sensors;
                return {
                  temperature: !!ss?.temperature,
                  humidity: !!ss?.humidity,
                  light: !!ss?.light,
                  moisture: !!ss?.moisture,
                };
              })()
            : { temperature: true, humidity: true, light: true, moisture: true }
        }
        initialMoistureAlertEnabled={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return Boolean(dev?.moisture_alert_enabled);
              })()
            : undefined
        }
        initialMoistureAlertPct={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return typeof dev?.moisture_alert_threshold === "number"
                  ? dev.moisture_alert_threshold
                  : undefined;
              })()
            : undefined
        }
        initialSendEmailNotifications={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return Boolean(dev?.send_email_notifications);
              })()
            : false
        }
        initialSendPushNotifications={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return Boolean(dev?.send_push_notifications);
              })()
            : false
        }
        initialPumpIncluded={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return Boolean(dev?.pump_included);
              })()
            : false
        }
        initialAutomaticPumpLaunch={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return Boolean(dev?.automatic_pump_launch);
              })()
            : false
        }
        initialPumpThresholdPct={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return typeof dev?.pump_threshold_pct === "number"
                  ? dev.pump_threshold_pct
                  : 30;
              })()
            : 30
        }
        initialSendEmailWateringNotifications={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return Boolean(dev?.send_email_watering_notifications);
              })()
            : false
        }
        initialSendPushWateringNotifications={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return Boolean(dev?.send_push_watering_notifications);
              })()
            : false
        }
        authSecret={
          upsertMode === "edit" ? setupSecret ?? "••••••••••••••" : undefined
        }
        deviceKey={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(
                  (d) => String(d.id) === upsertReadingId
                );
                return dev?.device_key ?? "—";
              })()
            : undefined
        }
        onCancel={() => setUpsertVisible(false)}
        onSave={handleUpsertSave}
        onSendCodeByEmail={handleSendCodeByEmail}
      />

      <SortReadingsModal
        visible={sortModalVisible}
        sortKey={sortKey}
        sortDir={sortDir}
        onCancel={() => {
          setSortModalVisible(false);
          setSortSheetOpen(false);
        }}
        onApply={(k, d) => {
          setSortKey(k);
          setSortDir(d);
          setSortModalVisible(false);
          setSortSheetOpen(false);
        }}
        onReset={() => {
          setSortKey("name");
          setSortDir("asc");
          setSortModalVisible(false);
          setSortSheetOpen(false);
        }}
      />

      <FilterReadingsModal
        visible={filterModalVisible}
        plants={plantOptions}
        locations={locationOptions}
        filters={filters}
        onCancel={() => {
          setFilterModalVisible(false);
          setFilterSheetOpen(false);
        }}
        onApply={(next) => {
          setFilters(next);
          setFilterModalVisible(false);
          setFilterSheetOpen(false);
        }}
        onClearAll={() => {
          setFilters({});
          setFilterModalVisible(false);
          setFilterSheetOpen(false);
        }}
      />

      <SendReadingsExportModal
        visible={exportModalVisible}
        effectiveFilters={effectiveExportFilters}
        plantName={exportPlantName}
        sending={exporting}
        onCancel={() => {
          if (!exporting) setExportModalVisible(false);
        }}
        onSend={handleSendExport}
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