import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { card } from "../../profile/styles/profile.styles";

export default function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={card.cardWrap}>
      {/* Frosted glass layers like AuthCard */}
      <View style={card.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={Platform.OS === "ios" ? "light" : "light"}
          blurAmount={20}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
        />
        {/* White tint for readability */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.20)", zIndex: 1 }]} />
        {/* Thin border */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.20)", zIndex: 2 }]} />
      </View>

      <View style={[card.cardInner, { zIndex: 3 }]}>{children}</View>
    </View>
  );
}
