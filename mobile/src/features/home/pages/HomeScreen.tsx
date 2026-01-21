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
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import LinearGradient from "react-native-linear-gradient";

import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import TopSnackbar from "../../../shared/ui/TopSnackbar";

import { s } from "../styles/home.styles";
import TaskTile from "../components/TaskTile";
import CompleteTaskModal from "../components/modals/CompleteTaskModal";
import type { Task, TaskType } from "../types/home.types";
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
} from "../constants/home.constants";

import {
  fetchHomeTasks,
  markHomeTaskComplete,
  deleteHomeTask,
  type HomeTask,
} from "../../../api/services/home.service";

import SortHomeTasksModal, {
  type HomeSortKey,
  type HomeSortDir,
} from "../components/modals/SortHomeTasksModal";
import FilterHomeTasksModal, {
  type HomeFilters,
} from "../components/modals/FilterHomeTasksModal";
import { useSettings } from "../../../app/providers/SettingsProvider";

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

// Empty-state gradient (matches the wizard gradient style)
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

export default function HomeScreen() {
  const { t } = useTranslation();

  const nav = useNavigation();
  const { settings } = useSettings();

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

  // "mark complete" modal state (single + bulk)
  type CompleteMode = "single" | "bulk";
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completeMode, setCompleteMode] = useState<CompleteMode>("single");
  const [completeTaskIds, setCompleteTaskIds] = useState<string[]>([]);
  const [completeNote, setCompleteNote] = useState("");

  // overdue info for modal
  const [completeIsOverdue, setCompleteIsOverdue] = useState(false);
  const [completeIntervalText, setCompleteIntervalText] = useState<string>("");

  // ✅ Define closeCompleteModal BEFORE using it in useFocusEffect/load handlers
  const closeCompleteModal = useCallback(() => {
    setCompleteModalVisible(false);
    setCompleteMode("single");
    setCompleteTaskIds([]);
    setCompleteNote("");
    setCompleteIsOverdue(false);
    setCompleteIntervalText("");
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchHomeTasks();
      setTasks(data);
      setHasLoadedOnce(true);
    } catch (e: any) {
      showToast(e?.message || t("home.toasts.failedToLoadTasks"), "error");
      setTasks([]);
      setHasLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Refresh data when the screen is focused, but do NOT show stale tiles first.
  // Adjustment: on entry (focus), always reset viewFilter to "all" so Home opens unfiltered.
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setViewFilter("all");
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

  // On every focus — close any open menu/modals and scroll list to top
  useFocusEffect(
    useCallback(() => {
      setMenuOpenId(null);
      setSortOpen(false);
      setFilterOpen(false);
      closeCompleteModal(); // ✅ ensures complete modal won't remain open

      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
      });
      return undefined;
    }, [closeCompleteModal])
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

  // overdue helper for tasks
  const isTaskOverdue = useCallback(
    (tsk: HomeTask) => {
      const start = startOfToday();
      const ms = normDateMs((tsk as any).dueDate);
      return Number.isFinite(ms) && ms < start;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // interval helper (best-effort; requires intervalValue/intervalUnit on task)
  const buildIntervalText = useCallback(
    (tsk: any) => {
      const v = tsk?.intervalValue;
      const u = tsk?.intervalUnit;
      if (!v || !u) return "";

      // If homeModals.interval.days/months keys exist, this will be localized.
      // Otherwise it will just return the key string; we guard against that below.
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

  // Derive plant + location options from current tasks
  const plantOptions: PlantOption[] = useMemo(() => {
    const byId = new Map<string, string>();
    for (const tsk of tasks) {
      if (tsk.plantId) {
        if (!byId.has(tsk.plantId)) byId.set(tsk.plantId, tsk.plant);
      }
    }
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const locationOptions: string[] = useMemo(() => {
    const set = new Set<string>();
    for (const tsk of tasks) {
      if (tsk.location) set.add(tsk.location);
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
        return tasks.filter((tsk) => {
          const ms = normDateMs((tsk as any).dueDate);
          return Number.isFinite(ms) && ms < start;
        });
      }
      // viewFilter === "today"
      return tasks.filter((tsk) => {
        const ms = normDateMs((tsk as any).dueDate);
        return Number.isFinite(ms) && ms >= start && ms <= end;
      });
    })();

    // 2) detailed filters
    const typesSet = new Set<TaskType>(filters.types || []);
    const from = parseISODate(filters.dueFrom);
    const to = parseISODate(filters.dueTo);

    const filtered = base.filter((tsk) => {
      if (filters.plantId && tsk.plantId !== filters.plantId) return false;
      if (
        filters.location &&
        normalizeStr(tsk.location) !== normalizeStr(filters.location)
      )
        return false;
      if (typesSet.size > 0 && !typesSet.has(tsk.type)) return false;

      if (from || to) {
        const td = new Date(tsk.dueDate);
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

  // ---------- ENTRANCE ANIMATION (per-task tiles) ----------
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
    const ids = derivedTasks.map((tsk) => tsk.id);
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
          title={t("home.header.title")}
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

  // open / close / confirm handlers for complete-with-note (single + bulk)
  const openCompleteModal = (selectedTasks: HomeTask[], mode: CompleteMode) => {
    setCompleteMode(mode);
    setCompleteTaskIds(selectedTasks.map((x) => x.id));
    setCompleteNote("");

    const anyOverdue = selectedTasks.some(isTaskOverdue);
    setCompleteIsOverdue(anyOverdue);

    if (mode === "single") {
      setCompleteIntervalText(buildIntervalText(selectedTasks[0]));
    } else {
      const first =
        selectedTasks.length > 0 ? buildIntervalText(selectedTasks[0]) : "";
      const allSame =
        selectedTasks.length > 0 &&
        selectedTasks.every((x) => buildIntervalText(x) === first);
      setCompleteIntervalText(allSame ? first : "");
    }

    setCompleteModalVisible(true);
  };

  const handleConfirmComplete = async () => {
    if (!completeTaskIds || completeTaskIds.length === 0) {
      closeCompleteModal();
      return;
    }

    const ids = [...completeTaskIds]; // capture before we clear state

    try {
      // Show spinner + avoid broken intermediate list
      setLoading(true);
      setTasks([]);

      const results = await Promise.allSettled(
        ids.map((id) => markHomeTaskComplete(id, completeNote))
      );

      closeCompleteModal();

      // Reload from backend so cloned/next task appears
      await load(); // load() will setLoading(false) in its finally

      const okCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.length - okCount;

      if (failCount === 0) {
        showToast(
          completeMode === "bulk"
            ? t("home.toasts.tasksCompleted")
            : t("home.toasts.taskCompleted"),
          "success"
        );
      } else if (okCount > 0) {
        showToast(
          t("home.toasts.completeSomeFailed", {
            ok: okCount,
            total: results.length,
          }),
          "error"
        );
      } else {
        showToast(t("home.toasts.completeFailed"), "error");
      }
    } catch (e: any) {
      closeCompleteModal();
      setLoading(false); // in case load() was not reached
      showToast(
        e?.message
          ? `${t("home.toasts.completeFailed")}: ${e.message}`
          : t("home.toasts.completeFailed"),
        "error"
      );
    }
  };

  // FAB actions, mirroring Reminders
  const baseFabActions = [
    {
      key: "sort",
      label: t("home.fab.sort"),
      icon: "sort",
      onPress: () => {
        setMenuOpenId(null);
        setSortOpen(true);
      },
    },
    {
      key: "filter",
      label: t("home.fab.filter"),
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
            label: t("home.fab.clearFilter"),
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
      label: t("home.fab.history"),
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
            label: t("home.fab.showOverdue"),
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
            label: t("home.fab.showDueToday"),
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
          // Put "Mark visible as complete" at the top when a view filter is active
          ...(derivedTasks.length > 0
            ? [
                {
                  key: "completeVisible",
                  label: t("home.fab.markVisibleAsComplete"),
                  icon: "check-circle-outline",
                  onPress: () => {
                    setMenuOpenId(null);
                    openCompleteModal(derivedTasks as HomeTask[], "bulk");
                  },
                } as const,
              ]
            : []),
          // Put "Show all tasks" at the top when a view filter is active
          {
            key: "clearViewFilter",
            label: t("home.fab.showAllTasks"),
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
        title={t("home.header.title")}
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
        keyExtractor={(tsk) => tsk.id}
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
                  openCompleteModal([item as HomeTask], "single");
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
                    showToast(t("home.toasts.taskNotLinkedToPlant"), "error");
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
                    transform: [
                      { translateY: emptyTranslateY },
                      { scale: emptyScale },
                    ],
                  },
                ]}
              >
                <View style={s.emptyGlass}>
                  {/* Gradient instead of Blur */}
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
                      "rgba(255, 255, 255, 0.06)",
                      "rgba(255, 255, 255, 0.02)",
                      "rgba(255, 255, 255, 0.08)",
                    ]}
                    locations={[0, 0.5, 1]}
                    style={StyleSheet.absoluteFill}
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
                    <Text style={s.emptyTitle}>{t("home.empty.all.title")}</Text>
                    <View style={s.emptyDescBox}>
                      <Text style={s.emptyText}>
                        {t("home.empty.all.introPrefix")}{" "}
                        <Text style={s.inlineBold}>
                          {t("home.empty.all.introBold")}
                        </Text>{" "}
                        {t("home.empty.all.introSuffix")}
                        {"\n\n"}
                        {t("home.empty.all.toGetStarted")}
                        {"\n\n"}•{" "}
                        <Text style={s.inlineBold}>
                          {t("home.empty.all.bullets.createPlantsBold")}
                        </Text>{" "}
                        {t("home.empty.all.bullets.createPlantsSuffix")}{" "}
                        <Text style={s.inlineBold}>
                          {t("home.empty.all.bullets.plantsTabBold")}
                        </Text>
                        .{"\n"}• {t("home.empty.all.bullets.addRemindersPrefix")}{" "}
                        <Text style={s.inlineBold}>
                          {t("home.empty.all.bullets.remindersBold")}
                        </Text>{" "}
                        {t("home.empty.all.bullets.addRemindersSuffix")}
                        {"\n"}•{" "}
                        {t("home.empty.all.bullets.optionallyConnectPrefix")}{" "}
                        <Text style={s.inlineBold}>
                          {t("home.empty.all.bullets.iotBold")}
                        </Text>{" "}
                        {t("home.empty.all.bullets.optionallyConnectMiddle")}{" "}
                        <Text style={s.inlineBold}>
                          {t("home.empty.all.bullets.readingsTabBold")}
                        </Text>{" "}
                        {t("home.empty.all.bullets.optionallyConnectSuffix")}
                        {"\n\n"}
                        {t("home.empty.all.outro")}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            );
          }

          // For "overdue" / "today" view filters, show a filter-specific frame
          const isOverdue = viewFilter === "overdue";
          const title = isOverdue
            ? t("home.empty.overdue.title")
            : t("home.empty.today.title");
          const iconName = isOverdue
            ? "calendar-remove-outline"
            : "calendar-today";

          const bodyText = isOverdue
            ? t("home.empty.overdue.body")
            : t("home.empty.today.body");

          return (
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
              <View style={s.emptyGlass}>
                {/* Gradient instead of Blur */}
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
                    "rgba(255, 255, 255, 0.06)",
                    "rgba(255, 255, 255, 0.02)",
                    "rgba(255, 255, 255, 0.08)",
                  ]}
                  locations={[0, 0.5, 1]}
                  style={StyleSheet.absoluteFill}
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
          <FAB
            icon="plus"
            actions={fabActions}
            position={settings.fabPosition} // left/right from settings
          />
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

      {/* Complete-with-note modal (single + bulk) */}
      <CompleteTaskModal
        visible={completeModalVisible}
        note={completeNote}
        onChangeNote={setCompleteNote}
        onCancel={closeCompleteModal}
        onConfirm={handleConfirmComplete}
        mode={completeMode}
        count={completeMode === "bulk" ? completeTaskIds.length : undefined}
        isOverdue={completeIsOverdue}
        intervalText={completeIntervalText}
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
