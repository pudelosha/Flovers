// C:\Projekty\Python\Flovers\mobile\src\features\home\pages\HomeScreen.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Pressable,
  RefreshControl,
  Animated,
  Easing,
  StyleSheet,
  Text,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import TopSnackbar from "../../../shared/ui/TopSnackbar";

import { s } from "../styles/home.styles";
import TaskTile from "../components/TaskTile";
import CompleteTaskModal from "../components/CompleteTaskModal"; // NEW
import type { Task, TaskType } from "../types/home.types";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/home.constants";

// Reminders-backed home service
import {
  fetchHomeTasks,
  markHomeTaskComplete,
  deleteHomeTask,
  type HomeTask,
} from "../../../api/services/home.service";

import SortHomeTasksModal, {
  type HomeSortKey,
  type HomeSortDir,
} from "../components/SortHomeTasksModal";
import FilterHomeTasksModal, {
  type HomeFilters,
} from "../components/FilterHomeTasksModal";

type ViewFilter = "all" | "overdue" | "today";

type PlantOption = { id: string; name: string };

const INITIAL_FILTERS: HomeFilters = {
  plantId: undefined,
  location: undefined,
  types: [],
  dueFrom: "",
  dueTo: "",
};

function normalizeStr(v?: string) {
  return (v || "").toLowerCase().trim();
}

