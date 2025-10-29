import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { View, RefreshControl, Pressable, Animated, Easing } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import FAB from "../../../shared/ui/FAB";

import { s } from "../styles/readings.styles";
import ReadingTile from "../components/ReadingTile";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/readings.constants";
import type { ReadingTileModel } from "../types/readings.types";

// ===== Mock: replace with your service =====
async function fetchCurrentReadings(): Promise<ReadingTileModel[]> {
  return [
    { id: "1", name: "Ficus",    lastReadISO: new Date().toISOString(), metrics: { temperature: 22, humidity: 61, light: 540, moisture: 44 } },
    { id: "2", name: "Monstera", lastReadISO: new Date().toISOString(), metrics: { temperature: 25, humidity: 58, light: 805, moisture: 35 } },
  ];
}
// ===========================================

type SortDir = "asc" | "desc";

export default function ReadingsScreen() {
  const nav = useNavigation();

  const [items, setItems] = useState<ReadingTileModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // FAB-related sheet visibility (to control hiding logic)
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // very simple sort: by plant name
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // simple filter: name contains query (extend later if needed)
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

  const derivedItems = useMemo(() => {
    let arr = [...items];

    const q = filterQuery.trim().toLowerCase();
    if (q) arr = arr.filter((x) => x.name.toLowerCase().includes(q));

    arr.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    if (sortDir === "desc") arr.reverse();

    return arr;
  }, [items, sortDir, filterQuery]);

  // Hide FAB when any sheet/menu is open
  const showFAB = !menuOpenId && !sortOpen && !filterOpen;

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

  useEffect(() => {
    if (loading) return;
    const ids = derivedItems.map((x) => x.id);
    primeAnimations(ids);
    const raf = requestAnimationFrame(() => runStaggerIn(ids));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, derivedItems.length]);

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

      {/* FAB — hidden when any sheet/menu is open */}
      {showFAB && (
        <FAB
          bottomOffset={92}
          actions={[
            {
              key: "configure",
              icon: "cog-outline",
              label: "Configure sensors",
              onPress: () => nav.navigate("EditSensors" as never),
            },
            {
              key: "sort",
              icon: "sort",
              label: "Sort",
              onPress: () => {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                setSortOpen(true);
                setTimeout(() => setSortOpen(false), 250);
              },
            },
            {
              key: "filter",
              icon: "filter-variant",
              label: "Filter",
              onPress: () => {
                setFilterOpen(true);
                setTimeout(() => {
                  setFilterQuery("");
                  setFilterOpen(false);
                }, 250);
              },
            },
          ]}
        />
      )}
    </View>
  );
}
