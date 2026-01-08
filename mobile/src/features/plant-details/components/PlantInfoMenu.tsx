import React, { useCallback } from "react";
import { View, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import { s } from "../styles/plant-details.styles";

type Props = {
  onPlantDefinition: () => void;
  onEditPlant: () => void;
  onChangeImage: () => void;
  onShowReminders: () => void;
};

export default function PlantInfoMenu({ onPlantDefinition, onEditPlant, onChangeImage, onShowReminders }: Props) {
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
      <Pressable style={s.menuItem} onPress={onPlantDefinition} android_ripple={{ color: "rgba(255,255,255,0.12)" }}>
        <MaterialCommunityIcons name="book-open-variant" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={s.menuItemText}>
          {tr("plantDetails.infoMenu.items.plantDefinition", "Plant definition")}
        </Text>
      </Pressable>

      <Pressable style={s.menuItem} onPress={onEditPlant} android_ripple={{ color: "rgba(255,255,255,0.12)" }}>
        <MaterialCommunityIcons name="pencil-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={s.menuItemText}>{tr("plantDetails.infoMenu.items.editPlant", "Edit plant")}</Text>
      </Pressable>

      <Pressable style={s.menuItem} onPress={onChangeImage} android_ripple={{ color: "rgba(255,255,255,0.12)" }}>
        <MaterialCommunityIcons name="image-edit-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={s.menuItemText}>{tr("plantDetails.infoMenu.items.changeImage", "Change image")}</Text>
      </Pressable>

      <Pressable style={s.menuItem} onPress={onShowReminders} android_ripple={{ color: "rgba(255,255,255,0.12)" }}>
        <MaterialCommunityIcons name="calendar" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={s.menuItemText}>{tr("plantDetails.infoMenu.items.showReminders", "Show reminders")}</Text>
      </Pressable>
    </View>
  );
}
