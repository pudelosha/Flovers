import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { s } from "../styles/reminders.styles";

type Props = {
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function ReminderMiniTileMenu({ onEdit, onDelete }: Props) {
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

  return (
    <View style={[s.menuSheet, styles.menuSheet]} pointerEvents="auto">
      <MenuItem
        label={tr("reminders.menu.edit", "Edit reminder")}
        icon="calendar-edit"
        onPress={onEdit}
      />
      <MenuItem
        label={tr("reminders.menu.delete", "Delete reminder")}
        icon="trash-can-outline"
        danger
        onPress={onDelete}
      />
    </View>
  );
}

function MenuItem({
  label,
  icon,
  danger,
  onPress,
}: {
  label: string;
  icon: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={s.menuItem} onPress={onPress}>
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={danger ? "#FF6B6B" : "#FFFFFF"}
        style={styles.menuIcon}
      />
      <Text style={[s.menuItemText, danger && styles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menuSheet: {
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  menuIcon: {
    marginRight: 8,
  },
  dangerText: {
    color: "#FF6B6B",
  },
});