function parseISODate(d?: string): Date | null {
  if (!d) return null;
  const dt = new Date(d);
  if (!(dt instanceof Date) || isNaN(+dt)) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export default function HomeScreen() {
  const nav = useNavigation();

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<HomeTask[]>([]);

  // Loading UX (match Plants behavior so the first paint shows the spinner)
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // FlatList ref to snap back to the top on focus
  const listRef = useRef<any>(null);

  // Local view filter for FAB "Show overdue" / "Show due today"
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");

  // Sort / Filter modals state
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<HomeSortKey>("dueDate");
  const [sortDir, setSortDir] = useState<HomeSortDir>("asc");
  const [filters, setFilters] = useState<HomeFilters>(INITIAL_FILTERS);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] = useState<
    "default" | "success" | "error"
  >("default");
  const showToast = (
    message: string,
    variant: "default" | "success" | "error" = "default"
  ) => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };

  // NEW: "mark complete" modal state
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completeTaskId, setCompleteTaskId] = useState<string | null>(null);
  const [completeNote, setCompleteNote] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetchHomeTasks();
      setTasks(data);
      setHasLoadedOnce(true);
    } catch (e: any) {
      showToast(e?.message || "Failed to load tasks", "error");
      setTasks([]);
      setHasLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data when the screen is focused, but do NOT show stale tiles first.
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);
        setTasks([]); // clear stale tiles right away to avoid flash
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

  // On every focus — close any open menu and scroll list to top
  useFocusEffect(
    useCallback(() => {
      setMenuOpenId(null);
      setSortOpen(false);
      setFilterOpen(false);
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

  const onToggleMenu = (id: string) => {
    setMenuOpenId((curr) => (curr === id ? null : id));
  };

  // Helpers for date checks (local time)
  const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const endOfToday = () => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  };
  const normDateMs = (val: any) => {
    const d = val instanceof Date ? val : new Date(val);
    return d.getTime();
  };

  // Derive plant + location options from current tasks
  const plantOptions: PlantOption[] = useMemo(() => {
    const byId = new Map<string, string>();
    for (const t of tasks) {
      if (t.plantId) {
        if (!byId.has(t.plantId)) byId.set(t.plantId, t.plant);
      }
    }
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const locationOptions: string[] = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.location) set.add(t.location);
    }
    return Array.from(set).sort((a, b) =>
      normalizeStr(a).localeCompare(normalizeStr(b))
    );
  }, [tasks]);

  // Is any filter active?
  const isFilterActive = useMemo(() => {
    return Boolean(
      filters.plantId ||
        filters.location ||
        (filters.types && filters.types.length > 0) ||
        (filters.dueFrom && filters.dueFrom.trim()) ||
        (filters.dueTo && filters.dueTo.trim())
    );
  }, [filters]);

  // Apply viewFilter + Home filters + sort
  const derivedTasks = useMemo(() => {
    const start = startOfToday();
    const end = endOfToday();

    // 1) coarse filter (overdue/today/all)
    const base = (() => {
      if (viewFilter === "all") return tasks;
      if (viewFilter === "overdue") {
        return tasks.filter((t) => {
          const ms = normDateMs((t as any).dueDate);
          return Number.isFinite(ms) && ms < start;
        });
      }
      // viewFilter === "today"
      return tasks.filter((t) => {
        const ms = normDateMs((t as any).dueDate);
        return Number.isFinite(ms) && ms >= start && ms <= end;
      });
    })();

    // 2) detailed filters
    const typesSet = new Set<TaskType>(filters.types || []);
    const from = parseISODate(filters.dueFrom);
    const to = parseISODate(filters.dueTo);

    const filtered = base.filter((t) => {
      if (filters.plantId && t.plantId !== filters.plantId) return false;
      if (
        filters.location &&
        normalizeStr(t.location) !== normalizeStr(filters.location)
      )
        return false;
      if (typesSet.size > 0 && !typesSet.has(t.type)) return false;

      if (from || to) {
        const td = new Date(t.dueDate);
        td.setHours(0, 0, 0, 0);
        if (from && td < from) return false;
        if (to && td > to) return false;
      }

      return true;
    });

    // 3) sort
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;

      if (sortKey === "dueDate") {
        const ad = new Date(a.dueDate);
        const bd = new Date(b.dueDate);
        ad.setHours(0, 0, 0, 0);
        bd.setHours(0, 0, 0, 0);
        cmp = ad.getTime() - bd.getTime();
      } else if (sortKey === "plant") {
        cmp = normalizeStr(a.plant).localeCompare(normalizeStr(b.plant));
      } else if (sortKey === "location") {
        cmp = normalizeStr(a.location).localeCompare(normalizeStr(b.location));
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [tasks, viewFilter, filters, sortKey, sortDir]);

  // ---------- ✨ ENTRANCE ANIMATION (per-task tiles) ----------
  const animMapRef = useRef<Map<string, Animated.Value>>(new Map());
  const getAnimForId = (id: string) => {
    const m = animMapRef.current;
    if (!m.has(id)) m.set(id, new Animated.Value(0));
    return m.get(id)!;
  };

  const primeAnimations = useCallback((ids: string[]) => {
    ids.forEach((id) => {
      const v = getAnimForId(id);
      v.setValue(0);
    });
  }, []);

  const runStaggerIn = useCallback((ids: string[]) => {
    const sequences = ids.map((id, i) => {
      const v = getAnimForId(id);
      return Animated.timing(v, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        delay: i * 50,
      });
    });
    Animated.stagger(50, sequences).start();
  }, []);

  useEffect(() => {
    if (loading) return;
    const ids = derivedTasks.map((t) => t.id);
    primeAnimations(ids);
    const id = requestAnimationFrame(() => runStaggerIn(ids));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, viewFilter, derivedTasks.length]);

  // ---------- EMPTY-STATE FRAME ANIMATION ----------
  const emptyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      emptyAnim.setValue(0);
      return;
    }

    if (derivedTasks.length === 0) {
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
  }, [loading, derivedTasks.length, emptyAnim]);

  // --- Spinner (match Plants: show whenever loading is true) ---
  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title="Home"
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

  const emptyTranslateY = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const emptyScale = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });
  const emptyOpacity = emptyAnim;

  const showFAB = !sortOpen && !filterOpen;

  // NEW: open / close / confirm handlers for complete-with-note
  const openCompleteModal = (taskId: string) => {
    setCompleteTaskId(taskId);
    setCompleteNote("");
    setCompleteModalVisible(true);
  };

  const closeCompleteModal = () => {
    setCompleteModalVisible(false);
    setCompleteTaskId(null);
    setCompleteNote("");
  };

  const handleConfirmComplete = async () => {
    if (!completeTaskId) {
      closeCompleteModal();
      return;
    }

    const finishedTaskId = completeTaskId; // capture before we clear state

    try {
      // Show spinner + avoid broken intermediate list
      setLoading(true);
      setTasks([]);

      await markHomeTaskComplete(finishedTaskId, completeNote);

      closeCompleteModal();

      // Reload from backend so cloned/next task appears
      await load(); // load() will setLoading(false) in its finally

      showToast("Task completed", "success");
    } catch (e: any) {
      closeCompleteModal();
      setLoading(false); // in case load() was not reached
      showToast(
        e?.message ? `Complete failed: ${e.message}` : "Complete failed",
        "error"
      );
    }
  };

  // FAB actions, mirroring Reminders
  const baseFabActions = [
    {
      key: "sort",
      label: "Sort",
      icon: "sort",
      onPress: () => {
        setMenuOpenId(null);
        setSortOpen(true);
      },
    },
    {
      key: "filter",
      label: "Filter",
      icon: "filter-variant",
      onPress: () => {
        setMenuOpenId(null);
        setFilterOpen(true);
      },
    },
    ...(isFilterActive
      ? [
          {
            key: "clearFilter",
            label: "Clear filter",
            icon: "filter-remove",
            onPress: () => {
              setMenuOpenId(null);
              setFilters(INITIAL_FILTERS);
            },
          } as const,
        ]
      : []),
    {
      key: "history",
      label: "History",
      icon: "history",
      onPress: () => {
        setMenuOpenId(null);
        nav.navigate("TaskHistory" as never);
      },
    },
  ];

  const fabActions =
    viewFilter === "all"
      ? [
          {
            key: "overdue",
            label: "Show overdue",
            icon: "alert-circle-outline",
            onPress: () => {
              setMenuOpenId(null);
              setViewFilter("overdue");
              requestAnimationFrame(() =>
                listRef.current?.scrollToOffset({ offset: 0, animated: true })
              );
            },
          },
          {
            key: "dueToday",
            label: "Show due today",
            icon: "calendar-today",
            onPress: () => {
              setMenuOpenId(null);
              setViewFilter("today");
              requestAnimationFrame(() =>
                listRef.current?.scrollToOffset({ offset: 0, animated: true })
              );
            },
          },
          ...baseFabActions,
        ]
      : [
          // 🔼 Put "Show all tasks" at the top when a view filter is active
          {
            key: "clearViewFilter",
            label: "Show all tasks",
            icon: "filter-remove",
            onPress: () => {
              setMenuOpenId(null);
              setViewFilter("all");
              requestAnimationFrame(() =>
                listRef.current?.scrollToOffset({ offset: 0, animated: true })
              );
            },
          },
          ...baseFabActions,
        ];

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Home"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate("Scanner" as never)}
      />

      {/* Backdrop to dismiss menus (keep no zIndex so menus sit above) */}
      {menuOpenId && (
        <Pressable
          onPress={() => setMenuOpenId(null)}
          style={s.backdrop}
          pointerEvents="auto"
        />
      )}

      <Animated.FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={derivedTasks}
        keyExtractor={(t) => t.id}
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

          const isOpen = menuOpenId === item.id;

          return (
            <Animated.View
              style={[
                { opacity, transform: [{ translateY }, { scale }] },
                isOpen && { zIndex: 50, elevation: 50 }, // keep open row above others
              ]}
            >
              <TaskTile
                task={item as Task} // HomeTask extends Task
                isMenuOpen={isOpen}
                onToggleMenu={() => onToggleMenu(item.id)}
                onMarkComplete={() => {
                  setMenuOpenId(null);
                  openCompleteModal(item.id);
                }}
                onEdit={() => {
                  setMenuOpenId(null);
                  const reminderId = (item as any).reminderId;
                  if (reminderId != null) {
                    nav.navigate(
                      "Reminders" as never,
                      { editReminderId: String(reminderId) } as never
                    );
                  } else {
                    nav.navigate("Reminders" as never);
                  }
                }}
                onGoToPlant={() => {
                  setMenuOpenId(null);

                  const plantId = (item as HomeTask).plantId;

                  if (!plantId) {
                    console.warn("[HomeScreen] Task has no plantId:", item);
                    showToast("This task is not linked to a plant.", "error");
                    return;
                  }

                  nav.navigate(
                    "PlantDetails" as never,
                    { id: plantId } as never // PlantDetailsScreen reads route.params.id / plantId
                  );
                }}
                onShowHistory={() => {
                  setMenuOpenId(null);
                  const plantId = (item as HomeTask).plantId;
                  if (plantId) {
                    nav.navigate(
                      "TaskHistory" as never,
                      { plantId: String(plantId) } as never
                    );
                  } else {
                    nav.navigate("TaskHistory" as never);
                  }
                }}
              />
            </Animated.View>
          );
        }}
        ListHeaderComponent={<View style={{ height: 0 }} />}
        ListFooterComponent={<View style={{ height: 140 }} />}
        contentContainerStyle={[s.listContent, { paddingBottom: 80 }]}

        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setMenuOpenId(null)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => {
          // Different empty frames based on viewFilter
          if (viewFilter === "all") {
            // Original "no tasks yet" frame for truly empty app
            return (
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
                  <BlurView
                    style={StyleSheet.absoluteFill}
                    blurType="light"
                    blurAmount={20}
                    overlayColor="transparent"
                    reducedTransparencyFallbackColor="transparent"
                  />
                  {/* White tint for readability */}
                  <View pointerEvents="none" style={s.emptyTint} />
                  {/* Thin border */}
                  <View pointerEvents="none" style={s.emptyBorder} />

                  <View style={s.emptyInner}>
                    <MaterialCommunityIcons
                      name="calendar-check-outline"
                      size={26}
                      color="#FFFFFF"
                      style={{ marginBottom: 10 }}
                    />
                    <Text style={s.emptyTitle}>No tasks yet</Text>
                    <View style={s.emptyDescBox}>
                      <Text style={s.emptyText}>
                        This page shows your upcoming{" "}
                        <Text style={s.inlineBold}>plant care reminders</Text> — watering,
                        fertilizing, repotting, and more.{"\n\n"}
                        To get started:
                        {"\n\n"}
                        • <Text style={s.inlineBold}>Create your plants</Text> in the{" "}
                        <Text style={s.inlineBold}>Plants</Text> tab.{"\n"}
                        • Add <Text style={s.inlineBold}>reminders</Text> for each plant so
                        they appear here as tasks.{"\n"}
                        • Optionally connect{" "}
                        <Text style={s.inlineBold}>IoT devices (Arduino boards)</Text> in the{" "}
                        <Text style={s.inlineBold}>Readings</Text> tab to track temperature,
                        humidity, light and soil moisture in real time.{"\n\n"}
                        Once you’ve set those up, your Home screen will become your central
                        place to see what each plant needs today.
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          }

          // For "overdue" / "today" view filters, show a filter-specific frame
          const isOverdue = viewFilter === "overdue";
          const title = isOverdue ? "No overdue tasks" : "No tasks due today";
          const iconName = isOverdue
            ? "calendar-remove-outline"
            : "calendar-today";

          const bodyText = isOverdue
            ? "You don't have any overdue tasks right now.\n\nYou're all caught up — use \"Show all tasks\" from the FAB to see everything, or switch filters to explore upcoming tasks."
            : "You don't have any tasks due today.\n\nUse \"Show all tasks\" from the FAB to see upcoming reminders, or adjust your reminder schedules on your plants.";

          return (
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
                <BlurView
                  style={StyleSheet.absoluteFill}
                  blurType="light"
                  blurAmount={20}
                  overlayColor="transparent"
                  reducedTransparencyFallbackColor="transparent"
                />
                <View pointerEvents="none" style={s.emptyTint} />
                <View pointerEvents="none" style={s.emptyBorder} />

                <View style={s.emptyInner}>
                  <MaterialCommunityIcons
                    name={iconName}
                    size={26}
                    color="#FFFFFF"
                    style={{ marginBottom: 10 }}
                  />
                  <Text style={s.emptyTitle}>{title}</Text>
                  <View style={s.emptyDescBox}>
                    <Text style={s.emptyText}>{bodyText}</Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          );
        }}
      />

      {/* Capture taps on the FAB (including the main button) to hide any open tile menu */}
      {showFAB && (
        <View
          onStartShouldSetResponderCapture={() => {
            setMenuOpenId(null);
            return false;
          }}
        >
          <FAB icon="plus" actions={fabActions} />
        </View>
      )}

      {/* Sort & Filter modals */}
      <SortHomeTasksModal
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
          setSortKey("dueDate");
          setSortDir("asc");
          setSortOpen(false);
        }}
      />

      <FilterHomeTasksModal
        visible={filterOpen}
        plants={plantOptions}
        locations={locationOptions}
        filters={filters}
        onCancel={() => setFilterOpen(false)}
        onApply={(f) => {
          setFilters(f);
          setFilterOpen(false);
        }}
        onClearAll={() => {
          setFilters(INITIAL_FILTERS);
        }}
      />

      {/* NEW: Complete-with-note modal */}
      <CompleteTaskModal
        visible={completeModalVisible}
        note={completeNote}
        onChangeNote={setCompleteNote}
        onCancel={closeCompleteModal}
        onConfirm={handleConfirmComplete}
      />

      {/* Top Snackbar (toast) */}
      <TopSnackbar
        visible={toastVisible}
        message={toastMsg}
        variant={toastVariant}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}
