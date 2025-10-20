import React, { useMemo } from "react";
import { View, Text, FlatList, ScrollView } from "react-native";
import Calendar from "react-native-calendars/src/calendar";
import { BlurView } from "@react-native-community/blur";
import type { Reminder as UIReminder, ReminderType } from "../types/reminders.types";
import { ACCENT_BY_TYPE, TILE_BLUR } from "../constants/reminders.constants";
import { s } from "../styles/reminders.styles";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import ReminderMiniTile from "./ReminderMiniTile";

type Props = {
  reminders: UIReminder[];
  selectedDate: string;                           // YYYY-MM-DD
  onSelectDate: (isoDate: string) => void;

  menuOpenId: string | null;
  onToggleMenu: (id: string) => void;
  onEdit: (r: UIReminder) => void;
  onDelete: (r: UIReminder) => void;
};

function toISODateOnly(d?: Date | string): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(+date)) return "";
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, "0");
  const D = String(date.getDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

const ORDER: ReminderType[] = ["watering", "moisture", "fertilising", "care", "repot"];

function monthYearLabel(input: any) {
  const d: Date =
    (input && typeof input?.toDate === "function" && input.toDate()) ||
    (input instanceof Date ? input : new Date(input));
  const raw = d.toLocaleString(undefined, { month: "long", year: "numeric" });
  return raw.replace(/^\p{Ll}/u, (m) => m.toUpperCase()); // leading uppercase (locale-safe)
}

export default function RemindersCalendar({
  reminders,
  selectedDate,
  onSelectDate,
  menuOpenId,
  onToggleMenu,
  onEdit,
  onDelete,
}: Props) {
  const dotsByDate = useMemo(() => {
    const acc: Record<string, { key: string; color: string }[]> = {};
    for (const r of reminders) {
      const iso = toISODateOnly(r.dueDate);
      if (!iso) continue;
      const color = ACCENT_BY_TYPE[r.type] || "#FFFFFF";
      acc[iso] ||= [];
      if (!acc[iso].some((d) => d.key.startsWith(r.type))) {
        acc[iso].push({ key: `${r.type}-${r.id}`, color });
      }
    }
    Object.keys(acc).forEach((k) => {
      acc[k].sort(
        (a, b) =>
          ORDER.findIndex((t) => a.key.startsWith(t)) -
          ORDER.findIndex((t) => b.key.startsWith(t))
      );
    });
    return acc;
  }, [reminders]);

  const markedDates = useMemo(() => {
    const base: Record<string, any> = {};
    Object.entries(dotsByDate).forEach(([iso, dots]) => {
      base[iso] = { marked: true, dots };
    });
    base[selectedDate] = {
      ...(base[selectedDate] || {}),
      selected: true,
      selectedColor: "rgba(255,255,255,0.16)",
      selectedTextColor: "#FFFFFF",
      disableTouchEvent: false,
    };
    return base;
  }, [dotsByDate, selectedDate]);

  const remindersForSelected = useMemo(
    () => reminders.filter((r) => toISODateOnly(r.dueDate) === selectedDate),
    [reminders, selectedDate]
  );

  return (
    <ScrollView
      style={s.calendarWrap}
      contentContainerStyle={s.calendarScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* MAIN BLURRY FRAME */}
      <View style={s.calendarCard}>
        <BlurView style={s.calendarGlass} blurType="light" blurAmount={TILE_BLUR} />

        <Calendar
          current={selectedDate}
          onDayPress={(d) => onSelectDate(d.dateString)}
          markedDates={markedDates}
          markingType="multi-dot"
          style={s.calendarCore}
          theme={{
            backgroundColor: "transparent",
            calendarBackground: "transparent",
            monthTextColor: "#FFFFFF",
            dayTextColor: "#FFFFFF",
            textDisabledColor: "rgba(255,255,255,0.35)",
            arrowColor: "#FFFFFF",
            todayTextColor: "#FFFFFF",
            textSectionTitleColor: "rgba(255,255,255,0.7)",
          }}
          renderHeader={(dateObj) => (
            <View style={s.calHeaderRow}>
              <Text style={s.calHeaderTitle}>{monthYearLabel(dateObj)}</Text>
            </View>
          )}
          renderArrow={(direction) => (
            <Icon
              name={direction === "left" ? "chevron-left" : "chevron-right"}
              size={20}
              color="#FFFFFF"
            />
          )}
        />

        {/* Legend — always one line; scrolls horizontally if needed */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.calendarLegendRow}
        >
          {ORDER.map((t) => (
            <View key={t} style={s.legendItem}>
              <View style={[s.legendDotSmall, { backgroundColor: ACCENT_BY_TYPE[t] }]} />
              <Text style={s.legendLabelSmall}>
                {t === "fertilising" ? "Fertilising" : t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* "Scheduled on" */}
        <Text style={s.calendarSubheading}>Scheduled on {selectedDate}</Text>

        {/* Inside-frame compact list */}
        {remindersForSelected.length === 0 ? (
          <Text style={s.calendarNoItems}>No reminders for this day.</Text>
        ) : (
          <View style={s.calendarListBox}>
            <FlatList
              data={remindersForSelected}
              keyExtractor={(r) => r.id}
              renderItem={({ item }) => (
                <ReminderMiniTile
                  reminder={item}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item)}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              contentContainerStyle={{ paddingVertical: 6, paddingHorizontal: 6 }}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={() => onToggleMenu("")}
            />
          </View>
        )}
      </View>

      {/* Spacer so you can slide the whole frame above the FAB */}
      <View style={{ height: 140 }} />
    </ScrollView>
  );
}
