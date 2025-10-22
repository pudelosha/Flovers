import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { s } from "../styles/reminders.styles";
import type { Reminder as UIReminder } from "../types/reminders.types";
import { ACCENT_BY_TYPE, ICON_BY_TYPE } from "../constants/reminders.constants";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

type Props = {
  reminder: UIReminder;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function ReminderMiniTile({ reminder, onPress, onEdit, onDelete }: Props) {
  const color = ACCENT_BY_TYPE[reminder.type];

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      {/* Glass stack: stronger blur + soft white tint (no borders) */}
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={20}
        overlayColor="transparent"
        reducedTransparencyFallbackColor="transparent"
      />
      <View pointerEvents="none" style={styles.tint} />

      {/* Left type icon (unchanged) */}
      <View style={[s.miniIconBubble, { backgroundColor: color + "22", borderColor: color + "66" }]}>
        <Icon name={ICON_BY_TYPE[reminder.type]} size={16} color={color} />
      </View>

      {/* Content */}
      <View style={s.miniContent}>
        <Text style={s.miniTitle} numberOfLines={1}>
          {reminder.plant}
        </Text>
        {!!reminder.location && (
          <Text style={s.miniSub} numberOfLines={1}>
            {reminder.location}
          </Text>
        )}
        <Text style={s.miniTag} numberOfLines={1}>
          {reminder.type.toUpperCase()}
          {reminder.intervalValue
            ? ` • every ${reminder.intervalValue} ${reminder.intervalUnit || "days"}`
            : ""}
        </Text>
      </View>

      {/* Quick actions (unchanged) */}
      <View style={s.miniActions}>
        {onEdit ? (
          <Pressable onPress={onEdit} hitSlop={8} style={s.miniActionBtn}>
            <Icon name="pencil" size={16} color="#FFFFFF" />
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={8} style={[s.miniActionBtn, { marginLeft: 6 }]}>
            <Icon name="trash-can-outline" size={16} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Button-like glass container (no border)
  wrap: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    overflow: "hidden",
  },
  // Soft white tint similar to your Profile buttons
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
});
