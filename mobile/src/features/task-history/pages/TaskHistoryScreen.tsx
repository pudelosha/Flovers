// C:\Projekty\Python\Flovers\mobile\src\features\task-history\pages\TaskHistoryScreen.tsx
import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  View,
  Text,
  RefreshControl,
  Animated,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import GlassHeader from "../../../shared/ui/GlassHeader";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import TopSnackbar from "../../../shared/ui/TopSnackbar";
import FAB from "../../../shared/ui/FAB";

import { s } from "../styles/task-history.styles";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/task-history.constants";
import TaskHistoryTile from "../components/TaskHistoryTile";
import type { TaskHistoryItem } from "../types/task-history.types";

// completed tasks via home history service
import { fetchHomeHistoryTasks } from "../../../api/services/home.service";

import SortHistoryTasksModal, {
  HistorySortDir,
  HistorySortKey,
} from "../components/SortHistoryTasksModal";
import FilterHistoryTasksModal, {
  HistoryFilters as HistoryFilterShape,
} from "../components/FilterHistoryTasksModal";
import DeleteHistoryTasksModal, {
  HistoryDeletePayload,
} from "../components/DeleteHistoryTasksModal";

type RouteParams = {
  plantId?: string; // optional: when passed, show history for one plant
};

type HistoryFilters = HistoryFilterShape;

const INITIAL_FILTERS: HistoryFilters = {
  types: [],
  plantId: undefined,
  location: undefined,
  completedFrom: undefined,
  completedTo: undefined,
};

