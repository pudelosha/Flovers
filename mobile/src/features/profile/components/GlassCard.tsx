import React from "react";
import { View, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { card } from "../../profile/styles/profile.styles";

// Same green tones as PlantTile / AuthCard
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

export default function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={card.cardWrap}>
      {/* PlantTile-style gradient layers like AuthCard */}
      <View style={card.cardGlass}>
        {/* Base green gradient: light -> dark */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        {/* Fog highlight (same as Plants/AuthCard) */}
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

        {/* White tint for readability */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(255,255,255,0.14)", zIndex: 1 },
          ]}
        />
        {/* Thin border */}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 28,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.20)",
              zIndex: 2,
            },
          ]}
        />
      </View>

      <View style={[card.cardInner, { zIndex: 3 }]}>{children}</View>
    </View>
  );
}
