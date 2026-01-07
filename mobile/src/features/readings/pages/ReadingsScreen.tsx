import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { View, RefreshControl, Pressable, Animated, Easing, StyleSheet, Text } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import GlassHeader from "../../../shared/ui/GlassHeader";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import FAB from "../../../shared/ui/FAB";
import TopSnackbar from "../../../shared/ui/TopSnackbar";

import { s } from "../styles/readings.styles";
import ReadingTile from "../components/ReadingTile";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/readings.constants";
import type { ReadingTileModel as BaseReadingTileModel } from "../types/readings.types";

// Modals
import SortReadingsModal, { SortKey, SortDir } from "../components/modals/SortReadingsModal";
import FilterReadingsModal from "../components/modals/FilterReadingsModal";
import ConfirmDeleteReadingModal from "../components/modals/ConfirmDeleteReadingModal";
import DeviceSetupModal from "../components/modals/DeviceSetupModal";
import UpsertReadingDeviceModal from "../components/modals/UpsertReadingDeviceModal";

// === Services (readings) ===
import {
  listReadingDevices,
  createReadingDevice,
  updateReadingDevice,
  deleteReadingDevice as apiDeleteReadingDevice,
  rotateAccountSecret,
  toReadingTile,
  fetchDeviceSetup,
} from "../../../api/services/readings.service";

// Pull the API type from centralized readings types
import { ApiReadingDevice } from "../types/readings.types";

// === Services (plants → Plant Instances) ===
import { fetchPlantInstances, type ApiPlantInstanceListItem } from "../../../api/services/plant-instances.service";

// i18n
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider"; // 👈 NEW

// ===== Extend the reading model locally (non-breaking) =====
type Status = "enabled" | "disabled";
type ReadingTileModel = BaseReadingTileModel & {
  location?: string | null;
  status?: Status; // whether the linked device is enabled/disabled
};

// ===== Filters shape for the modal =====
type Filters = {
  plantId?: string; // exact plant from dropdown
  location?: string; // exact
  status?: Status; // exact
};

