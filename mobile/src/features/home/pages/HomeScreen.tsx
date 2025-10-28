import React, { useCallback, useState } from "react";
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

export default function HomeScreen() {
  const nav = useNavigation();

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<HomeTask[]>([]);

  // Loading UX (match Reminders)
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    setLoading(true);
    try {
      const data = await fetchHomeTasks();
      setTasks(data);
      setHasLoadedOnce(true);
    } catch (e: any) {
      // Optionally show an error toast
      showToast(e?.message || "Failed to load tasks", "error");
      setTasks([]);
      setHasLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
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

  const showInitialSpinner = !hasLoadedOnce && loading;

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

      {/* Initial page-load spinner (centered, shared UI) */}
      {showInitialSpinner ? <CenteredSpinner size={56} color="#FFFFFF" /> : null}

      {/* Backdrop to dismiss menus (keep no zIndex so menus sit above) */}
      {menuOpenId && (
        <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} pointerEvents="auto" />
      )}

      {!showInitialSpinner && (
        <FlatList
          data={tasks}
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
              onDelete={async () => {
                try {
                  await deleteHomeTask(item.reminderId);
                  await load();
                  showToast("Reminder deleted", "success");
                } catch (e: any) {
                  showToast(e?.message ? `Delete failed: ${e.message}` : "Delete failed", "error");
                }
              }}
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
      )}

      <FAB
        icon="plus"
        actions={[
          { key: "sort", label: "sort", icon: "sort", onPress: () => {} },
          { key: "filter", label: "filter", icon: "filter-variant", onPress: () => {} },
          { key: "history", label: "history", icon: "history", onPress: () => {} },
        ]}
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
