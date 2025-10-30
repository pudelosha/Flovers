import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { View, RefreshControl, Pressable, Animated, Easing } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import FAB from "../../../shared/ui/FAB";

import { s } from "../styles/readings.styles";
import ReadingTile from "../components/ReadingTile";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/readings.constants";
import type { ReadingTileModel as BaseReadingTileModel } from "../types/readings.types";

// Modals
import SortReadingsModal, { SortKey, SortDir } from "../components/SortReadingsModal";
import FilterReadingsModal from "../components/FilterReadingsModal";
import ConfirmDeleteReadingModal from "../components/ConfirmDeleteReadingModal";
import DeviceSetupModal from "../components/DeviceSetupModal";
import UpsertReadingDeviceModal from "../components/UpsertReadingDeviceModal";

// === Services (readings) ===
import {
  listReadingDevices,
  createReadingDevice,
  updateReadingDevice,
  deleteReadingDevice as apiDeleteReadingDevice,
  rotateAccountSecret,
  toReadingTile,
} from "../../../api/services/readings.service";

// Pull the API type from centralized readings types
import { ApiReadingDevice } from "../types/readings.types";

// === Services (plants → Plant Instances) ===
import {
  fetchPlantInstances,                    // ✅ FIX: import the function
  type ApiPlantInstanceListItem,          // ✅ FIX: import the type
} from "../../../api/services/plant-instances.service";

// ===== Extend the reading model locally (non-breaking) =====
type Status = "enabled" | "disabled";
type ReadingTileModel = BaseReadingTileModel & {
  location?: string | null;
  status?: Status; // whether the linked device is enabled/disabled
};

// ===== Filters shape for the modal =====
type Filters = {
  plantId?: string;     // exact plant from dropdown
  location?: string;    // exact
  status?: Status;      // exact
};

