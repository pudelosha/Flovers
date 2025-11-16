// src/features/locations/components/LocationTile.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { locStyles as s } from "../styles/locations.styles";
import type { PlantLocation } from "../types/locations.types";

type Props = {
  location: PlantLocation;
  onPress?: (loc: PlantLocation) => void;
};

export default function LocationTile({ location, onPress }: Props) {
  return (
    <View style={s.tileWrap}>
      <View style={s.tileGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={18}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="rgba(255,255,255,0.2)"
        />

        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.25)" },
          ]}
        />

        <Pressable
          style={s.tileInner}
          android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          onPress={() => onPress?.(location)}
        >
          <View style={s.tileLeft}>
            <View style={s.iconCircle}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={20}
                color="#FFFFFF"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={s.locationName} numberOfLines={1}>
                {location.name}
              </Text>
              <Text style={s.plantCount}>
                {location.plantCount === 1
                  ? "1 plant"
                  : `${location.plantCount} plants`}
              </Text>
            </View>
          </View>

          <View style={s.countBadge}>
            <Text style={s.countText}>{location.plantCount}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
