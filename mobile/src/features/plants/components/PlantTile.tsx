import React from "react";
import { View, Pressable, Text, StyleSheet, Image } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { s } from "../styles/plants.styles";
import { Plant } from "../types/plants.types";
import PlantMenu from "./PlantMenu";

type Props = {
  plant: Plant;
  isMenuOpen: boolean;
  onPressBody: () => void;
  onPressMenu: () => void;
  onEdit: () => void;
  onReminders: () => void;
  onJournal: () => void;
  onDelete: () => void;
  onShowQr: () => void;
};

// Bottom tab bar colors (solid, slightly transparent)
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

export default function PlantTile({
  plant,
  isMenuOpen,
  onPressBody,
  onPressMenu,
  onEdit,
  onReminders,
  onJournal,
  onDelete,
  onShowQr,
}: Props) {
  const imgUri = plant.imageUrl || "https://picsum.photos/seed/plant/120/120";

  return (
    <View style={[s.cardWrap, isMenuOpen && s.cardWrapRaised]}>
      {/* Glass stack: reversed tab-bar gradient + fog + border */}
      <View style={s.cardGlass}>
        {/* Reversed tab bar gradient: light -> dark */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[
            TAB_GREEN_LIGHT, // left (lighter)
            TAB_GREEN_DARK,  // right (darker)
          ]}
          locations={[0, 1]}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: 28 },
          ]}
        />

        {/* Subtle fog highlight (same system-wide glass effect) */}
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

        {/* Subtle border */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 28,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            },
          ]}
        />
      </View>

      <View style={s.cardRow}>
        <Pressable
          style={{
            flex: 1,
            paddingRight: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
          onPress={onPressBody}
          android_ripple={{ color: "rgba(255,255,255,0.08)" }}
        >
          <Image
            source={{ uri: imgUri }}
            style={{ width: 60, height: 60, borderRadius: 15 }}
          />

          <View style={{ flex: 1 }}>
            <Text style={s.plantName} numberOfLines={1}>
              {plant.name}
            </Text>

            {!!plant.latin && (
              <Text style={s.latin} numberOfLines={1}>
                {plant.latin}
              </Text>
            )}

            {!!plant.location && (
              <Text style={s.location} numberOfLines={1}>
                {plant.location}
              </Text>
            )}
          </View>
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
      </View>

      {isMenuOpen && (
        <PlantMenu
          onEdit={onEdit}
          onReminders={onReminders}
          onJournal={onJournal}
          onDelete={onDelete}
          onShowQr={onShowQr}
        />
      )}
    </View>
  );
}
