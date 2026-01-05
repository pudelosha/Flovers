import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { s } from "../styles/reminders.styles";
import type { Reminder as UIReminder } from "../types/reminders.types";
import { ACCENT_BY_TYPE, ICON_BY_TYPE } from "../constants/reminders.constants";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

type Props = {
  reminder: UIReminder;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

function toTypeKey(t: string) {
  const x = (t || "").toLowerCase();
  if (x === "watering" || x === "water") return "watering";
  if (x === "fertilising" || x === "fertilize" || x === "fertilizing") return "fertilising";
  if (x === "moisture" || x === "misting") return "moisture";
  if (x === "repot" || x === "repotting") return "repot";
  if (x === "care") return "care";
  return "care";
}

export default function ReminderMiniTile({ reminder, onPress, onEdit, onDelete }: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const typeKey = toTypeKey(reminder.type);
  const color = ACCENT_BY_TYPE[typeKey as any];
  const typeLabel =
    tr(`reminders.types.${typeKey}`, typeKey === "fertilising" ? "Fertilising" : typeKey.charAt(0).toUpperCase() + typeKey.slice(1));

  const unitKey = reminder.intervalUnit === "months" ? "months" : "days";
  const unitLabel = tr(`reminders.units.${unitKey}`, unitKey);

  const intervalPart =
    reminder.intervalValue
      ? tr("reminders.common.everyN", "every {{count}} {{unit}}", {
          count: reminder.intervalValue,
          unit: unitLabel,
        })
      : "";

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={20}
        overlayColor="transparent"
        reducedTransparencyFallbackColor="transparent"
      />
      <View pointerEvents="none" style={styles.tint} />

      <View style={[s.miniIconBubble, { backgroundColor: color + "22", borderColor: color + "66" }]}>
        <Icon name={ICON_BY_TYPE[typeKey as any]} size={16} color={color} />
      </View>

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
          {typeLabel.toUpperCase()}
          {intervalPart ? ` • ${intervalPart}` : ""}
        </Text>
      </View>

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
  wrap: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    overflow: "hidden",
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
});
