import React, { useMemo, useState } from "react";
import { View, Pressable, FlatList, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import FAB from "../../../shared/ui/FAB";
import { s } from "../styles/reminders.styles";
import ReminderTile from "../components/ReminderTile";
import type { Reminder, ReminderType } from "../types/reminders.types";
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
} from "../constants/reminders.constants";

type ViewMode = "list" | "calendar";

export default function RemindersScreen() {
  const nav = useNavigation();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list"); // default: list

  const reminders: Reminder[] = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => {
        const types: ReminderType[] = ["watering", "moisture", "fertilising", "care"];
        const t = types[i % types.length];
        return {
          id: String(i + 1),
          type: t,
          plant: ["Big Awesome Monstera", "Ficus", "Aloe Vera", "Orchid"][i % 4],
          location: ["Living Room", "Bedroom", "Kitchen", "Office"][i % 4],
          due: ["Today", "Tomorrow", "3 days", "Next week"][i % 4],
          dueDate: addDays(new Date(), i % 7),
        };
      }),
    []
  );

  const onToggleMenu = (id: string) => {
    setMenuOpenId((curr) => (curr === id ? null : id));
  };

  const openList = () => setViewMode("list");
  const openCalendar = () => setViewMode("calendar");
  const openAddReminder = () => nav.navigate("AddReminder" as never);

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

      {/* Dismiss any open menus when tapping outside */}
      {menuOpenId && (
        <Pressable onPress={() => setMenuOpenId(null)} style={s.backdrop} pointerEvents="auto" />
      )}

      {viewMode === "list" ? (
        <FlatList
          data={reminders}
          keyExtractor={(r) => r.id}
          renderItem={({ item }: { item: Reminder }) => (
            <ReminderTile
              reminder={item}
              isMenuOpen={menuOpenId === item.id}
              onToggleMenu={() => onToggleMenu(item.id)}
              onPressBody={() => nav.navigate("ReminderDetails" as never)}
              onEdit={() => {
                /* TODO: open edit reminder */
              }}
              onDelete={() => {
                /* TODO: remove reminder */
              }}
            />
          )}
          ListHeaderComponent={<View style={{ height: 5 }} />}
          ListFooterComponent={<View style={{ height: 140 }} />}
          contentContainerStyle={[s.listContent, { paddingBottom: 80 }]}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setMenuOpenId(null)}
        />
      ) : (
        <View style={s.calendarWrap}>
          {/* hook up a real calendar later (e.g., react-native-calendars) */}
          <Text style={s.placeholderText}>Calendar view</Text>
          <Text style={s.placeholderHint}>
            Days with scheduled reminders will be highlighted here.
          </Text>
        </View>
      )}

      {/* FAB – order + Capital labels, no root `icon` prop */}
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

/* helpers */
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
