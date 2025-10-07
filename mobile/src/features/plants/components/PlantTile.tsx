import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/plants.styles";
import { Plant } from "../types/plants.types";
import PlantMenu from "./PlantMenu";
import { TILE_BLUR } from "../constants/plants.constants";

type Props = {
  plant: Plant;
  isMenuOpen: boolean;
  onPressBody: () => void;
  onPressMenu: () => void;
  onEdit: () => void;
  onReminders: () => void;
  onDelete: () => void;
};

export default function PlantTile({
  plant,
  isMenuOpen,
  onPressBody,
  onPressMenu,
  onEdit,
  onReminders,
  onDelete,
}: Props) {
  return (
    <View style={s.cardWrap}>
      {/* Glass (blur only + subtle white tint) */}
      <View style={s.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={TILE_BLUR}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
        />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.12)" }]}
          pointerEvents="none"
        />
      </View>

      <View style={s.cardRow}>
        {/* Body tap → PlantDetails */}
        <Pressable
          style={{ flex: 1, paddingRight: 8 }}
          onPress={onPressBody}
          android_ripple={{ color: "rgba(255,255,255,0.08)" }}
        >
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
        </Pressable>

        <Pressable
          onPress={onPressMenu}
          style={s.menuBtn}
          android_ripple={{ color: "rgba(255,255,255,0.16)", borderless: true }}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {isMenuOpen && (
        <PlantMenu onEdit={onEdit} onReminders={onReminders} onDelete={onDelete} />
      )}
    </View>
  );
}
