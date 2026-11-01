import React, { useMemo, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import Calendar from "react-native-calendars/src/calendar";
import { LocaleConfig } from "react-native-calendars";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider";
import type { Task, TaskType } from "../types/home.types";
import { ACCENT_BY_TYPE } from "../../reminders/constants/reminders.constants";
import { s } from "../styles/task-calendar.styles";

export function taskDateKey(date: Date | string): string {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const value = date instanceof Date ? date : new Date(date);
  if (!Number.isFinite(+value)) return "";
  return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
}
const toISODateOnly = taskDateKey;
const ORDER: TaskType[] = ["watering", "moisture", "fertilising", "care", "repot"];
function monthYearLabel(input: any, settings?: any, activeLanguage?: string) {
  const d: Date =
    (input && typeof input?.toDate === "function" && input.toDate()) ||
    (input instanceof Date ? input : new Date(input));

  const rawLocale = activeLanguage || settings?.locale || undefined;
  const raw = d.toLocaleString(rawLocale, { month: "long", year: "numeric" });

  return raw.replace(/^\p{Ll}/u, (m) => m.toUpperCase());
}

const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";
export default function TaskCalendar({tasks,selectedDate,onSelectDate}:{tasks:Task[];selectedDate:string;onSelectDate:(date:string)=>void}) {
  const {t,i18n}=useTranslation();
  const {currentLanguage}=useLanguage();
  const {settings}=useSettings();
  const i18nResolvedLanguage = (i18n as any).resolvedLanguage as
    | string
    | undefined;
  const activeLanguage = useMemo(
    () =>
      currentLanguage ||
      i18nResolvedLanguage ||
      i18n.language ||
      "en",
    [currentLanguage, i18nResolvedLanguage, i18n.language]
  );

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      const txt = t(
        key,
        values ? { ...values, lng: activeLanguage } : { lng: activeLanguage }
      );
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : String(txt);
    },
    [t, activeLanguage]
  );

  const calendarLocaleKey = useMemo(
    () => `app-home-calendar-${activeLanguage}`,
    [activeLanguage]
  );

  const calendarLocale = useMemo(
    () => ({
      monthNames: [
        tr("home.calendar.months.january", "January"),
        tr("home.calendar.months.february", "February"),
        tr("home.calendar.months.march", "March"),
        tr("home.calendar.months.april", "April"),
        tr("home.calendar.months.may", "May"),
        tr("home.calendar.months.june", "June"),
        tr("home.calendar.months.july", "July"),
        tr("home.calendar.months.august", "August"),
        tr("home.calendar.months.september", "September"),
        tr("home.calendar.months.october", "October"),
        tr("home.calendar.months.november", "November"),
        tr("home.calendar.months.december", "December"),
      ],

      monthNamesShort: [
        tr("home.calendar.monthsShort.january", "Jan"),
        tr("home.calendar.monthsShort.february", "Feb"),
        tr("home.calendar.monthsShort.march", "Mar"),
        tr("home.calendar.monthsShort.april", "Apr"),
        tr("home.calendar.monthsShort.may", "May"),
        tr("home.calendar.monthsShort.june", "Jun"),
        tr("home.calendar.monthsShort.july", "Jul"),
        tr("home.calendar.monthsShort.august", "Aug"),
        tr("home.calendar.monthsShort.september", "Sep"),
        tr("home.calendar.monthsShort.october", "Oct"),
        tr("home.calendar.monthsShort.november", "Nov"),
        tr("home.calendar.monthsShort.december", "Dec"),
      ],

      // react-native-calendars expects Sunday-first arrays here.
      // firstDay={1} below rotates display to Monday-first.
      dayNames: [
        tr("home.calendar.weekdays.sunday", "Sunday"),
        tr("home.calendar.weekdays.monday", "Monday"),
        tr("home.calendar.weekdays.tuesday", "Tuesday"),
        tr("home.calendar.weekdays.wednesday", "Wednesday"),
        tr("home.calendar.weekdays.thursday", "Thursday"),
        tr("home.calendar.weekdays.friday", "Friday"),
        tr("home.calendar.weekdays.saturday", "Saturday"),
      ],

      dayNamesShort: [
        tr("home.calendar.weekdaysShort.sun", "Sun"),
        tr("home.calendar.weekdaysShort.mon", "Mon"),
        tr("home.calendar.weekdaysShort.tue", "Tue"),
        tr("home.calendar.weekdaysShort.wed", "Wed"),
        tr("home.calendar.weekdaysShort.thu", "Thu"),
        tr("home.calendar.weekdaysShort.fri", "Fri"),
        tr("home.calendar.weekdaysShort.sat", "Sat"),
      ],

      today: tr("home.calendar.today", "Today"),
    }),
    [tr]
  );

  // Calendar reads LocaleConfig during render; register before mounting it so a
  // newly opened localized calendar does not briefly show English labels.
  const calendarRenderKey = useMemo(() => {
    LocaleConfig.locales[calendarLocaleKey] = calendarLocale;
    LocaleConfig.defaultLocale = calendarLocaleKey;
    return calendarLocaleKey;
  }, [calendarLocaleKey, calendarLocale]);

  // multi-dot marks
  const dotsByDate = useMemo(() => {
    const acc: Record<string, { key: string; color: string }[]> = {};
    for (const r of tasks) {
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
  }, [tasks]);

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


  return (
      <View style={s.calendarCard} testID="home-calendar-card">
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
          key={calendarRenderKey}
          current={selectedDate}
          testID="home-task-calendar"
          firstDay={1}
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
              <Text style={s.calHeaderTitle}>
                {monthYearLabel(dateObj, settings, activeLanguage)}
              </Text>
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

      </View>
  );
}
