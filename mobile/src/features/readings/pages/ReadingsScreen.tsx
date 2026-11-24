import { useWateringSchedule } from '../../readings/hooks/useWateringSchedule';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { AppTabParamList } from '../../../app/navigation/AppTabs';
import type { FlatList } from 'react-native';
import { useRequestGuard } from '../../../shared/hooks/useRequestGuard';
import { ScreenLoadingSpinner } from '../../../shared/ui/HeaderPresentation';
import ListLoadError from '../../../shared/ui/ListLoadError';
import { useHeaderContentReady } from '../../../shared/ui/HeaderPresentation';
import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  RefreshControl,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
  Text, AnimatedView, AnimatedFlatList } from "../../../shared/theme/native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import MaterialCommunityIcons from "../../../shared/theme/Icon";
import LinearGradient from "../../../shared/theme/Gradient";

import GlassHeader from "../../../shared/ui/GlassHeader";
import { plantAccess } from "../../../shared/utils/plantAccess";
import FAB from "../../../shared/ui/FAB";
import TopSnackbar from "../../../shared/ui/TopSnackbar";

import { s } from "../styles/readings.styles";
import ReadingTile from "../components/ReadingTile";
import { useReadingDevicesRefresh } from "../hooks/useReadingDevicesRefresh";
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
import DeviceInformationModal from "../components/modals/DeviceInformationModal";
import DeviceSetupModal from "../components/modals/DeviceSetupModal";
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
  type ReadingsExportEmailRequest,
} from "../../../api/services/readings.service";

