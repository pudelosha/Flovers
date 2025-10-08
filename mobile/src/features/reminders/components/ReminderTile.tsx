import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";
import { s } from "../styles/reminders.styles";
import { ACCENT_BY_TYPE, ICON_BY_TYPE, TILE_BLUR } from "../constants/reminders.constants";
import type { Reminder } from "../types/reminders.types";
import ReminderMenu from "./ReminderMenu";

type Props = {
  reminder: Reminder;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onPressBody: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function ReminderTile({
  reminder,
  isMenuOpen,
  onToggleMenu,
  onPressBody,
  onEdit,
  onDelete,
}: Props) {
  const a = ACCENT_BY_TYPE[reminder.type];
  const icon = ICON_BY_TYPE[reminder.type];

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
          style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(a, 0.10) }]}
          pointerEvents="none"
        />
      </View>

      <View style={s.cardRow}>
        {/* Left */}
        <View style={s.leftCol}>
          <View style={[s.leftIconBubble, { backgroundColor: hexToRgba("#000", 0.15) }]}>
            <MaterialCommunityIcons name={icon} size={20} color={a} />
          </View>
          <Text style={[s.leftCaption, { color: a }]}>{reminder.type.toUpperCase()}</Text>
        </View>

        {/* Body (press -> details) */}
        <Pressable style={s.centerCol} onPress={onPressBody}>
          <Text style={s.plantName} numberOfLines={1}>{reminder.plant}</Text>
          <Text style={s.location} numberOfLines={1}>{reminder.location}</Text>
          <View style={s.dueRow}>
            <Text style={s.dueWhen}>{reminder.due}</Text>
            <Text style={s.dueDateText}>{formatDate(reminder.dueDate)}</Text>
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

/* local helpers */
function hexToRgba(hex: string, alpha = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function formatDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
