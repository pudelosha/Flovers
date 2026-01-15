import React, { PropsWithChildren, useEffect, useRef } from "react";
import { Image, View, StyleSheet, Platform, Animated } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PanGestureHandler, State as GHState } from "react-native-gesture-handler";

// NEW: language FAB shown on all auth screens
import LanguageFAB from "../../../shared/ui/LanguageFAB";
import { useLanguage } from "../../../app/providers/LanguageProvider";

const drops = require("../../../../assets/drops.png");

type Props = PropsWithChildren<{ showDrops?: boolean }>;

const MAX_DRIFT = 20;   // max px drift
const ACTIVATE = 6;     // drag threshold before panning starts

export default function AuthCard({ children, showDrops = false }: Props) {
  const insets = useSafeAreaInsets();

  // NEW: language state (available on all auth screens)
  const { currentLanguage, changeLanguage } = useLanguage();

  // mount-in effect
  const opacity = useRef(new Animated.Value(0)).current;
  const enterY  = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(enterY,  { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity, enterY]);

  // pan values (JS driver to avoid RNGH nesting error)
  const panX = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // clamp transforms so card only moves a little
  const clampX = panX.interpolate({
    inputRange: [-MAX_DRIFT, MAX_DRIFT],
    outputRange: [-MAX_DRIFT, MAX_DRIFT],
    extrapolate: "clamp",
  });
  const clampY = panY.interpolate({
    inputRange: [-MAX_DRIFT, MAX_DRIFT],
    outputRange: [-MAX_DRIFT, MAX_DRIFT],
    extrapolate: "clamp",
  });

  const onPan = Animated.event(
    [{ nativeEvent: { translationX: panX, translationY: panY } }],
    { useNativeDriver: false } // use JS driver; reliable with nested touchables
  );

  const springBack = () => {
    Animated.spring(panX, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
    Animated.spring(panY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
  };

  const onPanStateChange = ({ nativeEvent }: any) => {
    if (
      nativeEvent.state === GHState.END ||
      nativeEvent.state === GHState.CANCELLED ||
      nativeEvent.state === GHState.FAILED
    ) {
      springBack();
    }
  };

  return (
    <View
      style={[
        s.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {/* NEW: fixed FAB (outside the pan handler so it doesn't drift with the card) */}
      <LanguageFAB
        currentLanguage={currentLanguage}
        changeLanguage={changeLanguage}
        position="right"
        // Let LanguageFAB defaults match FAB.tsx:
        // rightOffset=16, bottomOffset=92 (safe for Android navbar/gesture)
        options={[
          { code: "en", label: "English", flag: "🇬🇧" },
          { code: "pl", label: "Polski", flag: "🇵🇱" },
        ]}
      />

      {/* Pan handler wraps the card; pan activates only after small drag */}
      <PanGestureHandler
        onGestureEvent={onPan}
        onHandlerStateChange={onPanStateChange}
        activeOffsetX={[-ACTIVATE, ACTIVATE]}
        activeOffsetY={[-ACTIVATE, ACTIVATE]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Animated.View
          style={[
            s.cardShadow,
            {
              opacity,
              transform: [
                { translateX: clampX },
                { translateY: Animated.add(enterY, clampY) },
              ],
            },
          ]}
        >
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
      </PanGestureHandler>
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
