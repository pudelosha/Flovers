import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Pressable, FlatList, RefreshControl } from "react-native";
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
  const listRef = useRef<FlatList<HomeTask>>(null);

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

  // Refresh data when the screen is focused (already done), keep it
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);
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
      // Defer to next frame so FlatList is mounted before scrolling
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
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

  // --- Initial page-load spinner (centered), same pattern as Plants ---
  if (loading && !hasLoadedOnce) {
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

      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={derivedTasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
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
                showToast(e?.message ? `Complete failed: ${e.message}` : "Complete failed", "error");
              }
            }}
            onEdit={() => {
              // If you have a dedicated Reminders edit flow, use item.reminderId here.
              // nav.navigate("Reminders" as never);
            }}
            onGoToPlant={() => {
              // Hook up when plant details route is ready
            }}
            // ⬇️ No delete from Home tile menu
            // onDelete={...}  // intentionally omitted
          />
        )}
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
