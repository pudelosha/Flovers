import React, { PropsWithChildren } from "react";
import { ImageBackground, Image, View, StyleSheet, Platform } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const bg = require("../../../../assets/bg-leaves.jpg");
const drops = require("../../../../assets/drops.png");

type Props = PropsWithChildren<{ showDrops?: boolean }>;

export default function AuthBackground({ children, showDrops = false }: Props) {
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
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType={Platform.OS === "ios" ? "light" : "light"}
              blurAmount={20}
              overlayColor="transparent"
              reducedTransparencyFallbackColor="transparent"
            />
            <View style={s.cardTint} />
            <View pointerEvents="none" style={s.cardBorder} />
            {showDrops && (
              <View pointerEvents="none" style={s.dropsWrap}>
                <Image source={drops} style={s.drops} resizeMode="cover" />
              </View>
            )}
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
  card: { borderRadius: 28, minHeight: 420, overflow: "hidden" },
  cardTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.20)", zIndex: 1 },
  cardBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", zIndex: 2 },
  dropsWrap: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  drops: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  content: { padding: 22, gap: 12, zIndex: 3 },
});
