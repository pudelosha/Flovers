// src/features/locations/components/LocationTile.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

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
  const plantLabel =
    location.plantCount === 1 ? "1 plant" : `${location.plantCount} plants`;

  return (
    <View style={s.cardWrap}>
      {/* Glass background: blur + white tint + thin border (matching Plants tiles) */}
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
        {/* Location icon on the left (restored from original concept) */}
        <View style={s.iconCircle}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={18}
            color="#FFFFFF"
          />
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
          <MaterialCommunityIcons
            name="dots-horizontal"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>

        {isMenuOpen && (
          <View style={s.menuSheet}>
            <Pressable style={s.menuItem} onPress={onEdit}>
              <MaterialCommunityIcons
                name="pencil-outline"
                size={16}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={s.menuItemText}>Edit</Text>
            </Pressable>

            <Pressable style={s.menuItem} onPress={onDelete}>
              <MaterialCommunityIcons
                name="delete-outline"
                size={16}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={s.menuItemText}>Delete</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