export default function ReadingsScreen() {
  const nav = useNavigation();

  const [items, setItems] = useState<ReadingTileModel[]>([]);
  const [devicesRaw, setDevicesRaw] = useState<ApiReadingDevice[]>([]);
  const [plantInstances, setPlantInstances] = useState<ApiPlantInstanceListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // FAB-related flags (to hide FAB when any sheet/menu is open)
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Sort modal state
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name"); // name | location | lastRead
  const [sortDir, setSortDir] = useState<SortDir>("asc");   // asc | desc

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<Filters>({}); // plantId, location, status

  // Backwards-compat: legacy quick filter query (maps to "name contains"), keep existing logic intact
  const [filterQuery, setFilterQuery] = useState<string>("");

  // Delete modal state
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");

  // Device setup (dummy) modal state
  const [deviceSetupVisible, setDeviceSetupVisible] = useState(false);

  // Upsert (add/edit) device modal state
  const [upsertVisible, setUpsertVisible] = useState(false);
  const [upsertMode, setUpsertMode] = useState<"add" | "edit">("add");
  const [upsertReadingId, setUpsertReadingId] = useState<string | null>(null);
  const [upsertReadingName, setUpsertReadingName] = useState<string | undefined>(undefined);

  // ===== Load devices and plant instances =====
  const load = useCallback(async () => {
    const [devices, plantsList] = await Promise.all([
      listReadingDevices(),
      fetchPlantInstances(),
    ]);

    setDevicesRaw(devices);
    setPlantInstances(Array.isArray(plantsList) ? plantsList : []);

    const tiles = devices.map(toReadingTile);
    setItems(tiles);
  }, []);

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
      return () => { mounted = false; };
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  // ----- Derived plants & locations for Filter modal options (kept as-is) -----
  const plantOptions = useMemo(
    () => items.map((x) => ({ id: x.id, name: x.name })),
    [items]
  );
  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((x) => { if (x.location) set.add(x.location); });
    return Array.from(set);
  }, [items]);

  // ---------- ✨ ENTRANCE ANIMATION ----------
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

  // ----- Apply filtering & sorting -----
  const derivedItems = useMemo(() => {
    let arr = [...items];

    // Filter by plant (exact via dropdown; kept as-is)
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

  // Hide FAB when any sheet/menu/modal is open
  const showFAB =
    !menuOpenId &&
    !sortSheetOpen &&
    !filterSheetOpen &&
    !sortModalVisible &&
    !filterModalVisible &&
    !deleteVisible &&
    !deviceSetupVisible &&
    !upsertVisible;

  // ---- Delete handlers ----
  const openDeleteFor = useCallback((id: string) => {
    const item = items.find((x) => x.id === id);
    setDeleteId(id);
    setDeleteName(item?.name ?? "this reading");
    setDeleteVisible(true);
  }, [items]);

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      await apiDeleteReadingDevice(Number(deleteId));
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      setDevicesRaw((prev) => prev.filter((d) => String(d.id) !== deleteId));
    } finally {
      setDeleteVisible(false);
      setDeleteId(null);
      setDeleteName("");
    }
  }, [deleteId]);

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

  const openEditDevice = useCallback((id: string) => {
    const item = items.find((x) => x.id === id);
    setUpsertMode("edit");
    setUpsertReadingId(id);
    setUpsertReadingName(item?.name);
    setUpsertVisible(true);
  }, [items]);

  const handleUpsertSave = useCallback(async (payload: {
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
    if (payload.mode === "add") {
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
  }, [upsertReadingId, load]);

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title="Readings"
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
        title="Readings"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate("Scanner" as never)}
        showSeparator={false}
      />

      {menuOpenId && <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} />}

      <Animated.FlatList
        style={{ flex: 1 }}
        data={derivedItems}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => {
          const v = getAnimForId(item.id);
          const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
          const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
          const opacity = v;

          return (
            <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
              <ReadingTile
                data={item}
                isMenuOpen={menuOpenId === item.id}
                onPressBody={() => nav.navigate("ReadingDetails" as never, { id: item.id } as never)}
                onPressMenu={() => setMenuOpenId((curr) => (curr === item.id ? null : item.id))}
                onHistory={() => { setMenuOpenId(null); nav.navigate("ReadingsHistory" as never, { id: item.id } as never); }}
                onEdit={() => {
                  setMenuOpenId(null);
                  openEditDevice(item.id);
                }}
                onDelete={() => {
                  setMenuOpenId(null);
                  openDeleteFor(item.id);
                }}
                onPlantDetails={() => { setMenuOpenId(null); nav.navigate("PlantDetails" as never, { id: item.id } as never); }}
                // deep-link into ReadingsHistory with the selected metric
                onMetricPress={(metric) =>
                  nav.navigate("ReadingsHistory" as never, { metric, range: "day", id: item.id } as never)
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      />

      {/* FAB — hidden when any sheet/menu/modal is open */}
      {showFAB && (
        <FAB
          bottomOffset={92}
          actions={[
            {
              key: "link-device",
              icon: "link-variant",
              label: "Link device",
              onPress: openAddDevice,
            },
            {
              key: "device-setup",
              icon: "key-variant",
              label: "Device setup",
              onPress: () => setDeviceSetupVisible(true),
            },
            {
              key: "sort",
              icon: "sort",
              label: "Sort",
              onPress: () => {
                setSortSheetOpen(true);
                setSortModalVisible(true);
              },
            },
            {
              key: "filter",
              icon: "filter-variant",
              label: "Filter",
              onPress: () => {
                setFilterSheetOpen(true);
                setFilterModalVisible(true);
              },
            },
          ]}
        />
      )}

      {/* Sort modal */}
      <SortReadingsModal
        visible={sortModalVisible}
        sortKey={sortKey}
        sortDir={sortDir}
        onCancel={() => {
          setSortModalVisible(false);
          setSortSheetOpen(false);
        }}
        onApply={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
          setSortModalVisible(false);
          setSortSheetOpen(false);
        }}
        onReset={() => {
          setSortKey("name");
          setSortDir("asc");
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
        onApply={(f) => {
          setFilters(f);
          // Keep legacy "contains name" quick filter intact if used elsewhere
          setFilterQuery("");
          setFilterModalVisible(false);
          setFilterSheetOpen(false);
        }}
        onClearAll={() => {
          setFilters({});
          setFilterQuery("");
        }}
      />

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
        onClose={() => setDeviceSetupVisible(false)}
        onRotateSecret={async () => {
          try {
            await rotateAccountSecret();
          } catch {}
        }}
      />

      {/* Upsert (add/edit) reading device */}
      <UpsertReadingDeviceModal
        visible={upsertVisible}
        mode={upsertMode}
        // Feed REAL Plant Instances (handle various location field names)
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
        // For edit: use device's plant FK. For add: empty to force "Select plant".
        initialPlantId={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(d => String(d.id) === upsertReadingId);
                return dev ? String(dev.plant) : "";
              })()
            : ""
        }
        initialName={upsertMode === "edit" ? upsertReadingName : ""}
        initialEnabled={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(d => String(d.id) === upsertReadingId);
                return dev ? !!dev.is_active : true;
              })()
            : true
        }
        // Defaults; you can feed real values later if needed
        initialSensors={{ temperature: true, humidity: true, light: true, moisture: true }}
        initialHumidityAlertPct={30}
        initialIntervalHours={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(d => String(d.id) === upsertReadingId);
                return dev?.interval_hours ?? 5;
              })()
            : 5
        }
        authSecret={upsertMode === "edit" ? "••••••••••••••" : undefined}
        deviceKey={
          upsertMode === "edit"
            ? (() => {
                const dev = devicesRaw.find(d => String(d.id) === upsertReadingId);
                return dev?.device_key ?? "—";
              })()
            : undefined
        }
        onCancel={() => setUpsertVisible(false)}
        onSave={handleUpsertSave}
      />
    </View>
  );
}
