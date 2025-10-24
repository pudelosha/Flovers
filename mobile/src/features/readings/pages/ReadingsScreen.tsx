import React, { useCallback, useMemo, useState } from "react";
import { View, FlatList, RefreshControl, Pressable } from "react-native";
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

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);
        try { await load(); } finally { if (mounted) setLoading(false); }
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

    // filter
    const q = filterQuery.trim().toLowerCase();
    if (q) arr = arr.filter((x) => x.name.toLowerCase().includes(q));

    // sort
    arr.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    if (sortDir === "desc") arr.reverse();

    return arr;
  }, [items, sortDir, filterQuery]);

  // Hide FAB when any sheet/menu is open
  const showFAB = !menuOpenId && !sortOpen && !filterOpen;

  // Skeleton/loader
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

      <FlatList
        style={{ flex: 1 }}
        data={derivedItems}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => (
          <ReadingTile
            data={item}
            isMenuOpen={menuOpenId === item.id}
            onPressBody={() => nav.navigate("ReadingDetails" as never, { id: item.id } as never)}
            onPressMenu={() => setMenuOpenId((curr) => (curr === item.id ? null : item.id))}
            onHistory={() => { setMenuOpenId(null); nav.navigate("ReadingsHistory" as never, { id: item.id } as never); }}
            onEdit={() => { setMenuOpenId(null); nav.navigate("EditSensors" as never, { id: item.id } as never); }}
            onDelete={() => { setMenuOpenId(null); nav.navigate("DeleteReadingConfirm" as never, { id: item.id } as never); }}
            onPlantDetails={() => { setMenuOpenId(null); nav.navigate("PlantDetails" as never, { id: item.id } as never); }}
          />
        )}
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
                // simple toggle ASC/DESC for now
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                setSortOpen(true);
                setTimeout(() => setSortOpen(false), 250); // transient to hide FAB briefly like a sheet
              },
            },
            {
              key: "filter",
              icon: "filter-variant",
              label: "Filter",
              onPress: () => {
                // Example: navigate to a filter input, or open your own modal
                setFilterOpen(true);
                // Demo: set a static filter then close (replace with real modal)
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