export default function ReadingsScreen() {
  const nav = useNavigation();

  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings(); // 👈 NEW

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

  // FAB-related flags (to hide FAB only for sheets/modals; NOT for per-tile menus)
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Sort modal state
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name"); // name | location | lastRead
  const [sortDir, setSortDir] = useState<SortDir>("asc"); // asc | desc

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<Filters>({}); // plantId, location, status

  // Backwards-compat: legacy quick filter query (maps to "name contains"), keep existing logic intact
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

  // Upsert (add/edit) device modal state
  const [upsertVisible, setUpsertVisible] = useState(false);
  const [upsertMode, setUpsertMode] = useState<"add" | "edit">("add");
  const [upsertReadingId, setUpsertReadingId] = useState<string | null>(null);
  const [upsertReadingName, setUpsertReadingName] = useState<string | undefined>(undefined);

  // Shared toast (TopSnackbar)
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] = useState<"default" | "success" | "error">("default");

  const showToast = useCallback((message: string, variant: "default" | "success" | "error" = "default") => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  }, []);

  // FlatList ref to force scroll-to-top on focus
  const listRef = useRef<Animated.FlatList<any>>(null);

  // ===== Load devices and plant instances =====
  const load = useCallback(async () => {
    try {
      const [devices, plantsList] = await Promise.all([listReadingDevices(), fetchPlantInstances()]);

      setDevicesRaw(devices);
      setPlantInstances(Array.isArray(plantsList) ? plantsList : []);

      const tiles = devices.map(toReadingTile);
      setItems(tiles);
    } catch (e: any) {
      const msg =
        typeof e?.message === "string" && e.message.toLowerCase().includes("401")
          ? tr("readings.toasts.unauthorized", "Unauthorized. Please log in again.")
          : e?.message || tr("readings.toasts.loadFailed", "Failed to load devices");
      showToast(msg, "error");
      setDevicesRaw([]);
      setPlantInstances([]);
      setItems([]);
    }
  }, [showToast, tr]);

  // Clear stale tiles on entry so only spinner is visible, then load and animate
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);
        setItems([]); // clear to avoid stale flash
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

  // 🔁 On focus: ensure page is reset (hide all modals/sheets, close menus, scroll to top)
  useFocusEffect(
    useCallback(() => {
      // hide all modals/sheets
      setSortModalVisible(false);
      setFilterModalVisible(false);
      setDeleteVisible(false);
      setDeviceSetupVisible(false);
      setUpsertVisible(false);
      setSortSheetOpen(false);
      setFilterSheetOpen(false);

      // close any 3-dot dropdown
      setMenuOpenId(null);

      // reset all filters
      setFilters({});
      setFilterQuery("");

      // scroll to top
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

  // ----- Derived plants & locations for Filter modal options -----
  const plantOptions = useMemo(() => items.map((x) => ({ id: x.id, name: x.name })), [items]);
  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((x) => {
      if (x.location) set.add(x.location);
    });
    return Array.from(set);
  }, [items]);

  // ---------- ✨ ENTRANCE ANIMATION (tiles) ----------
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

  // Is any filter active? (includes legacy text query)
  const isFilterActive = useMemo(() => {
    return Boolean(filters.plantId || filters.location || filters.status || (filterQuery && filterQuery.trim().length > 0));
  }, [filters, filterQuery]);

  // ----- Apply filtering & sorting -----
  const derivedItems = useMemo(() => {
    let arr = [...items];

    // Filter by plant (exact via dropdown)
    if (filters.plantId) {
      arr = arr.filter((x) => x.id === filters.plantId);
    }

    // Legacy: contains filter by name
    const q = (filterQuery || "").trim().toLowerCase();
    if (q) {
      arr = arr.filter((x) => x.name?.toLowerCase().includes(q));
    }

    // Filter by location (exact)
    if (filters.location) {
      arr = arr.filter((x) => (x.location ?? "").toLowerCase() === filters.location!.toLowerCase());
    }

    // Filter by status (exact)
    if (filters.status) {
      arr = arr.filter((x) => (x.status ?? "enabled") === filters.status);
    }

    // Sorting
    const collator = new Intl.Collator(undefined, { sensitivity: "base" });

    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = collator.compare(a.name ?? "", b.name ?? "");
      } else if (sortKey === "location") {
        cmp = collator.compare(a.location ?? "", b.location ?? "");
      } else {
        // lastRead
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

  // ---------- ✨ EMPTY-STATE FRAME ANIMATION ("No devices yet") ----------
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

  // Keep FAB visible even when a 3-dot tile menu is open
  const showFAB =
    !sortSheetOpen &&
    !filterSheetOpen &&
    !sortModalVisible &&
    !filterModalVisible &&
    !deleteVisible &&
    !deviceSetupVisible &&
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

  // ---- Upsert (add/edit) handlers ----
  const openAddDevice = useCallback(async () => {
    // If plants didn't load yet (or were empty due to a race), fetch right now
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
      // ensure we have a fresh secret before opening the edit modal
      try {
        const data = await fetchDeviceSetup();
        setSetupSecret(data.secret);
        setSetupIngest(data.endpoints?.ingest || "");
        setSetupRead(data.endpoints?.read || "");
      } catch {
        // keep going; modal will show masked secret if fetch fails
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
    }) => {
      const isCreate = payload.mode === "add";
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
              moisture_alert_enabled: payload.sensors.moistureAlertEnabled,
              moisture_alert_pct: payload.sensors.moistureAlertPct,
            },
          });
        } else {
          if (!upsertReadingId) return;
          await updateReadingDevice(Number(upsertReadingId), {
            plant: Number(payload.plantId),
            device_name: payload.name,
            notes: payload.notes ?? null,
            is_active: typeof payload.enabled === "boolean" ? payload.enabled : undefined,
            interval_hours: payload.intervalHours,
            sensors: {
              temperature: payload.sensors.temperature,
              humidity: payload.sensors.humidity,
              light: payload.sensors.light,
              moisture: payload.sensors.moisture,
              moisture_alert_enabled: payload.sensors.moistureAlertEnabled,
              moisture_alert_pct: payload.sensors.moistureAlertPct ?? null,
            },
          });
        }

        setUpsertVisible(false);
        await load(); // refresh devices + plant instances
        showToast(
          tr(isCreate ? "readings.toasts.deviceAdded" : "readings.toasts.deviceUpdated", isCreate ? "Device added" : "Device updated"),
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

  // ---- Device setup: fetch endpoints + secret then show modal ----
  const openDeviceSetup = useCallback(async () => {
    try {
      const data = await fetchDeviceSetup();
      setSetupSecret(data.secret);
      setSetupIngest(data.endpoints?.ingest || "");
      setSetupRead(data.endpoints?.read || "");
    } catch (e: any) {
      // keep modal usable even if fetch fails
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

  const isEmpty = derivedItems.length === 0;

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

      {menuOpenId && <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} />}

      <Animated.FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={derivedItems}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => {
          const v = getAnimForId(item.id);
          const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
          const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
          const opacity = v;

          // Look up the raw device to get device_name, sensors, *and plant id*
          const dev = devicesRaw.find((d) => String(d.id) === item.id);

          return (
            <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
              <ReadingTile
                data={item}
                isMenuOpen={menuOpenId === item.id}
                onPressBody={() => nav.navigate("ReadingDetails" as never, { id: item.id } as never)}
                onPressMenu={() => setMenuOpenId((curr) => (curr === item.id ? null : item.id))}
                onHistory={() => {
                  setMenuOpenId(null);
                  nav.navigate("ReadingsHistory" as never, { id: item.id } as never);
                }}
                onEdit={() => {
                  setMenuOpenId(null);
                  openEditDevice(item.id);
                }}
                onDelete={() => {
                  setMenuOpenId(null);
                  openDeleteFor(item.id);
                }}
                onPlantDetails={() => {
                  setMenuOpenId(null);
                  if (dev?.plant) {
                    nav.navigate("PlantDetails" as never, { id: String(dev.plant) } as never);
                  }
                }}
                onMetricPress={(metric) => nav.navigate("ReadingsHistory" as never, { metric, range: "day", id: item.id } as never)}
                deviceName={dev?.device_name}
                sensors={{
                  temperature: !!dev?.sensors?.temperature,
                  humidity: !!dev?.sensors?.humidity,
                  light: !!dev?.sensors?.light,
                  moisture: !!dev?.sensors?.moisture,
                }}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
              <View style={{ borderRadius: 28, overflow: "hidden", minHeight: 140 }}>
                <BlurView
                  style={StyleSheet.absoluteFill}
                  blurType="light"
                  blurAmount={20}
                  overlayColor="transparent"
                  reducedTransparencyFallbackColor="transparent"
                />
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.20)" }]} />
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    { borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.20)" },
                  ]}
                />

                <View style={s.emptyInner}>
                  <MaterialCommunityIcons name="access-point" size={26} color="#FFFFFF" style={{ marginBottom: 10 }} />
                  <Text style={s.emptyTitle}>{tr("readings.empty.title", "No devices yet")}</Text>

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
            position={settings.fabPosition} // 👈 NEW (left/right)
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

      {/* Delete modal */}
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

      {/* Device setup */}
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

      {/* Upsert (add/edit) reading device */}
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
                const dev = devicesRaw.find((d) => String(d.id) === upsertReadingId);
                return dev ? String(dev.plant) : "";
              })()
            : ""
        }
        initialName={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find((d) => String(d.id) === upsertReadingId);
                return dev?.device_name ?? "";
              })()
            : ""
        }
        initialEnabled={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find((d) => String(d.id) === upsertReadingId);
                return dev ? !!dev.is_active : true;
              })()
            : true
        }
        initialIntervalHours={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find((d) => String(d.id) === upsertReadingId);
                return dev?.interval_hours ?? 5;
              })()
            : 5
        }
        initialNotes={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find((d) => String(d.id) === upsertReadingId);
                return (dev?.notes ?? "") || "";
              })()
            : ""
        }
        initialSensors={
          upsertMode === "edit"
            ? (() => {
                const ss = devicesRaw.find((d) => String(d.id) === upsertReadingId)?.sensors;
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
                const ss = devicesRaw.find((d) => String(d.id) === upsertReadingId)?.sensors;
                return Boolean(ss?.moisture_alert_enabled);
              })()
            : undefined
        }
        initialMoistureAlertPct={
          upsertMode === "edit"
            ? (() => {
                const ss = devicesRaw.find((d) => String(d.id) === upsertReadingId)?.sensors;
                return typeof ss?.moisture_alert_pct === "number" ? ss!.moisture_alert_pct! : undefined;
              })()
            : undefined
        }
        authSecret={upsertMode === "edit" ? (setupSecret ?? "••••••••••••••") : undefined}
        deviceKey={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find((d) => String(d.id) === upsertReadingId);
                return dev?.device_key ?? "—";
              })()
            : undefined
        }
        onCancel={() => setUpsertVisible(false)}
        onSave={handleUpsertSave}
      />

      {/* Sort modal */}
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

      {/* Filter modal */}
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

      {/* Top Snackbar (shared toast) */}
      <TopSnackbar visible={toastVisible} message={toastMsg} variant={toastVariant} onDismiss={() => setToastVisible(false)} />
    </View>
  );
}
