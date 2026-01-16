import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import { locStyles as s } from "../styles/locations.styles";
import type { PlantLocation } from "../types/locations.types";

type Props = {
  location: PlantLocation;
  isMenuOpen: boolean;
  onPressBody: () => void;
  onPressMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

// EXACT SAME green tones as AuthCard / Plants / Reminders / Home
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

export default function LocationTile({
  location,
  isMenuOpen,
  onPressBody,
  onPressMenu,
  onEdit,
  onDelete,
}: Props) {
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

  const plantLabel = (() => {
    const c = location.plantCount;

    if (currentLanguage === "pl") {
      const mod10 = c % 10;
      const mod100 = c % 100;
      if (c === 1) return tr("locations.plantCount.one", "1 roślina", { count: c });
      if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
        return tr("locations.plantCount.few", "{{count}} rośliny", { count: c });
      }
      return tr("locations.plantCount.many", "{{count}} roślin", { count: c });
    }

    if (c === 1) return tr("locations.plantCount.one", "1 plant", { count: c });
    return tr("locations.plantCount.other", "{{count}} plants", { count: c });
  })();

  return (
    <View style={s.cardWrap}>
      {/* Glass background (BlurView -> gradients like Plants) */}
      <View style={s.cardGlass}>
        {/* Base green gradient: light -> dark (AuthCard match) */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        {/* Fog highlight (AuthCard/Plants match) */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={[
            "rgba(255, 255, 255, 0.06)",
            "rgba(255, 255, 255, 0.02)",
            "rgba(255, 255, 255, 0.08)",
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Unified tint + border (keeps your existing look but avoids inner shade) */}
        <View pointerEvents="none" style={s.cardTint} />
        <View pointerEvents="none" style={s.cardBorder} />
      </View>

      <View style={s.cardRow}>
        <View style={s.iconCircle}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color="#FFFFFF" />
        </View>

        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.locationName} numberOfLines={1}>
            {location.name}
          </Text>
          <Text style={s.plantCount} numberOfLines={1}>
            {plantLabel}
          </Text>
        </View>

        <Pressable
          onPress={onPressMenu}
          style={s.menuBtn}
          android_ripple={{ color: "rgba(255,255,255,0.16)", borderless: true }}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
        </Pressable>

        {isMenuOpen && (
          <View style={s.menuSheet}>
            <Pressable
              style={s.menuItem}
              onPress={onEdit}
              android_ripple={{ color: "rgba(255,255,255,0.16)" }}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={16}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={s.menuItemText}>{tr("locations.menu.edit", "Edit location")}</Text>
            </Pressable>

            <Pressable
              style={s.menuItem}
              onPress={onDelete}
              android_ripple={{ color: "rgba(255,107,107,0.18)" }}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={16}
                color="#FF6B6B"
                style={{ marginRight: 6 }}
              />
              <Text style={[s.menuItemText, s.menuItemDangerText]}>
                {tr("locations.menu.delete", "Delete location")}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
