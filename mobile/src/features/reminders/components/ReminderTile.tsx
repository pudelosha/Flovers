import React, { useCallback, useMemo } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";

import { s } from "../styles/reminders.styles";
import { ACCENT_BY_TYPE, ICON_BY_TYPE } from "../constants/reminders.constants";
import type { Reminder } from "../types/reminders.types";
import ReminderMenu from "./ReminderMenu";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider";

function toDisplayType(t?: string) {
  const x = (t || "").toLowerCase();
  if (x === "water" || x === "watering") return "watering";
  if (x === "fertilize" || x === "fertilising" || x === "fertilizing")
    return "fertilising";
  if (x === "moisture" || x === "misting") return "moisture";
  if (x === "care") return "care";
  if (x === "repot" || x === "repotting") return "repot";
  return "care";
}

function hexToRgba(hex?: string, alpha = 1) {
  const fallback = `rgba(0,0,0,${alpha})`;
  if (!hex || typeof hex !== "string") return fallback;
  let h = hex.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return fallback;
  const bigint = parseInt(h, 16);
  if (Number.isNaN(bigint)) return fallback;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function formatDateWithSettings(d: Date, settings: any) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  const fmt = settings?.dateFormat;

  if (fmt === "mdy" || fmt === "MM/DD/YYYY" || fmt === "MM-DD-YYYY") {
    const sep = fmt === "MM-DD-YYYY" ? "-" : "/";
    return `${mm}${sep}${dd}${sep}${yyyy}`;
  }
  if (fmt === "ymd" || fmt === "YYYY-MM-DD" || fmt === "YYYY/MM/DD") {
    const sep = fmt === "YYYY/MM/DD" ? "/" : "-";
    return `${yyyy}${sep}${mm}${sep}${dd}`;
  }

  // default: dmy / DD.MM.YYYY
  if (fmt === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  if (fmt === "DD-MM-YYYY") return `${dd}-${mm}-${yyyy}`;
  return `${dd}.${mm}.${yyyy}`;
}

function formatDate(d?: Date | string, settings?: any) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (!(date instanceof Date) || isNaN(+date)) return "";
  return formatDateWithSettings(date, settings);
}

function daysUntil(d?: Date | string): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (!(date instanceof Date) || isNaN(+date)) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

type Props = {
  reminder: Reminder;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onPressBody: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

// Same base tone as the TaskTile (tab bar dark-left), slightly transparent
const TAB_BAR_DARK_LEFT_A09 = "rgba(5, 31, 24, 0.9)";

export default function ReminderTile({
  reminder,
  isMenuOpen,
  onToggleMenu,
  onPressBody,
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

  const displayType = toDisplayType(reminder.type as any);
  const accent = ACCENT_BY_TYPE[displayType as any];
  const icon = ICON_BY_TYPE[displayType as any] ?? "calendar";

  const typeLabel = tr(
    `reminders.types.${displayType}`,
    displayType === "fertilising"
      ? "Fertilising"
      : displayType.charAt(0).toUpperCase() + displayType.slice(1)
  );

  const unitKey = reminder.intervalUnit === "months" ? "months" : "days";
  const unitLabel = tr(`reminders.units.${unitKey}`, unitKey);

  const everyStr = useMemo(() => {
    if (!reminder.intervalValue || !reminder.intervalUnit) return "";
    // “Repeats every N …” (localized)
    return tr("reminders.tile.repeatsEvery", "Repeats every {{count}} {{unit}}", {
      count: reminder.intervalValue,
      unit: unitLabel,
    });
  }, [reminder.intervalValue, reminder.intervalUnit, tr, unitLabel]);

  const dueLine = useMemo(() => {
    const dueDays = daysUntil(reminder.dueDate);
    const dateStr = reminder.dueDate ? formatDate(reminder.dueDate, settings) : "";
    if (dueDays === null || !dateStr) return "";

    let prefix = "";
    if (dueDays === 0) prefix = tr("reminders.tile.dueToday", "Due today");
    else if (dueDays === 1)
      prefix = tr("reminders.tile.dueInOneDay", "Due in 1 day");
    else
      prefix = tr("reminders.tile.dueInDays", "Due in {{count}} days", {
        count: dueDays,
      });

    return tr("reminders.tile.dueLine", "{{prefix}} on {{date}}", {
      prefix,
      date: dateStr,
    });
  }, [reminder.dueDate, tr, settings]);

  return (
    <View style={s.cardWrap}>
      <View style={s.cardGlass}>
        {/* Base background (replaces BlurView): dark green @ 0.9 */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: TAB_BAR_DARK_LEFT_A09,
              borderRadius: 28,
            },
          ]}
        />

        {/* Subtle fog highlight (same as TaskTile) */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={[
            "rgba(255, 255, 255, 0.06)", // Top-left highlight
            "rgba(255, 255, 255, 0.02)", // Center
            "rgba(255, 255, 255, 0.08)", // Bottom-right highlight
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Accent gradient: task-type color (left) -> tab dark green (right) */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={[
            hexToRgba(accent, 0.34),
            hexToRgba(accent, 0.18),
            hexToRgba(accent, 0.06),
            TAB_BAR_DARK_LEFT_A09,
          ]}
          locations={[0, 0.28, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Subtle border (instead of s.cardBorder tuned for BlurView) */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 28,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
            },
          ]}
        />
      </View>

      <View style={[s.cardRow, { paddingVertical: 4 }]}>
        <View style={s.leftCol}>
          <View
            style={[
              s.leftIconBubble,
              { backgroundColor: hexToRgba("#000", 0.15) },
            ]}
          >
            <MaterialCommunityIcons name={icon} size={20} color={accent} />
          </View>
          <Text style={[s.leftCaption, { color: accent }]}>
            {typeLabel.toUpperCase()}
          </Text>
        </View>

        <Pressable style={s.centerCol} onPress={onPressBody}>
          <Text style={s.plantName} numberOfLines={1}>
            {reminder.plant}
          </Text>
          <Text style={s.location} numberOfLines={1}>
            {reminder.location}
          </Text>
          {!!everyStr && (
            <Text style={styles.metaCompact} numberOfLines={1}>
              {everyStr}
            </Text>
          )}
          {!!dueLine && (
            <Text style={styles.metaCompact} numberOfLines={1}>
              {dueLine}
            </Text>
          )}
        </Pressable>

        <View style={s.rightCol}>
          <Pressable
            onPress={onToggleMenu}
            style={s.menuBtn}
            android_ripple={{
              color: "rgba(255,255,255,0.16)",
              borderless: true,
            }}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="dots-horizontal"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>

      {isMenuOpen && <ReminderMenu onEdit={onEdit} onDelete={onDelete} />}
    </View>
  );
}

const styles = StyleSheet.create({
  metaCompact: {
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.9,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
});
