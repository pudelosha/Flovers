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

// New modals
import SortReadingsModal, { SortKey, SortDir } from "../components/SortReadingsModal";
import FilterReadingsModal from "../components/FilterReadingsModal";

// ===== Extend the reading model locally (non-breaking) =====
type Status = "enabled" | "disabled";
type ReadingTileModel = BaseReadingTileModel & {
  location?: string | null;
  status?: Status; // whether the linked device is enabled/disabled
};

// ===== Mock: replace with your service =====
async function fetchCurrentReadings(): Promise<ReadingTileModel[]> {
  return [
    {
      id: "1",
      name: "Ficus",
      location: "Living room",
      status: "enabled",
      lastReadISO: new Date().toISOString(),
      metrics: { temperature: 22, humidity: 61, light: 540, moisture: 44 },
    },
    {
      id: "2",
      name: "Monstera",
      location: "Bedroom",
      status: "disabled",
      lastReadISO: new Date().toISOString(),
      metrics: { temperature: 25, humidity: 58, light: 805, moisture: 35 },
    },
  ];
}
// ===========================================

// ===== Filters shape for the modal =====
type Filters = {
  plantId?: string;     // exact plant from dropdown
  location?: string;    // exact
  status?: Status;      // exact
};

export default function ReadingsScreen() {
  const nav = useNavigation();

  const [items, setItems] = useState<ReadingTileModel[]>([]);
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

  const load = useCallback(async () => {
    const data = await fetchCurrentReadings();
    setItems(data);
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

  // ----- Derived plants & locations for modal options -----
  const plantOptions = useMemo(
    () => items.map((x) => ({ id: x.id, name: x.name })),
    [items]
  );
  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((x) => { if (x.location) set.add(x.location); });
    return Array.from(set);
  }, [items]);

  // ---------- ✨ ENTRANCE ANIMATION (staggered fade & translate) ----------
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
        duration: 280,           // lower = faster
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        delay: i * 50,           // lower = tighter cascade
      })
    );
    Animated.stagger(50, seq).start();
  }, []);

  // ----- Apply filtering & sorting -----
  const derivedItems = useMemo(() => {
    let arr = [...items];

    // Filter by plant (exact via dropdown)
    if (filters.plantId) {
      arr = arr.filter((x) => x.id === filters.plantId);
    }

    // Legacy: allow contains filter by name if filterQuery is used elsewhere in the app
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
  const showFAB = !menuOpenId && !sortSheetOpen && !filterSheetOpen && !sortModalVisible && !filterModalVisible;

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
                onEdit={() => { setMenuOpenId(null); nav.navigate("EditSensors" as never, { id: item.id } as never); }}
                onDelete={() => { setMenuOpenId(null); nav.navigate("DeleteReadingConfirm" as never, { id: item.id } as never); }}
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
              onPress: () => nav.navigate("Scanner" as never), // QR flow to pair device
            },
            {
              key: "device-setup",
              icon: "key-variant",
              label: "Device setup",
              onPress: () => nav.navigate("DeviceSetup" as never), // screen to show secret, sample code, instructions
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
          setFilterQuery(""); // modal now uses exact plant via dropdown
          setFilterModalVisible(false);
          setFilterSheetOpen(false);
        }}
        onClearAll={() => {
          setFilters({});
          setFilterQuery("");
        }}
      />
    </View>
  );
}
