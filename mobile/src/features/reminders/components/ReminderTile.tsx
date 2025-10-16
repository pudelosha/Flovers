import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";
import { s } from "../styles/reminders.styles";
import { ACCENT_BY_TYPE, ICON_BY_TYPE, TILE_BLUR } from "../constants/reminders.constants";
import type { Reminder, ReminderType } from "../types/reminders.types";
import ReminderMenu from "./ReminderMenu";

type Props = {
  reminder: Reminder;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onPressBody: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

// Map possible API/canonical keys to your display keys used by constants
function toDisplayType(t: string): ReminderType {
  const x = (t || "").toLowerCase();
  if (x === "water" || x === "watering") return "watering";
  if (x === "fertilize" || x === "fertilising" || x === "fertilizing") return "fertilising";
  if (x === "moisture" || x === "misting") return "moisture";
  if (x === "care") return "care";
  if (x === "repot" || x === "repotting") return "repot";
  return "care";
}

/* local helpers */
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

export default function ReminderTile({
  reminder,
  isMenuOpen,
  onToggleMenu,
  onPressBody,
  onEdit,
  onDelete,
}: Props) {
  const displayType = toDisplayType(reminder.type as any);
  const accent = ACCENT_BY_TYPE[displayType];
  const icon = ICON_BY_TYPE[displayType] ?? "calendar";

  return (
    <View style={s.cardWrap}>
      {/* Frosted glass background with subtle type tint */}
      <View style={s.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={TILE_BLUR}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
        />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(accent, 0.10) }]}
          pointerEvents="none"
        />
      </View>

      <View style={s.cardRow}>
        {/* Left */}
        <View style={s.leftCol}>
          <View style={[s.leftIconBubble, { backgroundColor: hexToRgba("#000", 0.15) }]}>
            <MaterialCommunityIcons name={icon} size={20} color={accent} />
          </View>
          <Text style={[s.leftCaption, { color: accent }]}>{displayType.toUpperCase()}</Text>
        </View>

        {/* Body (press -> details) */}
        <Pressable style={s.centerCol} onPress={onPressBody}>
          <Text style={s.plantName} numberOfLines={1}>{reminder.plant}</Text>
          <Text style={s.location} numberOfLines={1}>{reminder.location}</Text>
          <View style={s.dueRow}>
            {!!reminder.due && <Text style={s.dueWhen}>{reminder.due}</Text>}
            {!!reminder.dueDate && <Text style={s.dueDateText}>{formatDate(reminder.dueDate)}</Text>}
          </View>
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

      {isMenuOpen && <ReminderMenu onEdit={onEdit} onDelete={onDelete} />}
    </View>
  );
}
