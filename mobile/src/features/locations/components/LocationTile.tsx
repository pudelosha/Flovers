// C:\Projekty\Python\Flovers\mobile\src\features\locations\components\LocationTile.tsx
import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
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
      {/* Glass background */}
      <View style={s.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={20}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
        />
        <View pointerEvents="none" style={s.cardTint} />
        <View pointerEvents="none" style={s.cardBorder} />
      </View>

      <View style={s.cardRow}>
        <View style={s.iconCircle}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color="#FFFFFF" />
        </View>

        <Pressable
          style={{ flex: 1, paddingRight: 8 }}
          onPress={onPressBody}
          android_ripple={{ color: "rgba(255,255,255,0.08)" }}
        >
          <Text style={s.locationName} numberOfLines={1}>
            {location.name}
          </Text>
          <Text style={s.plantCount} numberOfLines={1}>
            {plantLabel}
          </Text>
        </Pressable>

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
              <Text style={s.menuItemText}>
                {tr("locations.menu.edit", "Edit location")}
              </Text>
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
