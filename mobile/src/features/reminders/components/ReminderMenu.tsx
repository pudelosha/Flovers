import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/reminders.styles";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

type Props = {
  onEdit: () => void;
  onDelete: () => void;
};

export default function ReminderMenu({ onEdit, onDelete }: Props) {
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
    <View style={s.menuSheet} pointerEvents="auto">
      <MenuItem
        label={tr("reminders.menu.edit", "Edit reminder")}
        icon="calendar-edit"
        onPress={onEdit}
      />
      <MenuItem
        label={tr("reminders.menu.delete", "Delete reminder")}
        icon="trash-can-outline"
        danger
        onPress={() => {
          onDelete();
        }}
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
  onPress: () => void;
}) {
  return (
    <Pressable style={s.menuItem} onPress={onPress}>
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={danger ? "#FF6B6B" : "#FFFFFF"}
        style={{ marginRight: 8 }}
      />
      <Text style={[s.menuItemText, danger && { color: "#FF6B6B" }]}>{label}</Text>
    </Pressable>
  );
}
