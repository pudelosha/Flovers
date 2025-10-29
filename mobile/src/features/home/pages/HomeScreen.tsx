import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { View, Pressable, RefreshControl, Animated, Easing } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import TopSnackbar from "../../../shared/ui/TopSnackbar";

import { s } from "../styles/home.styles";
import TaskTile from "../components/TaskTile";
import type { Task } from "../types/home.types";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/home.constants";

// Reminders-backed home service
import {
  fetchHomeTasks,
  markHomeTaskComplete,
  deleteHomeTask,
  type HomeTask,
} from "../../../api/services/home.service";

type ViewFilter = "all" | "overdue" | "today";

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

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] = useState<"default" | "success" | "error">("default");
  const showToast = (message: string, variant: "default" | "success" | "error" = "default") => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };

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
  // We clear the list immediately on focus so the Home page appears empty until fresh data arrives.
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

  // Apply local filter for "Show overdue" / "Show due today"
  const derivedTasks = useMemo(() => {
    if (viewFilter === "all") return tasks;

    const start = startOfToday();
    const end = endOfToday();

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
  }, [tasks, viewFilter]);

  // ---------- ✨ ENTRANCE ANIMATION (no extra deps) ----------
  // Animated value per task id
  const animMapRef = useRef<Map<string, Animated.Value>>(new Map());
  // ensure value exists
  const getAnimForId = (id: string) => {
    const m = animMapRef.current;
    if (!m.has(id)) m.set(id, new Animated.Value(0));
    return m.get(id)!;
  };

  // Reset all current items to hidden (0)
  const primeAnimations = useCallback((ids: string[]) => {
    ids.forEach((id) => {
      const v = getAnimForId(id);
      v.setValue(0);
    });
  }, []);

  // Run a nice staggered fade+translate for current list
  const runStaggerIn = useCallback((ids: string[]) => {
    const sequences = ids.map((id, i) => {
      const v = getAnimForId(id);
      return Animated.timing(v, {
        toValue: 1,
        duration: 280, // ANIMATION SPEED lower = faster
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        delay: i * 50, // stagger
      });
    });
    Animated.stagger(50, sequences).start();
  }, []);

  // Trigger animation when:
  // - initial load finished (spinner disappears)
  // - the filter changes
  useEffect(() => {
    if (loading) return;
    const ids = derivedTasks.map((t) => t.id);
    primeAnimations(ids);
    // Defer a frame so list has laid out
    const id = requestAnimationFrame(() => runStaggerIn(ids));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, viewFilter, derivedTasks.length]);

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

  // Build FAB actions dynamically based on filter state
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
          { key: "sort", label: "Sort", icon: "sort", onPress: () => {} },
          { key: "filter", label: "Filter", icon: "filter-variant", onPress: () => {} },
          { key: "history", label: "History", icon: "history", onPress: () => {} },
        ]
      : [
          { key: "sort", label: "Sort", icon: "sort", onPress: () => {} },
          { key: "filter", label: "Filter", icon: "filter-variant", onPress: () => {} },
          {
            key: "clearFilter",
            label: "Clear filter",
            icon: "filter-remove",
            onPress: () => {
              setMenuOpenId(null);
              setViewFilter("all");
              requestAnimationFrame(() =>
                listRef.current?.scrollToOffset({ offset: 0, animated: true })
              );
            },
          },
          { key: "history", label: "History", icon: "history", onPress: () => {} },
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
        <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} pointerEvents="auto" />
      )}

      <Animated.FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={derivedTasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => {
          const v = getAnimForId(item.id);
          const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
          const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
          const opacity = v;

          return (
            <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
              <TaskTile
                task={item as Task} // HomeTask extends Task
                isMenuOpen={menuOpenId === item.id}
                onToggleMenu={() => onToggleMenu(item.id)}
                onMarkComplete={async () => {
                  try {
                    await markHomeTaskComplete(item.id);
                    await load();
                    showToast("Task completed", "success");
                  } catch (e: any) {
                    showToast(
                      e?.message ? `Complete failed: ${e.message}` : "Complete failed",
                      "error"
                    );
                  }
                }}
                onEdit={() => {
                  // If you have a dedicated Reminders edit flow, use item.reminderId here.
                  // nav.navigate("Reminders" as never);
                }}
                onGoToPlant={() => {
                  // Hook up when plant details route is ready
                }}
                // No delete from Home tile menu
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      {/* Capture taps on the FAB (including the main button) to hide any open tile menu,
          but DO NOT change FAB visibility or behavior. */}
      <View
        onStartShouldSetResponderCapture={() => {
          setMenuOpenId(null);
          return false; // allow FAB to receive the touch normally
        }}
      >
        <FAB icon="plus" actions={fabActions} />
      </View>

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