// Pull the API type from centralized readings types
import { ApiReadingDevice } from "../types/readings.types";

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
  const requestGuard = useRequestGuard();
  const setupRequestGuard = useRequestGuard();
  const informationRequestGuard = useRequestGuard();
  useFocusEffect(useCallback(() => {
    setupRequestGuard.activate(); informationRequestGuard.activate();
    return () => { setupRequestGuard.invalidate(); informationRequestGuard.invalidate(); };
  }, [setupRequestGuard, informationRequestGuard]));
  const [informationLoading, setInformationLoading] = useState(false);
  const headerReady = useHeaderContentReady();
  const nav = useNavigation<BottomTabNavigationProp<AppTabParamList>>();

  const { t, i18n } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();

  const tr = useCallback(
    (key: string, fallback?: string, values?: Record<string, unknown>) => {
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
  const [fabCloseSignal, setFabCloseSignal] = useState(0);

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

  // General Information modal and owner-only legacy integration data
  const [deviceInformationVisible, setDeviceInformationVisible] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupIngest, setSetupIngest] = useState<string>("");
  const [setupRead, setSetupRead] = useState<string>("");

  // Per-device setup modal; fresh data is loaded before controls are shown
  const [deviceSetupVisible, setDeviceSetupVisible] = useState(false);
  const [deviceSetupId, setDeviceSetupId] = useState<string | null>(null);
  const [deviceSetupLoading, setDeviceSetupLoading] = useState(false);
  const [deviceSetupSending, setDeviceSetupSending] = useState(false);
  const [deviceSetupData, setDeviceSetupData] =
    useState<ApiReadingDevice | null>(null);

  // Watering schedule modal state

  // Upsert modal state
  const [upsertVisible, setUpsertVisible] = useState(false);
  const [upsertMode, setUpsertMode] = useState<"add" | "edit">("add");
  const [upsertReadingId, setUpsertReadingId] = useState<string | null>(null);

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

  const closeFloatingMenus = useCallback(() => {
    setMenuOpenId(null);
    setFabCloseSignal((value) => value + 1);
  }, []);

  const onToggleMenu = useCallback((id: string) => {
    setFabCloseSignal((value) => value + 1);
    setMenuOpenId((curr) => (curr === id ? null : id));
  }, []);

  // FlatList ref to force scroll-to-top on focus
  const listRef = useRef<FlatList<ReadingTileModel>>(null);

  // ===== Load devices and plant instances =====
  const watering = useWateringSchedule({
    translationScope: 'readings',
    onBeforeOpen: closeFloatingMenus,
    onNotify: showToast,
    onStatusChanged: (id, status) => {
      setDevicesRaw(previous => previous.map(device => String(device.id) === id ? { ...device, ...status } : device));
      setItems(previous => previous.map(item => item.id === id ? {
        ...item, lastPumpRunAt: status.last_pump_run_at ?? null,
        pendingPumpTask: status.pending_pump_task ?? null,
      } : item));
    },
  });
  const { open: openWateringSchedule, visible: wateringScheduleVisible } = watering;

  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    const isCurrent = requestGuard.begin();
    try {
      const [devices, plantsList] = await Promise.all([
        listReadingDevices(),
        fetchPlantInstances(),
      ]);

      if (!isCurrent()) return;
      setDevicesRaw(devices);
      setPlantInstances(Array.isArray(plantsList) ? plantsList : []);

      const tiles = devices.map(toReadingTile);
      setLoadError(false);
      setItems(tiles);
    } catch {
      if (!isCurrent()) return;
      setLoadError(true);
      showToast(
        tr("readings.toasts.loadFailed", "Failed to load devices"),
        "error"
      );
      setDevicesRaw([]);
      setPlantInstances([]);
      setItems([]);
    }
  }, [showToast, tr, requestGuard]);

  // Clear stale tiles on entry so only spinner is visible
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      requestGuard.activate();

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
        requestGuard.invalidate();
      };
    }, [load, requestGuard])
  );

  const applyReadingRefresh = useCallback((devices: ApiReadingDevice[]) => {
    setDevicesRaw(devices);
    setItems(devices.map(toReadingTile));
  }, []);
  useReadingDevicesRefresh(applyReadingRefresh, upsertVisible || deviceSetupVisible || deviceInformationVisible);

  // On focus: reset page state
  useFocusEffect(
    useCallback(() => {
      setSortModalVisible(false);
      setFilterModalVisible(false);
      setExportModalVisible(false);
      setDeleteVisible(false);
      setDeviceInformationVisible(false);
      setDeviceSetupVisible(false);

      setUpsertVisible(false);
      setSortSheetOpen(false);
      setFilterSheetOpen(false);

      setDeviceSetupId(null);
      setDeviceSetupData(null);
      setDeviceSetupLoading(false);
      setDeviceSetupSending(false);







      closeFloatingMenus();

      setFilters({});
      setFilterQuery("");

      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
      });

      return undefined;
    }, [closeFloatingMenus])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    closeFloatingMenus();
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [closeFloatingMenus, load]);

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
    if (loading || !headerReady) return;

    const ids = derivedItems.map((x) => x.id);
    primeAnimations(ids);

    const raf = requestAnimationFrame(() => runStaggerIn(ids));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, headerReady, derivedItems.length]);

  // ---------- Empty-state animation ----------
  const emptyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading || !headerReady) {
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
  }, [loading, headerReady, derivedItems.length, emptyAnim]);

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
    !deviceInformationVisible &&
    !deviceSetupVisible &&
    !wateringScheduleVisible &&
    !upsertVisible;

  // ---- Delete handlers ----
  const openDeleteFor = useCallback(
    (id: string) => {
      closeFloatingMenus();
      const item = items.find((x) => x.id === id);
      setDeleteId(id);
      setDeleteName(item?.name ?? tr("readings.defaults.thisDevice", "this device"));
      setDeleteVisible(true);
    },
    [closeFloatingMenus, items, tr]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return;

    try {
      await apiDeleteReadingDevice(Number(deleteId));
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      setDevicesRaw((prev) => prev.filter((d) => String(d.id) !== deleteId));

      showToast(
        tr("readings.toasts.deviceDeleted", "Device deleted"),
        "success"
      );
    } catch {
      showToast(
        tr("readings.toasts.deleteFailed", "Delete failed"),
        "error"
      );
    } finally {
      setDeleteVisible(false);
      setDeleteId(null);
      setDeleteName("");
    }
  }, [deleteId, showToast, tr]);

  const handleSendExport = useCallback(async () => {
    closeFloatingMenus();

    try {
      setExporting(true);

      await sendReadingsExportEmail({
        ...effectiveExportFilters,
        lang: (i18n.language || currentLanguage || "en").split("-")[0],
      });

      setExportModalVisible(false);

      showToast(
        tr("readings.toasts.exportSent", "Readings export request sent"),
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
          tr("readings.toasts.failedToSendExport", "Failed to send readings export"),
          "error"
        );
      }
    } finally {
      setExporting(false);
    }
  }, [closeFloatingMenus, effectiveExportFilters, i18n.language, currentLanguage, showToast, tr]);

  // ---- Upsert handlers ----
  const openAddDevice = useCallback(async () => {
    closeFloatingMenus();

    if (!plantInstances || plantInstances.length === 0) {
      try {
        const latest = await fetchPlantInstances();
        setPlantInstances(Array.isArray(latest) ? latest : []);
      } catch {}
    }

    setUpsertMode("add");
    setUpsertReadingId(null);
    setUpsertVisible(true);
  }, [closeFloatingMenus, plantInstances]);

  const openEditDevice = useCallback((id: string) => {
    closeFloatingMenus();
    setUpsertMode("edit");
    setUpsertReadingId(id);
    setUpsertVisible(true);
  }, [closeFloatingMenus]);

  const closeDeviceSetup = useCallback(() => {
    setupRequestGuard.cancelPending();
    setDeviceSetupVisible(false);
    setDeviceSetupId(null);
    setDeviceSetupData(null);
    setDeviceSetupLoading(false);
  }, [setupRequestGuard]);

  const openDeviceSetup = useCallback(async (id: string) => {
    closeFloatingMenus();
    const isCurrent = setupRequestGuard.begin();
    setDeviceSetupId(id);
    setDeviceSetupData(null);
    setDeviceSetupLoading(true);
    setDeviceSetupVisible(true);
    try {
      const device = await getReadingDevice(Number(id));
      if (!isCurrent()) return;
      if (!plantAccess(device.access).canEdit) throw new Error("Owner access required");
      setDeviceSetupData(device);
    } catch {
      if (!isCurrent()) return;
      setDeviceSetupVisible(false);
      showToast(tr("readings.toasts.deviceDetailsLoadFailed", "Failed to load device setup"), "error");
    } finally {
      if (isCurrent()) setDeviceSetupLoading(false);
    }
  }, [closeFloatingMenus, setupRequestGuard, showToast, tr]);

  const saveDeviceConfiguration = useCallback(async (payload: import("../types/readings.types").ApiReadingDeviceUpdatePayload) => {
    if (!deviceSetupId || !deviceSetupData || !plantAccess(deviceSetupData.access).canEdit) throw new Error("Owner access required");
    const isCurrent = setupRequestGuard.begin();
    const updated = await updateReadingDevice(Number(deviceSetupId), payload);
    if (!isCurrent()) return;
    setDevicesRaw(previous => previous.map(device => device.id === updated.id ? updated : device));
    setItems(previous => previous.map(item => item.id === String(updated.id) ? toReadingTile(updated) : item));
  }, [deviceSetupId, deviceSetupData, setupRequestGuard]);

  const loadLegacySecret = useCallback(async () => (await fetchDeviceSetup()).secret, []);

  const handleEmailCodeFromDeviceSetup = useCallback(async () => {
    if (!deviceSetupId) {
      showToast(
        tr("readings.toasts.missingDeviceId", "Missing device ID"),
        "error"
      );
      return;
    }

    try {
      setDeviceSetupSending(true);

      await sendDeviceCodeByEmail(Number(deviceSetupId));

      showToast(
        tr("readings.toasts.codeSentByEmail", "Code sent to your email"),
        "success"
      );
    } catch {
      showToast(
        tr("readings.toasts.sendCodeEmailFailed", "Send email failed"),
        "error"
      );
    } finally {
      setDeviceSetupSending(false);
    }
  }, [deviceSetupId, showToast, tr]);



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
      sendEmailNotifications?: boolean;
      sendPushNotifications?: boolean;
      sendEmailMissingReadings?: boolean;
      sendPushMissingReadings?: boolean;
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
            send_email_missing_readings: !!payload.sendEmailMissingReadings,
            send_push_missing_readings: !!payload.sendPushMissingReadings,
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
            send_email_missing_readings: !!payload.sendEmailMissingReadings,
            send_push_missing_readings: !!payload.sendPushMissingReadings,
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
      } catch {
        setUpsertVisible(false);

        showToast(
          isCreate
            ? tr("readings.toasts.addFailed", "Add failed")
            : tr("readings.toasts.updateFailed", "Update failed"),
          "error"
        );
      }
    },
    [upsertReadingId, load, showToast, tr]
  );

  const handleToggleAutoPump = useCallback(
    async (id: string, enabled: boolean) => {
      closeFloatingMenus();

      const prevItems = items;
      const prevDevicesRaw = devicesRaw;
      const currentDevice = devicesRaw.find((d) => String(d.id) === id);
      const pumpThresholdPct =
        typeof currentDevice?.pump_threshold_pct === "number"
          ? currentDevice.pump_threshold_pct
          : 30;

      setItems((curr) =>
        curr.map((x) =>
          x.id === id
            ? {
                ...x,
                automaticPumpLaunch: enabled,
                pumpThresholdPct: enabled ? x.pumpThresholdPct ?? pumpThresholdPct : x.pumpThresholdPct,
              }
            : x
        )
      );

      setDevicesRaw((curr) =>
        curr.map((d) =>
          String(d.id) === id
            ? {
                ...d,
                automatic_pump_launch: enabled,
                pump_threshold_pct: enabled ? d.pump_threshold_pct ?? pumpThresholdPct : d.pump_threshold_pct,
              }
            : d
        )
      );

      try {
        const updated = await toggleAutoPump(Number(id), {
          automatic_pump_launch: enabled,
          ...(enabled ? { pump_threshold_pct: pumpThresholdPct } : {}),
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
      } catch {
        setItems(prevItems);
        setDevicesRaw(prevDevicesRaw);

        showToast(
          tr(
            "readings.toasts.autoPumpUpdateFailed",
            "Failed to update automatic pump setting"
          ),
          "error"
        );
      }
    },
    [closeFloatingMenus, items, devicesRaw, showToast, tr]
  );

  const openDeviceInformation = useCallback(async () => {
    closeFloatingMenus();
    const isCurrent = informationRequestGuard.begin();
    setInformationLoading(true);
    setDeviceInformationVisible(true);
    try {
      const data = await fetchDeviceSetup();
      if (!isCurrent()) return;
      setSetupSecret(data.secret);
      setSetupIngest(data.endpoints?.ingest || "");
      setSetupRead(data.endpoints?.read || "");
    } catch {
      if (!isCurrent()) return;
      setDeviceInformationVisible(false);
      showToast(tr("readings.toasts.setupLoadFailed", "Failed to load information"), "error");
    } finally {
      if (isCurrent()) setInformationLoading(false);
    }
  }, [closeFloatingMenus, informationRequestGuard, showToast, tr]);

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
        <ScreenLoadingSpinner size={56} color="#FFFFFF" />
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
        <Pressable onPress={closeFloatingMenus} style={s.backdrop} />
      )}

      <AnimatedFlatList
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
          const isOpen = menuOpenId === item.id;

          return (
            <AnimatedView
              needsOffscreenAlphaCompositing
              style={[
                { opacity, transform: [{ translateY }, { scale }] },
                isOpen && { zIndex: 50 },
              ]}
            >
              <ReadingTile
                data={item}
                isMenuOpen={isOpen}
                onPressBody={closeFloatingMenus}
                onPressMenu={() => onToggleMenu(item.id)}
                onEdit={() => {
                  openEditDevice(item.id);
                }}
                onDeviceDetails={() => {
                  openDeviceSetup(item.id);
                }}
                onHistory={() => {
                  closeFloatingMenus();
                  nav.navigate("ReadingsHistory", { id: item.id });
                }}
                onPlantDetails={() => {
                  closeFloatingMenus();
                  if (dev?.plant) {
                    nav.navigate(
                      "PlantDetails",
                      { id: String(dev.plant) }
                    );
                  }
                }}
                onDelete={() => {
                  openDeleteFor(item.id);
                }}
                onMetricPress={(metric) => {
                  closeFloatingMenus();
                  nav.navigate(
                    "ReadingsHistory",
                    { metric, range: "day", id: item.id }
                  );
                }}
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
            </AnimatedView>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={() => <View style={{ height: 0 }} />}
        ListFooterComponent={() => <View style={{ height: 200 }} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={closeFloatingMenus}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
            loadError ? <ListLoadError message={tr("readings.toasts.loadFailed", "Failed to load devices")} onRetry={() => void onRefresh()} /> :
          !loading ? (
            <AnimatedView
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
                        'Devices let you ingest temperature, humidity, light, and soil moisture readings for a plant.\n\nTap “+ Add device” to choose a plant and sensors. Open Device setup from its tile menu to set the reading interval and pump options or email Arduino/ESP code. Information contains API documentation and legacy account-secret management.'
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            </AnimatedView>
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
            closeSignal={fabCloseSignal}
            position={settings.fabPosition}
            actions={[
              {
                key: "link-device",
                icon: "link-variant",
                label: tr("readings.fab.linkDevice", "Add device"),
                onPress: openAddDevice,
              },
              {
                key: "device-setup",
                icon: "key-variant",
                label: tr("readings.fab.deviceSetup", "Information"),
                onPress: openDeviceInformation,
              },
              {
                key: "sort",
                icon: "sort",
                label: tr("readings.fab.sort", "Sort"),
                onPress: () => {
                  closeFloatingMenus();
                  setSortSheetOpen(true);
                  setSortModalVisible(true);
                },
              },
              {
                key: "filter",
                icon: "filter-variant",
                label: tr("readings.fab.filter", "Filter"),
                onPress: () => {
                  closeFloatingMenus();
                  setFilterSheetOpen(true);
                  setFilterModalVisible(true);
                },
              },
              ...(derivedItems.some((item) => plantAccess(item.access).canEdit) ? [{
                key: "send-export",
                icon: "email-send-outline",
                label: String(tr("readings.fab.sendExport", "Send export")),
                onPress: () => {
                  closeFloatingMenus();
                  setExportModalVisible(true);
                },
              }] : []),
              ...(isFilterActive
                ? [
                    {
                      key: "clear-filter",
                      icon: "filter-remove",
                      label: String(tr("readings.fab.clearFilter", "Clear filter")),
                      onPress: () => {
                        closeFloatingMenus();
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

      <DeviceInformationModal
        visible={deviceInformationVisible}
        loading={informationLoading}
        writeEndpoint={setupIngest || "—"}
        readEndpoint={setupRead || "—"}
        authSecret={setupSecret ?? "••••••••••••••"}
        onClose={() => { informationRequestGuard.cancelPending(); setDeviceInformationVisible(false); setSetupSecret(null); }}
        onRotateSecret={async () => {
          try {
            const { secret } = await rotateAccountSecret();
            setSetupSecret(secret);

            showToast(
              tr("readings.toasts.secretRotated", "Secret rotated"),
              "success"
            );
          } catch {
            showToast(
              tr("readings.toasts.rotateFailed", "Rotate failed"),
              "error"
            );
          }
        }}
      />

      <DeviceSetupModal
        visible={deviceSetupVisible}
        loading={deviceSetupLoading}
        sending={deviceSetupSending}
        device={deviceSetupData}
        onClose={closeDeviceSetup}
        onSave={saveDeviceConfiguration}
        onLoadLegacySecret={loadLegacySecret}
        onEmailCode={handleEmailCodeFromDeviceSetup}
        onPair={(action) => {
          const id = deviceSetupData?.id;
          if (!id || !plantAccess(deviceSetupData?.access).canEdit) return;
          closeDeviceSetup();
          nav.navigate('Scanner', { deviceId: id, deviceOnly: true, action });
        }}
      />

      <WateringScheduleModal {...watering.modalProps} />

      <UpsertReadingDeviceModal
        visible={upsertVisible}
        mode={upsertMode}
        plants={plantInstances.filter((p) => plantAccess(p.access).canEdit).map((p) => ({
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
        initialSendEmailMissingReadings={upsertMode === "edit"
          ? !!devicesRaw.find((device) => String(device.id) === upsertReadingId)?.send_email_missing_readings : false}
        initialSendPushMissingReadings={upsertMode === "edit"
          ? !!devicesRaw.find((device) => String(device.id) === upsertReadingId)?.send_push_missing_readings : false}
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
        onCancel={() => setUpsertVisible(false)}
        onSave={handleUpsertSave}
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
