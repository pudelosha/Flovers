import React, { useMemo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Slider from "@react-native-community/slider";
import { SegmentedButtons, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import LinearGradient from "react-native-linear-gradient";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";

// We only need keys; labels come from i18n
const ORIENTATION_KEYS = ["S", "E", "W", "N"] as const;

// EXACT SAME green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

type Props = {
  measureUnit?: "metric" | "imperial";
  onOpenMeasureModal: () => void;
};

export default function Step04_Exposure({
  measureUnit = "metric",
  onOpenMeasureModal,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { state, actions } = useCreatePlantWizard();
  const theme = useTheme();

  const tr = useCallback(
    (key: string, fallback?: string) => {
      void currentLanguage; // force rerender
      const txt = t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const toDisplay = (cm: number) =>
    measureUnit === "imperial" ? `${Math.round(cm / 2.54)} in` : `${cm} cm`;

  // Map slider index <-> LightLevel
  const lightOrder = useMemo(
    () => ["very-low", "low", "medium", "bright-indirect", "bright-direct"] as const,
    []
  );

  const lightIndex = Math.max(0, lightOrder.indexOf(state.lightLevel as any));

  const onLightChange = (v: number) => {
    const idx = Math.max(0, Math.min(4, Math.round(v)));
    actions.setLightLevel(lightOrder[idx] as any);
  };

  return (
    <View style={wiz.cardWrap}>
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

        {/* Keep your existing tint + border */}
        <View pointerEvents="none" style={wiz.cardTint} />
        <View pointerEvents="none" style={wiz.cardBorder} />
      </View>

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>{tr("createPlant.step04.title", "Exposure")}</Text>
        <Text style={wiz.subtitle}>
          {tr(
            "createPlant.step04.subtitle",
            "Tell us how much light this spot gets and the window direction."
          )}
        </Text>

        <Text style={wiz.sectionTitle}>
          {tr("createPlant.step04.lightLevel", "Light level")}
        </Text>

        <View style={{ marginTop: 2, marginBottom: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
              {tr("createPlant.step04.low", "Low")}
            </Text>
            <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
              {tr("createPlant.step04.high", "High")}
            </Text>
          </View>

          <Slider
            value={lightIndex}
            onValueChange={onLightChange}
            onSlidingComplete={onLightChange}
            minimumValue={0}
            maximumValue={4}
            step={1}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor="rgba(255,255,255,0.35)"
            thumbTintColor={theme.colors.primary}
          />
        </View>

        <Text style={wiz.sectionTitle}>
          {tr("createPlant.step04.windowDirection", "Window direction")}
        </Text>

        <View
          style={{
            borderRadius: 12,
            borderWidth: 0,
            backgroundColor: "rgba(255,255,255,0.12)",
            overflow: "hidden",
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 18,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          />
          <SegmentedButtons
            value={state.orientation}
            onValueChange={(v) => actions.setOrientation(v as any)}
            buttons={ORIENTATION_KEYS.map((key) => ({
              value: key,
              label: tr(`createPlant.step04.orientations.${key}`, key),
              style: {
                flex: 1,
                minWidth: 0,
                paddingHorizontal: 4,
                paddingVertical: 4,
                marginHorizontal: 0,
              },
              labelStyle: { fontSize: 11, fontWeight: "800", color: "#FFFFFF" },
            }))}
            density="small"
            style={{
              backgroundColor: "transparent",
              borderWidth: 0,
              marginHorizontal: -6,
              marginVertical: -6,
            }}
            theme={{
              colors: {
                secondaryContainer: "rgba(11,114,133,0.9)",
                onSecondaryContainer: "#FFFFFF",
                surface: "transparent",
                onSurface: "#FFFFFF",
                outline: "transparent",
              },
            }}
          />
        </View>

        <Pressable
          style={[wiz.actionFull, { marginTop: 10, marginBottom: 10 }]}
          onPress={onOpenMeasureModal}
          android_ripple={{ color: "rgba(255,255,255,0.12)" }}
        >
          <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#FFFFFF" />
          <Text style={wiz.actionText}>
            {tr("createPlant.step04.measureLightDirection", "Measure light & direction")}
          </Text>
        </Pressable>

        <Text style={wiz.sectionTitle}>
          {tr("createPlant.step04.distanceFromWindow", "Distance from window")}
        </Text>

        <View style={{ marginTop: 6, marginBottom: 4 }}>
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "800",
              alignSelf: "flex-end",
              marginBottom: 4,
            }}
          >
            {toDisplay(state.distanceCm)}
          </Text>

          <Slider
            value={state.distanceCm}
            onValueChange={(v) => actions.setDistanceCm(Math.round(v))}
            onSlidingComplete={(v) => actions.setDistanceCm(Math.round(v))}
            minimumValue={0}
            maximumValue={100}
            step={10}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor="rgba(255,255,255,0.35)"
            thumbTintColor={theme.colors.primary}
          />
        </View>
      </View>
    </View>
  );
}
