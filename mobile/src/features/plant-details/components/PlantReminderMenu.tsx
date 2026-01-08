import React, { useCallback } from "react";
import { View, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import { s } from "../styles/plant-details.styles";

type Props = {
  onMarkComplete: () => void;
  onEdit: () => void;
  onShowHistory: () => void;
};

export default function PlantReminderMenu({ onMarkComplete, onEdit, onShowHistory }: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  return (
    <View style={s.menuSheet} pointerEvents="auto">
      <Pressable
        style={s.menuItem}
        onPress={onMarkComplete}
        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      >
        <MaterialCommunityIcons
          name="check-circle-outline"
          size={18}
          color="#FFFFFF"
          style={{ marginRight: 8 }}
        />
        <Text style={s.menuItemText}>
          {tr("plantDetails.reminders.menu.markComplete", "Mark as complete")}
        </Text>
      </Pressable>

      <Pressable style={s.menuItem} onPress={onEdit} android_ripple={{ color: "rgba(255,255,255,0.12)" }}>
        <MaterialCommunityIcons name="calendar-edit" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={s.menuItemText}>
          {tr("plantDetails.reminders.menu.editReminder", "Edit reminder")}
        </Text>
      </Pressable>

      <Pressable
        style={s.menuItem}
        onPress={onShowHistory}
        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      >
        <MaterialCommunityIcons name="history" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={s.menuItemText}>
          {tr("plantDetails.reminders.menu.showHistory", "Show history")}
        </Text>
      </Pressable>
    </View>
  );
}
