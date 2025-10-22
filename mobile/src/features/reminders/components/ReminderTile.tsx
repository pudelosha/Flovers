import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";
import { s } from "../styles/reminders.styles";
import { ACCENT_BY_TYPE, ICON_BY_TYPE, TILE_BLUR } from "../constants/reminders.constants";
import type { Reminder } from "../types/reminders.types";
import ReminderMenu from "./ReminderMenu";

// --- helpers (mirrors your earlier code) ---
function toDisplayType(t?: string) {
  const x = (t || "").toLowerCase();
  if (x === "water" || x === "watering") return "watering";
  if (x === "fertilize" || x === "fertilising" || x === "fertilizing") return "fertilising";
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
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (h.length !== 6) return fallback;
  const bigint = parseInt(h, 16);
  if (Number.isNaN(bigint)) return fallback;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
function formatDate(d?: Date | string) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (!(date instanceof Date) || isNaN(+date)) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function daysUntil(d?: Date | string): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (!(date instanceof Date) || isNaN(+date)) return null;
  const start = new Date(); start.setHours(0,0,0,0);
  const end   = new Date(date); end.setHours(0,0,0,0);
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

export default function ReminderTile({
  reminder, isMenuOpen, onToggleMenu, onPressBody, onEdit, onDelete,
}: Props) {
  const displayType = toDisplayType(reminder.type as any);
  const accent = ACCENT_BY_TYPE[displayType];
  const icon = ICON_BY_TYPE[displayType] ?? "calendar";

  const everyStr =
    reminder.intervalValue && reminder.intervalUnit
      ? `Reoccurs every ${reminder.intervalValue} ${reminder.intervalUnit === "months" ? "months" : "days"}`
      : "";

  const dueDays = daysUntil(reminder.dueDate);
  const duePrefix =
    dueDays === null ? "" :
    dueDays === 0   ? "Due today" :
    dueDays === 1   ? "Due in 1 day" :
                      `Due in ${dueDays} days`;
  const dueLine = reminder.dueDate ? `${duePrefix} on ${formatDate(reminder.dueDate)}` : "";

  return (
    <View style={s.cardWrap}>
      {/* Glass (blur + subtle type tint + thin border) */}
      <View style={s.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={TILE_BLUR}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(accent, 0.10) }]} pointerEvents="none" />
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.20)" },
          ]}
          pointerEvents="none"
        />
      </View>

      <View style={[s.cardRow, { paddingVertical: 4 }]}>
        {/* Left */}
        <View style={s.leftCol}>
          <View style={[s.leftIconBubble, { backgroundColor: hexToRgba("#000", 0.15) }]}>
            <MaterialCommunityIcons name={icon} size={20} color={accent} />
          </View>
          <Text style={[s.leftCaption, { color: accent }]}>{displayType.toUpperCase()}</Text>
        </View>

        {/* Body */}
        <Pressable style={s.centerCol} onPress={onPressBody}>
          <Text style={s.plantName} numberOfLines={1}>{reminder.plant}</Text>
          <Text style={s.location} numberOfLines={1}>{reminder.location}</Text>
          {!!everyStr && <Text style={styles.metaCompact} numberOfLines={1}>{everyStr}</Text>}
          {!!dueLine &&  <Text style={styles.metaCompact} numberOfLines={1}>{dueLine}</Text>}
        </Pressable>

        {/* Right (menu) */}
        <View style={s.rightCol}>
          <Pressable
            onPress={onToggleMenu}
            style={s.menuBtn}
            android_ripple={{ color: "rgba(255,255,255,0.16)", borderless: true }}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {isMenuOpen && (
        <ReminderMenu
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
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
