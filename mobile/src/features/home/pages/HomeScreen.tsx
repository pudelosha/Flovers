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
  const showToast = (
    message: string,
    variant: "default" | "success" | "error" = "default"
  ) => {
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

  // ---------- ✨ EMPTY-STATE FRAME ANIMATION ----------
  // Separate animated value for the "No tasks yet" blurry frame
  const emptyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      emptyAnim.setValue(0);
      return;
    }

    if (derivedTasks.length === 0) {
      // animate the empty card in, similar to other glass frames
      emptyAnim.setValue(0);
      Animated.timing(emptyAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      // hide/reset when there are tasks
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

  // Animated transforms for empty frame
  const emptyTranslateY = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const emptyScale = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });
  const emptyOpacity = emptyAnim;

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
        ListEmptyComponent={() => (
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
                    <Text style={s.inlineBold}>plant care reminders</Text> — watering, fertilizing,
                    repotting, and more.{"\n\n"}
                    To get started:
                    {"\n\n"}
                    • <Text style={s.inlineBold}>Create your plants</Text> in the{" "}
                    <Text style={s.inlineBold}>Plants</Text> tab.{"\n"}
                    • Add <Text style={s.inlineBold}>reminders</Text> for each plant so they appear
                    here as tasks.{"\n"}
                    • Optionally connect{" "}
                    <Text style={s.inlineBold}>IoT devices (Arduino boards)</Text> in the{" "}
                    <Text style={s.inlineBold}>Readings</Text> tab to track temperature, humidity,
                    light and soil moisture in real time.{"\n\n"}
                    Once you’ve set those up, your Home screen will become your central place to
                    see what each plant needs today.
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}
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
