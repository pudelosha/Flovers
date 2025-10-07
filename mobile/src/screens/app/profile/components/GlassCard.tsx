import React from "react";
import { View, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { card } from "../profile.styles";

export default function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={card.cardWrap}>
      <View style={card.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={10}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
        />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.12)" }]} />
      </View>
      <View style={card.cardInner}>{children}</View>
    </View>
  );
}
