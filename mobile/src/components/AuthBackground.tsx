import React, { PropsWithChildren } from "react";
import { ImageBackground, Image, View, StyleSheet, Platform } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const bg = require("../../assets/bg-leaves.jpg");
const drops = require("../../assets/drops.png");

export default function AuthBackground({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground source={bg} style={s.bg} resizeMode="cover">
      <View
        style={[
          s.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={s.cardShadow}>
          <View style={s.card}>
            {/* Frosted blur under everything */}
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType={Platform.OS === "ios" ? "light" : "light"}
              blurAmount={30}
              overlayColor="transparent"
              reducedTransparencyFallbackColor="transparent"
            />

            {/* White tint for readability */}
            <View style={s.cardTint} />

            {/* Thin border like the reference */}
            <View pointerEvents="none" style={s.cardBorder} />

            {/* Water drops on the glass */}
            <View pointerEvents="none" style={s.dropsWrap}>
              <Image source={drops} style={s.drops} resizeMode="cover" />
            </View>

            {/* Actual screen content */}
            <View style={s.content}>{children}</View>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },

  cardShadow: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  card: {
    borderRadius: 28,
    minHeight: 420,
    overflow: "hidden",
  },

  // layers
  cardTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.20)",
    zIndex: 1,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    zIndex: 2,
  },
  dropsWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  drops: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  content: {
    padding: 22,
    gap: 12,
    zIndex: 3,
  },
});
