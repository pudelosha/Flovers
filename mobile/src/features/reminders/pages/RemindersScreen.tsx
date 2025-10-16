// features/reminders/screens/RemindersScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import { View, Pressable, FlatList, Text, RefreshControl } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import { s } from "../styles/reminders.styles";
import ReminderTile from "../components/ReminderTile";
import type { Reminder as UIReminder, ReminderType } from "../types/reminders.types";
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
} from "../constants/reminders.constants";

import {
  listReminders,
  listReminderTasks,
  completeReminderTask,
} from "../../../api/services/reminders.service";
import { fetchPlantInstances } from "../../../api/services/plant-instances.service";
import { buildUIReminders } from "../../../api/serializers/reminders.serializer";

type ViewMode = "list" | "calendar";

export default function RemindersScreen() {
  const nav = useNavigation();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uiReminders, setUiReminders] = useState<UIReminder[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasks, reminders, plants] = await Promise.all([
        listReminderTasks({ status: "pending", auth: true }),
        listReminders({ auth: true }),
        fetchPlantInstances({ auth: true }),  // you already have this for Plants screen
      ]);
      const ui = buildUIReminders(tasks, reminders, plants);
      setUiReminders(ui);
    } catch (e: any) {
      setError(e?.message || "Failed to load reminders");
      setUiReminders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onToggleMenu = (id: string) => setMenuOpenId(curr => (curr === id ? null : id));

  const openList = () => setViewMode("list");
  const openCalendar = () => setViewMode("calendar");
  const openAddReminder = () => nav.navigate("AddReminder" as never);

  const onComplete = async (rid: string) => {
    setMenuOpenId(null);
    const idNum = Number(rid);
    if (!idNum) return;
    try {
      await completeReminderTask(idNum, { auth: true });
      await load(); // refresh to see the next cloned task (if any)
    } catch {
      // TODO: show a toast/snackbar
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Reminders"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate("Scanner" as never)}
      />

      {menuOpenId && (
        <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} pointerEvents="auto" />
      )}

      {viewMode === "list" ? (
        <FlatList
          data={uiReminders}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <ReminderTile
              reminder={item}
              isMenuOpen={menuOpenId === item.id}
              onToggleMenu={() => onToggleMenu(item.id)}
              onPressBody={() => nav.navigate("ReminderDetails" as never)}
              onEdit={() => { /* TODO */ }}
              onDelete={() => { /* TODO */ }}
              onComplete={() => onComplete(item.id)} // add a button/menu in tile if not present
            />
          )}
          ListHeaderComponent={<View style={{ height: 5 }} />}
          ListFooterComponent={<View style={{ height: 140 }} />}
          contentContainerStyle={[s.listContent, { paddingBottom: 80 }]}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setMenuOpenId(null)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={
            !loading ? (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={s.placeholderText}>No reminders</Text>
                <Text style={s.placeholderHint}>Pull to refresh or add a reminder.</Text>
                {error ? <Text style={[s.placeholderHint, { marginTop: 8 }]}>{error}</Text> : null}
              </View>
            ) : null
          }
        />
      ) : (
        <View style={s.calendarWrap}>
          <Text style={s.placeholderText}>Calendar view</Text>
          <Text style={s.placeholderHint}>Days with scheduled reminders will be highlighted here.</Text>
        </View>
      )}

      <FAB
        actions={[
          { key: "add", label: "Add reminder", icon: "plus", onPress: openAddReminder },
          { key: "list", label: "List", icon: "view-list", onPress: openList },
          { key: "calendar", label: "Calendar", icon: "calendar-month", onPress: openCalendar },
          { key: "sort", label: "Sort", icon: "sort", onPress: () => { /* TODO */ } },
          { key: "filter", label: "Filter", icon: "filter-variant", onPress: () => { /* TODO */ } },
        ]}
      />
    </View>
  );
}
