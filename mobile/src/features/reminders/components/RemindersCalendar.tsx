import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Pressable, View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Calendar from "react-native-calendars/src/calendar";
import { LocaleConfig } from "react-native-calendars";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";

import type { Reminder as UIReminder, ReminderType } from "../types/reminders.types";
import { ACCENT_BY_TYPE } from "../constants/reminders.constants";
import ReminderMiniTile from "./ReminderMiniTile";
import ReminderMiniTileMenu from "./ReminderMiniTileMenu";
import { plantAccess } from "../../../shared/utils/plantAccess";
import { s } from "../styles/reminders.styles";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider";

type Props = {
  reminders: UIReminder[];
  selectedDate: string;
  openMenuId: string | null;
  onSelectDate: (isoDate: string) => void;
  onToggleMenu: (id: string) => void;
  onToggleActive: (r: UIReminder) => void;
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

function monthYearLabel(input: any, settings?: any, activeLanguage?: string) {
  const d: Date =
    (input && typeof input?.toDate === "function" && input.toDate()) ||
    (input instanceof Date ? input : new Date(input));

  const rawLocale = activeLanguage || settings?.locale || undefined;
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
  openMenuId,
  onSelectDate,
  onToggleMenu,
  onToggleActive,
  onEdit,
  onDelete,
}: Props) {
  const { t, i18n } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();
  const nav = useNavigation<any>();
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const tileRefs = useRef<Record<string, View | null>>({});
  const hostRef = useRef<View | null>(null);
  const menuRequest = useRef(0);
  const menuContext = `${selectedDate}:${currentLanguage}:${window.width}:${window.height}:${focused}`;
  const currentContext = useRef(menuContext);
  currentContext.current = menuContext;
  const [menuAnchor, setMenuAnchor] = useState<{ id: string; context: string; right: number; top: number; width: number; height: number } | null>(null);
  const [menuHeight, setMenuHeight] = useState(156);
  const closeMenu = useCallback(() => {
    menuRequest.current += 1;
    setMenuAnchor(null);
    onToggleMenu("");
  }, [onToggleMenu]);
  const toggleMenu = (id: string) => {
    if (openMenuId === id) { closeMenu(); return; }
    const request = ++menuRequest.current;
    const context = menuContext;
    tileRefs.current[id]?.measureInWindow((x, y, width, height) => {
      if (request !== menuRequest.current || currentContext.current !== context || width <= 0 || height <= 0) return;
      hostRef.current?.measureInWindow((hostX, hostY, hostWidth, hostHeight) => {
        if (request !== menuRequest.current || currentContext.current !== context || hostWidth <= 0 || hostHeight <= 0) return;
        setMenuHeight(156);
        setMenuAnchor({ id, context, right: Math.max(12, hostWidth - (x - hostX) - width + 6), top: y - hostY - 6,
          width: hostWidth, height: hostHeight });
        onToggleMenu(id);
      });
    });
  };
  useEffect(() => () => { menuRequest.current += 1; }, []);
  const i18nResolvedLanguage = (i18n as any).resolvedLanguage as
    | string
    | undefined;
  const activeLanguage = useMemo(
    () =>
      currentLanguage ||
      i18nResolvedLanguage ||
      i18n.language ||
      settings?.locale ||
      "en",
    [currentLanguage, i18nResolvedLanguage, i18n.language, settings?.locale]
  );
  const [localeRevision, setLocaleRevision] = useState(0);

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      const txt = t(
        key,
        values ? { ...values, lng: activeLanguage } : { lng: activeLanguage }
      );
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, activeLanguage]
  );

  const calendarLocaleKey = useMemo(
    () => `app-reminders-calendar-${activeLanguage}`,
    [activeLanguage]
  );

  const calendarLocale = useMemo(
    () => ({
      monthNames: [
        tr("reminders.calendar.months.january", "January"),
        tr("reminders.calendar.months.february", "February"),
        tr("reminders.calendar.months.march", "March"),
        tr("reminders.calendar.months.april", "April"),
        tr("reminders.calendar.months.may", "May"),
        tr("reminders.calendar.months.june", "June"),
        tr("reminders.calendar.months.july", "July"),
        tr("reminders.calendar.months.august", "August"),
        tr("reminders.calendar.months.september", "September"),
        tr("reminders.calendar.months.october", "October"),
        tr("reminders.calendar.months.november", "November"),
        tr("reminders.calendar.months.december", "December"),
      ],

      monthNamesShort: [
        tr("reminders.calendar.monthsShort.january", "Jan"),
        tr("reminders.calendar.monthsShort.february", "Feb"),
        tr("reminders.calendar.monthsShort.march", "Mar"),
        tr("reminders.calendar.monthsShort.april", "Apr"),
        tr("reminders.calendar.monthsShort.may", "May"),
        tr("reminders.calendar.monthsShort.june", "Jun"),
        tr("reminders.calendar.monthsShort.july", "Jul"),
        tr("reminders.calendar.monthsShort.august", "Aug"),
        tr("reminders.calendar.monthsShort.september", "Sep"),
        tr("reminders.calendar.monthsShort.october", "Oct"),
        tr("reminders.calendar.monthsShort.november", "Nov"),
        tr("reminders.calendar.monthsShort.december", "Dec"),
      ],

      // react-native-calendars expects Sunday-first arrays here.
      // firstDay={1} below rotates display to Monday-first.
      dayNames: [
        tr("reminders.calendar.weekdays.sunday", "Sunday"),
        tr("reminders.calendar.weekdays.monday", "Monday"),
        tr("reminders.calendar.weekdays.tuesday", "Tuesday"),
        tr("reminders.calendar.weekdays.wednesday", "Wednesday"),
        tr("reminders.calendar.weekdays.thursday", "Thursday"),
        tr("reminders.calendar.weekdays.friday", "Friday"),
        tr("reminders.calendar.weekdays.saturday", "Saturday"),
      ],

      dayNamesShort: [
        tr("reminders.calendar.weekdaysShort.sun", "Sun"),
        tr("reminders.calendar.weekdaysShort.mon", "Mon"),
        tr("reminders.calendar.weekdaysShort.tue", "Tue"),
        tr("reminders.calendar.weekdaysShort.wed", "Wed"),
        tr("reminders.calendar.weekdaysShort.thu", "Thu"),
        tr("reminders.calendar.weekdaysShort.fri", "Fri"),
        tr("reminders.calendar.weekdaysShort.sat", "Sat"),
      ],

      today: tr("reminders.calendar.today", "Today"),
    }),
    [tr]
  );

  useEffect(() => {
    LocaleConfig.locales[calendarLocaleKey] = calendarLocale;
    LocaleConfig.defaultLocale = calendarLocaleKey;
    setLocaleRevision((value) => value + 1);
  }, [calendarLocaleKey, calendarLocale]);

  const calendarRenderKey = useMemo(
    () => `${calendarLocaleKey}-${localeRevision}`,
    [calendarLocaleKey, localeRevision]
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
  const menuReminder = focused && menuAnchor?.context === menuContext && menuAnchor.id === openMenuId
    ? remindersForSelected.find(reminder => reminder.id === openMenuId) : undefined;
  const topLimit = 8;
  const bottomLimit = (menuAnchor?.height ?? window.height) - 64 - Math.max(insets.bottom, 10) - 12;
  const menuTop = menuAnchor ? Math.max(topLimit, Math.min(menuAnchor.top, bottomLimit - menuHeight)) : topLimit;
  useEffect(() => {
    if (!menuReminder) return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => { closeMenu(); return true; });
    return () => handler.remove();
  }, [menuReminder?.id, closeMenu]);

  const typeLabel = (tt: ReminderType) =>
    tr(
      `reminders.types.${tt}`,
      tt === "fertilising" ? "Fertilising" : tt.charAt(0).toUpperCase() + tt.slice(1)
    );

  return (
    <View ref={hostRef} collapsable={false} testID="reminders-calendar-host"
      style={[styles.calendarHost, !!menuReminder && styles.calendarHostRaised]}>
    <ScrollView
      style={s.calendarWrap}
      contentContainerStyle={s.calendarScrollContent}
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={closeMenu}
    >
      <View style={s.calendarCard} testID="reminders-calendar-card">
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
            {remindersForSelected.map((item) => {
              const isMenuOpen = openMenuId === item.id;

              return (
                <View
                  key={item.id}
                  ref={node => { tileRefs.current[item.id] = node; }}
                  collapsable={false}
                  testID={`calendar-reminder-${item.id}`}
                  style={[styles.miniTileSlot, isMenuOpen && styles.miniTileSlotRaised]}
                >
                  <ReminderMiniTile
                    reminder={item}
                    isMenuOpen={isMenuOpen}
                    renderMenu={false}
                    onToggleMenu={() => toggleMenu(item.id)}
                    onToggleActive={() => onToggleActive(item)}
                    onEdit={() => onEdit(item)}
                    onDelete={() => onDelete(item)}
                  />
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: 140 }} />
    </ScrollView>
    {!!menuReminder && !!menuAnchor && <View style={styles.menuOverlay}
      testID="calendar-reminder-menu-overlay" accessibilityViewIsModal>
        <Pressable testID="calendar-reminder-menu-backdrop" style={StyleSheet.absoluteFill}
          accessibilityRole="button" accessibilityLabel={String(tr("sharing.common.close", "Close"))} onPress={closeMenu} />
        <ReminderMiniTileMenu isActive={menuReminder.isActive} canEdit={plantAccess(menuReminder.access).canEdit}
          style={{ top: menuTop, right: menuAnchor.right, maxWidth: Math.max(0, menuAnchor.width - menuAnchor.right - 12),
            elevation: 0, shadowOpacity: 0 }}
          onLayout={event => { const height = event.nativeEvent.layout.height; if (height > 0) setMenuHeight(height); }}
          onToggleActive={() => { closeMenu(); onToggleActive(menuReminder); }}
          onEdit={() => { closeMenu(); onEdit(menuReminder); }}
          onDelete={() => { closeMenu(); onDelete(menuReminder); }}
          onPlantDetails={() => { closeMenu(); nav.navigate("PlantDetails", { id: menuReminder.plantId }); }} />
    </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  calendarHost: { flex: 1, position: "relative" },
  calendarHostRaised: { zIndex: 50, elevation: 0 },
  menuOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  miniTileSlot: {
    marginBottom: 8,
    zIndex: 1,
  },
  miniTileSlotRaised: {
    zIndex: 50,
    elevation: 50,
  },
});