export default function TaskHistoryScreen() {
  const nav = useNavigation();
  const route = useRoute<any>();
  const params = (route?.params || {}) as RouteParams;
  const plantIdFilter = params.plantId;

  const [items, setItems] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] =
    useState<"default" | "success" | "error">("default");

  const listRef = useRef<Animated.FlatList<TaskHistoryItem>>(null);

  const showToast = (
    message: string,
    variant: "default" | "success" | "error" = "default"
  ) => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };

  // --- SORT / FILTER / DELETE STATE ---
  const [filters, setFilters] = useState<HistoryFilters>(INITIAL_FILTERS);
  const [sortKey, setSortKey] = useState<HistorySortKey>("completedAt");
  const [sortDir, setSortDir] = useState<HistorySortDir>("desc");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isFilterActive = useMemo(
    () =>
      Boolean(
        (filters.types && filters.types.length > 0) ||
        filters.plantId ||
        filters.location ||
        filters.completedFrom ||
        filters.completedTo
      ),
    [filters]
  );

  // --- MENU STATE (only one open at a time, like Home / Reminders) ---
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // --- DATA LOAD (completed tasks) ---
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchHomeHistoryTasks();
      const allItems = data as unknown as TaskHistoryItem[];

      const filteredByPlant = plantIdFilter
        ? allItems.filter((x) => (x as any).plantId === plantIdFilter)
        : allItems;

      setItems(filteredByPlant);
    } catch (e: any) {
      showToast(e?.message || "Failed to load task history", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [plantIdFilter]);

  // Refresh on focus (clear stale list first) + reset UI state
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      // reset modal & sort/filter/menu state on every focus
      setSortOpen(false);
      setFilterOpen(false);
      setDeleteOpen(false);
      setOpenMenuId(null);
      setFilters(INITIAL_FILTERS);
      setSortKey("completedAt");
      setSortDir("desc");

      (async () => {
        setLoading(true);
        setItems([]);
        try {
          await load();
        } finally {
          if (!mounted) return;
        }
      })();
      return () => {
        mounted = false;
      };
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setOpenMenuId(null);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // Options for plant & location dropdowns (derived from items)
  const plantOptions = useMemo(
    () => {
      const map = new Map<string, string>();
      items.forEach((item) => {
        const pid = (item as any).plantId as string | undefined;
        if (pid && !map.has(pid)) {
          map.set(pid, item.plant || "Unnamed plant");
        }
      });
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    },
    [items]
  );

  const locationOptions = useMemo(
    () => {
      const set = new Set<string>();
      items.forEach((item) => {
        if (item.location) set.add(item.location);
      });
      return Array.from(set);
    },
    [items]
  );

  // ===== DERIVED LIST (sort + filter) =====
  const derivedItems = useMemo(() => {
    const typeSet = new Set(filters.types || []);

    const fromDate = filters.completedFrom ? new Date(filters.completedFrom) : null;
    const toDate = filters.completedTo ? new Date(filters.completedTo) : null;
    const hasFrom = fromDate && !isNaN(+fromDate);
    const hasTo = toDate && !isNaN(+toDate);

    const filtered = items.filter((item) => {
      // by task type
      if (typeSet.size > 0 && !typeSet.has(item.type)) return false;

      // by plant
      if (filters.plantId) {
        const pid = (item as any).plantId as string | undefined;
        if (!pid || pid !== filters.plantId) return false;
      }

      // by location
      if (filters.location) {
        if (!item.location || item.location !== filters.location) return false;
      }

      // by completed date range
      if (hasFrom || hasTo) {
        const d = new Date(item.completedAt);
        if (isNaN(+d)) return false;
        const time = d.getTime();
        if (hasFrom && time < (fromDate as Date).getTime()) return false;
        if (hasTo) {
          // inclusive end-of-day comparison
          const end = new Date(toDate as Date);
          end.setHours(23, 59, 59, 999);
          if (time > end.getTime()) return false;
        }
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let diff = 0;

      if (sortKey === "completedAt") {
        const da = new Date(a.completedAt);
        const db = new Date(b.completedAt);
        const ta = isNaN(+da) ? 0 : da.getTime();
        const tb = isNaN(+db) ? 0 : db.getTime();
        diff = ta - tb;
      } else if (sortKey === "plant") {
        const pa = (a.plant || "").toString();
        const pb = (b.plant || "").toString();
        diff = pa.localeCompare(pb, undefined, { sensitivity: "base" });
      } else if (sortKey === "location") {
        const la = (a.location || "").toString();
        const lb = (b.location || "").toString();
        diff = la.localeCompare(lb, undefined, { sensitivity: "base" });
      }

      return sortDir === "asc" ? diff : -diff;
    });

    return sorted;
  }, [items, filters, sortKey, sortDir]);

  // ---------- ✨ ENTRANCE ANIMATION (tiles) ----------
  const animMapRef = useRef<Map<string, Animated.Value>>(new Map());
  const getAnimForId = (id: string) => {
    const m = animMapRef.current;
    if (!m.has(id)) m.set(id, new Animated.Value(0));
    return m.get(id)!;
  };

  useEffect(() => {
    if (loading) return;
    const ids = derivedItems.map((x) => x.id);
    ids.forEach((id) => getAnimForId(id).setValue(0));

    const seq = ids.map((id, i) =>
      Animated.timing(getAnimForId(id), {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
        delay: i * 50,
      })
    );
    Animated.stagger(50, seq).start();
  }, [loading, derivedItems.length]);

  // ---------- ✨ EMPTY-STATE FRAME ANIMATION ----------
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
    !loading && !sortOpen && !filterOpen && !deleteOpen && !openMenuId;

  const fabActions = [
    {
      key: "sort",
      label: "Sort",
      icon: "sort",
      onPress: () => setSortOpen(true),
    },
    {
      key: "filter",
      label: "Filter",
      icon: "filter-variant",
      onPress: () => setFilterOpen(true),
    },
    {
      key: "delete",
      label: "Delete",
      icon: "delete-outline",
      onPress: () => setDeleteOpen(true),
    },
    ...(isFilterActive
      ? [
          {
            key: "clearFilter",
            label: "Clear filter",
            icon: "filter-remove",
            onPress: () => setFilters(INITIAL_FILTERS),
          } as const,
        ]
      : []),
  ];

  const handleConfirmDelete = (payload: HistoryDeletePayload) => {
    setDeleteOpen(false);

    // TODO: wire this up to actual delete logic / API.
    if (payload.mode === "plant") {
      const plantName =
        plantOptions.find((p) => p.id === payload.plantId)?.name ||
        "selected plant";
      showToast(
        `Delete tasks for plant "${plantName}" is not implemented yet.`,
        "default"
      );
    } else if (payload.mode === "location") {
      showToast(
        `Delete tasks for location "${payload.location}" is not implemented yet.`,
        "default"
      );
    } else if (payload.mode === "types") {
      const label = payload.types.join(", ");
      showToast(
        `Delete tasks of type(s): ${label} is not implemented yet.`,
        "default"
      );
    } else if (payload.mode === "olderThan") {
      showToast(
        `Delete tasks older than ${payload.days} days is not implemented yet.`,
        "default"
      );
    }
  };

  // Placeholder handlers for tile menu actions
  const handleDeleteItem = (item: TaskHistoryItem) => {
    showToast(
      `Delete history task "${item.plant}" is not implemented yet.`,
      "default"
    );
  };

  const handleEditHistoryReminder = (item: TaskHistoryItem) => {
    showToast(
      `Edit reminder from history is not implemented yet.`,
      "default"
    );
  };

  const handleGoToPlant = (item: TaskHistoryItem) => {
    showToast(
      `Go to plant from history is not implemented yet.`,
      "default"
    );
  };

  // Early return while loading (match other screens)
  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title="Task history"
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          showSeparator={false}
          rightIconName="qrcode-scan"
          onPressRight={() => nav.navigate("Scanner" as never)}
        />
        <CenteredSpinner size={56} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Task history"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate("Scanner" as never)}
      />

      {/* Backdrop to dismiss menus (kept under FlatList so menus stay above) */}
      {openMenuId && (
        <View
          style={s.backdrop}
          pointerEvents="auto"
          // When pressed, close any open menu
          onStartShouldSetResponder={() => {
            setOpenMenuId(null);
            return true;
          }}
        />
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

          const isOpen = openMenuId === item.id;

          return (
            <Animated.View
              style={[
                { opacity, transform: [{ translateY }, { scale }] },
                isOpen && { zIndex: 50, elevation: 50 }, // ⬅ like Home: keep open row above others
              ]}
            >
              <TaskHistoryTile
                item={item}
                isMenuOpen={isOpen}
                onToggleMenu={() =>
                  setOpenMenuId((curr) => (curr === item.id ? null : item.id))
                }
                onDelete={handleDeleteItem}
                onEditReminder={handleEditHistoryReminder}
                onGoToPlant={handleGoToPlant}
              />
            </Animated.View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={<View style={{ height: 0 }} />}
        ListFooterComponent={<View style={{ height: 180 }} />}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScrollBeginDrag={() => {
          if (openMenuId) setOpenMenuId(null);
        }}
        ListEmptyComponent={
          !loading ? (
            <Animated.View
              style={[
                s.emptyWrap,
                {
                  opacity: emptyOpacity,
                  transform: [
                    { translateY: emptyTranslateY },
                    { scale: emptyScale },
                  ],
                },
              ]}
            >
              <View
                style={{
                  borderRadius: 28,
                  overflow: "hidden",
                  minHeight: 140,
                }}
              >
                <BlurView
                  style={StyleSheet.absoluteFill}
                  blurType="light"
                  blurAmount={20}
                  overlayColor="transparent"
                  reducedTransparencyFallbackColor="transparent"
                />
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: "rgba(255,255,255,0.20)" },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      borderRadius: 28,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.20)",
                    },
                  ]}
                />
                <View style={s.emptyInner}>
                  <MaterialCommunityIcons
                    name="history"
                    size={26}
                    color="#FFFFFF"
                    style={{ marginBottom: 10 }}
                  />
                  <Text style={s.emptyTitle}>No completed tasks yet</Text>
                  <View style={s.emptyDescBox}>
                    <Text style={s.emptyText}>
                      This screen shows{" "}
                      <Text style={s.inlineBold}>closed reminder tasks</Text> from
                      your Home page (pending tasks are not shown).
                      {"\n\n"}
                      {plantIdFilter
                        ? `Currently filtered to plant id ${plantIdFilter}.`
                        : "Open it from a specific task to see history just for that plant."}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          ) : null
        }
      />

      {/* FAB: Sort / Filter / Delete / Clear filter */}
      {showFAB && <FAB actions={fabActions} />}

      {/* Sort modal */}
      <SortHistoryTasksModal
        visible={sortOpen}
        sortKey={sortKey}
        sortDir={sortDir}
        onCancel={() => setSortOpen(false)}
        onApply={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
          setSortOpen(false);
        }}
        onReset={() => {
          setSortKey("completedAt");
          setSortDir("desc");
          setSortOpen(false);
        }}
      />

      {/* Filter modal */}
      <FilterHistoryTasksModal
        visible={filterOpen}
        plants={plantOptions}
        locations={locationOptions}
        filters={filters}
        onCancel={() => setFilterOpen(false)}
        onClearAll={() => setFilters(INITIAL_FILTERS)}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setFilterOpen(false);
        }}
      />

      {/* Delete modal */}
      <DeleteHistoryTasksModal
        visible={deleteOpen}
        plantOptions={plantOptions}
        locationOptions={locationOptions}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
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
