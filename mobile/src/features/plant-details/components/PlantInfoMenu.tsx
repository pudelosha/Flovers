// PlantInfoMenu.tsx
import React, { useCallback } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
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
        <Text style={s.menuItemText}>{tr("plantDetails.infoMenu.items.plantDefinition", "Plant definition")}</Text>
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

/**
 * Reusable in-app prompt sheet (same style family as ChangePlantImageModal confirm).
 * Kept local here to avoid touching shared files.
 */
export function PlantInfoPromptSheet({
  visible,
  icon,
  title,
  body,
  primaryText,
  onPrimary,
}: {
  visible: boolean;
  icon: string;
  title: string;
  body?: string;
  primaryText: string;
  onPrimary: () => void;
}) {
  if (!visible) return null;

  return (
    <View style={ps.confirmOverlay} pointerEvents="box-none">
      <View style={ps.confirmCard}>
        <View style={ps.confirmHeader}>
          <MaterialCommunityIcons name={icon as any} size={20} color="#FFFFFF" />
          <Text style={ps.confirmTitle}>{title}</Text>
        </View>

        {!!body && <Text style={ps.confirmBody}>{body}</Text>}

        <View style={ps.confirmRow}>
          <Pressable style={[ps.confirmBtn, ps.confirmBtnPrimary]} onPress={onPrimary}>
            <Text style={ps.confirmBtnText}>{primaryText}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const ps = StyleSheet.create({
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
    elevation: 1200,
    justifyContent: "flex-end",
  },
  confirmCard: {
    margin: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  confirmHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  confirmTitle: { color: "#FFFFFF", fontWeight: "900", fontSize: 14, flex: 1 },
  confirmBody: { color: "rgba(255,255,255,0.92)", fontWeight: "500", lineHeight: 18, marginBottom: 12 },
  confirmRow: { flexDirection: "row", gap: 10 },

  confirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  confirmBtnPrimary: { backgroundColor: "rgba(11,114,133,0.92)" },
  confirmBtnText: { color: "#FFFFFF", fontWeight: "900" },
});
