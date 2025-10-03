import React, { PropsWithChildren, useEffect, useRef } from "react";
import { Image, View, StyleSheet, Platform, Animated } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const drops = require("../../assets/drops.png");

type Props = PropsWithChildren<{
  showDrops?: boolean;
}>;

/** Glass card only (no leaves background) – with a smooth mount animation */
export default function AuthCard({ children, showDrops = false }: Props) {
  const insets = useSafeAreaInsets();

  // Animate the card itself when screen mounts
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Animated.View style={[s.cardShadow, { opacity, transform: [{ translateY }] }]}>
        <View style={s.card}>
          {/* Frosted blur under everything */}
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType={Platform.OS === "ios" ? "light" : "light"}
            blurAmount={20}
            overlayColor="transparent"
            reducedTransparencyFallbackColor="transparent"
          />

          {/* White tint for readability */}
          <View style={s.cardTint} />

          {/* Thin border like the reference */}
          <View pointerEvents="none" style={s.cardBorder} />

          {/* Optional water drops */}
          {showDrops && (
            <View pointerEvents="none" style={s.dropsWrap}>
              <Image source={drops} style={s.drops} resizeMode="cover" />
            </View>
          )}

          {/* Actual screen content */}
          <View style={s.content}>{children}</View>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
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
    borderColor: "rgba(255,255,255,0.2)",
    zIndex: 2,
  },
  dropsWrap: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  drops: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },

  content: { padding: 22, gap: 12, zIndex: 3 },
});
