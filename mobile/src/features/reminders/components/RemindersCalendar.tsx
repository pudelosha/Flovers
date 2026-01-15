import React, { useMemo, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import Calendar from "react-native-calendars/src/calendar";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";

import type { Reminder as UIReminder, ReminderType } from "../types/reminders.types";
import { ACCENT_BY_TYPE } from "../constants/reminders.constants";
import ReminderMiniTile from "./ReminderMiniTile";
import { s } from "../styles/reminders.styles";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider";

type Props = {
  reminders: UIReminder[];
  selectedDate: string;
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

function monthYearLabel(input: any, settings?: any) {
  const d: Date =
    (input && typeof input?.toDate === "function" && input.toDate()) ||
    (input instanceof Date ? input : new Date(input));

  const rawLocale = settings?.locale || undefined;
  const raw = d.toLocaleString(rawLocale, { month: "long", year: "numeric" });
  return raw.replace(/^\p{Ll}/u, (m) => m.toUpperCase());
}

function formatISOForLabel(iso: string, settings?: any) {
  // iso is YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const yyyy = m[1];
  const mm = m[2];
  const dd = m[3];

  const fmt = settings?.dateFormat;
  if (fmt === "mdy" || fmt === "MM/DD/YYYY" || fmt === "MM-DD-YYYY") {
    const sep = fmt === "MM-DD-YYYY" ? "-" : "/";
    return `${mm}${sep}${dd}${sep}${yyyy}`;
  }
  if (fmt === "ymd" || fmt === "YYYY-MM-DD" || fmt === "YYYY/MM/DD") {
    const sep = fmt === "YYYY/MM/DD" ? "/" : "-";
    return `${yyyy}${sep}${mm}${sep}${dd}`;
  }

  if (fmt === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  if (fmt === "DD-MM-YYYY") return `${dd}-${mm}-${yyyy}`;

  return `${dd}.${mm}.${yyyy}`;
}

// Same green tones as PlantTile / AuthCard
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

export default function RemindersCalendar({
  reminders,
  selectedDate,
  onSelectDate,
  menuOpenId,
  onToggleMenu,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  // multi-dot marks
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
          ORDER.findIndex((tt) => a.key.startsWith(tt)) -
          ORDER.findIndex((tt) => b.key.startsWith(tt))
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
    };
    return base;
  }, [dotsByDate, selectedDate]);

  const remindersForSelected = useMemo(
    () => reminders.filter((r) => toISODateOnly(r.dueDate) === selectedDate),
    [reminders, selectedDate]
  );

  const typeLabel = (tt: ReminderType) =>
    tr(
      `reminders.types.${tt}`,
      tt === "fertilising" ? "Fertilising" : tt.charAt(0).toUpperCase() + tt.slice(1)
    );

  return (
    <ScrollView
      style={s.calendarWrap}
      contentContainerStyle={s.calendarScrollContent}
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={() => onToggleMenu("")}
    >
      <View style={s.calendarCard}>
        {/* Base green gradient: light -> dark */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        {/* Fog highlight */}
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

        <View pointerEvents="none" style={s.calendarTint} />
        <View pointerEvents="none" style={s.calendarBorder} />

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
              <Text style={s.calHeaderTitle}>{monthYearLabel(dateObj, settings)}</Text>
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.calendarLegendHScroll}
          contentContainerStyle={s.calendarLegendRow}
        >
          {ORDER.map((tt) => (
            <View key={tt} style={s.legendItem}>
              <View style={[s.legendDotSmall, { backgroundColor: ACCENT_BY_TYPE[tt] }]} />
              <Text style={s.legendLabelSmall}>{typeLabel(tt)}</Text>
            </View>
          ))}
        </ScrollView>

        <Text style={s.calendarSubheading}>
          {tr("reminders.calendar.scheduledOn", "Scheduled on {{date}}", {
            date: formatISOForLabel(selectedDate, settings),
          })}
        </Text>

        {remindersForSelected.length === 0 ? (
          <Text style={s.calendarNoItems}>
            {tr("reminders.calendar.noItems", "No reminders for this day.")}
          </Text>
        ) : (
          <View style={s.calendarListBox}>
            {remindersForSelected.map((item) => (
              <View key={item.id} style={{ marginBottom: 8 }}>
                <ReminderMiniTile
                  reminder={item}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item)}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ height: 140 }} />
    </ScrollView>
  );
}
