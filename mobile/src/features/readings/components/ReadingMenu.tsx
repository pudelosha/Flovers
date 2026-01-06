import React, { useCallback } from "react";
import { View, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/readings.styles";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

type Props = {
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPlantDetails: () => void;
};

type ItemProps = {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

const Item = ({ icon, label, onPress, danger }: ItemProps) => (
  <Pressable style={s.menuItem} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={16} color={danger ? "#FF6B6B" : "#FFFFFF"} style={{ marginRight: 8 }} />
    <Text style={[s.menuItemText, danger && { color: "#FF6B6B" }]}>{label}</Text>
  </Pressable>
);

export default function ReadingMenu({ onHistory, onEdit, onDelete, onPlantDetails }: Props) {
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
      <Item icon="chart-line" label={tr("readings.menu.history", "Readings history")} onPress={onHistory} />
      <Item icon="sprout-outline" label={tr("readings.menu.plantDetails", "Plant details")} onPress={onPlantDetails} />
      <Item icon="pencil-outline" label={tr("readings.menu.editDevice", "Edit device")} onPress={onEdit} />
      <Item icon="trash-can-outline" label={tr("readings.menu.deleteDevice", "Delete device")} danger onPress={onDelete} />
    </View>
  );
}
