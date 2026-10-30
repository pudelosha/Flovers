import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";

// Lottie (optional)
let LottieView: any = null;
try {
  LottieView = require("lottie-react-native").default;
} catch {}
let ANIM: any = null;
try {
  ANIM = require("../../../../assets/lottie/lottie-creating-plant.json");
} catch {}

const PLANTS_ROUTE_NAME = "Plants"; // <-- Tab route name

// EXACT SAME green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

export default function Step09_Creating({ onReadyChange }: { onReadyChange?: (ready: boolean) => void } = {}) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const { state, actions } = useCreatePlantWizard();
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<"creating" | "success" | "error">("creating");
  const [attempt, setAttempt] = useState(0);
  const lottieRef = useRef<any>(null);

  const getTranslation = useCallback(
    (key: string, fallback?: string): string => {
      try {
        const _lang = currentLanguage; // force dependency
        void _lang;
        const txt = t(key);
        const isMissing = !txt || txt === key;
        return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
      } catch {
        return fallback || key.split(".").pop() || key;
      }
    },
    [t, currentLanguage]
  );

  useEffect(() => {
    let mounted = true;
    let navigationTimer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      setStatus("creating");
      try {
        await actions.createPlant();
        if (!mounted) return;
        setStatus("success");

        // Navigate to Plants tab after ~2.5s
        navigationTimer = setTimeout(() => {
          if (!mounted) return;
          actions.reset();
          navigation.navigate(PLANTS_ROUTE_NAME);
        }, 2500);
      } catch {
        if (mounted) setStatus("error");
      }
    };

    run();
    return () => {
      mounted = false;
      if (navigationTimer) clearTimeout(navigationTimer);
    };
  }, [actions, navigation, attempt]);

  useEffect(() => { onReadyChange?.(status !== "creating"); }, [onReadyChange, status]);

  if (status === "creating") return <CenteredSpinner size={56} color="#FFFFFF" />;

  // Fixed card height (tweak to taste)
  const CARD_HEIGHT = 360;

  return (
    <View style={wiz.cardWrap}>
      {/* Clipped rounded card that wraps glass + content */}
      <View style={{ position: "relative", borderRadius: 28, overflow: "hidden", height: CARD_HEIGHT }}>
        {/* glass frame — gradient instead of blur */}
        <View style={wiz.cardGlass} pointerEvents="none">
          {/* Base green gradient (AuthCard match) */}
          <LinearGradient
            pointerEvents="none"
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
            locations={[0, 1]}
            style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
          />

          {/* Fog highlight (AuthCard match) */}
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

          <View pointerEvents="none" style={wiz.cardTint} />
          <View pointerEvents="none" style={wiz.cardBorder} />
        </View>

        {/* content */}
        <View style={[wiz.cardInner, { alignItems: "center", justifyContent: "center", height: "100%" }]}>
          {/* Lottie centered */}
          <View style={{ width: 220, height: status === "error" ? 100 : 220, alignItems: "center", justifyContent: "center", marginTop: -10 }}>
            {status === "error" ? (
              <MaterialCommunityIcons name="alert-circle-outline" size={72} color="#FFFFFF" />
            ) : LottieView && ANIM ? (
              <LottieView
                ref={lottieRef}
                source={ANIM}
                autoPlay
                loop={false}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <MaterialCommunityIcons name="sprout" size={92} color="#FFFFFF" />
            )}
          </View>

          {/* Status text */}
          <Text style={[wiz.title, { marginTop: 8, textAlign: "center" }]}>
            {status === "success"
                ? getTranslation("createPlant.step09.success", "plant created successfully")
                : state.createdPlantId
                  ? getTranslation("createPlant.step09.photoFailed", "Your plant was created, but its photo could not be uploaded. Try again to upload it without creating another plant.")
                  : getTranslation("createPlant.step09.failed", "Could not create your plant. Please try again.")}
          </Text>

          {status === "error" && (
            <View style={{ width: "100%", flexDirection: "row", gap: 12, marginTop: 20 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (state.createdPlantId) {
                    actions.reset();
                    navigation.navigate(PLANTS_ROUTE_NAME);
                  } else {
                    actions.goTo("name");
                  }
                }}
                style={[wiz.nextBtnWide, { flex: 1, justifyContent: "center", backgroundColor: "#263238" }]}
              >
                <Text style={wiz.nextBtnText}>
                  {state.createdPlantId
                    ? getTranslation("createPlant.step09.openPlants", "Go to plants")
                    : getTranslation("createPlant.common.previous", "Back")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setStatus("creating");
                  setAttempt((value) => value + 1);
                }}
                style={[wiz.nextBtnWide, { flex: 1, justifyContent: "center", backgroundColor: "#0B7285" }]}
              >
                <Text style={wiz.nextBtnText}>
                  {getTranslation("createPlant.step09.retry", "Try again")}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
