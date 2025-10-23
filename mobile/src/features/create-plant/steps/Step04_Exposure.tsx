// steps/Step04_Exposure.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Slider from "@react-native-community/slider";
import { SegmentedButtons, useTheme } from "react-native-paper";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import { ORIENTATIONS } from "../constants/create-plant.constants";
import MeasureExposureModal from "../components/modals/MeasureExposureModal";

export default function Step04_Exposure({
  measureUnit = "metric" as "metric" | "imperial",
}) {
  const { state, actions } = useCreatePlantWizard();
  const theme = useTheme();
  const [measureOpen, setMeasureOpen] = useState(false);

  const toDisplay = (cm: number) =>
    measureUnit === "imperial" ? `${Math.round(cm / 2.54)} in` : `${cm} cm`;

  // Map slider index <-> LightLevel
  const lightOrder: Array<"very-low" | "low" | "medium" | "bright-indirect" | "bright-direct"> = useMemo(
    () => ["very-low", "low", "medium", "bright-indirect", "bright-direct"],
    []
  );
  const lightIndex = Math.max(0, lightOrder.indexOf(state.lightLevel as any));
  const onLightChange = (v: number) => {
    const idx = Math.max(0, Math.min(4, Math.round(v)));
    actions.setLightLevel(lightOrder[idx] as any);
  };

  return (
    <View style={wiz.cardWrap}>
      {/* glass frame — match Steps 1 & 3: Blur + white tint + thin border */}
      <View style={wiz.cardGlass}>
        <BlurView
          style={{ position: "absolute", inset: 0 } as any}
          blurType="light"
          blurAmount={20}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
        />
        <View pointerEvents="none" style={wiz.cardTint} />
        <View pointerEvents="none" style={wiz.cardBorder} />
      </View>

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>Exposure</Text>
        <Text style={wiz.subtitle}>
          Light exposure helps us tune watering schedules and care reminders. Tell us how much light
          this spot gets and the window direction.
        </Text>

        {/* Light level — slider with Low / High labels aligned with header */}
        <Text style={wiz.sectionTitle}>Light level</Text>
        <View style={{ marginTop: 2, marginBottom: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Low</Text>
            <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>High</Text>
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

        {/* Window direction — same height, keep selected fill; just remove the border */}
        <Text style={wiz.sectionTitle}>Window direction</Text>
        <View
          style={{
            borderRadius: 12,
            borderWidth: 0, // borderless container
            backgroundColor: "rgba(255,255,255,0.12)",
            overflow: "hidden",
          }}
        >
          {/* subtle glare */}
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
            buttons={ORIENTATIONS.map(({ key, label }) => ({
              value: key,
              label,
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
            style={{ backgroundColor: "transparent", borderWidth: 0, marginHorizontal: -6, marginVertical: -6 }}
            labelStyle={{ fontSize: 11, fontWeight: "800", color: "#FFFFFF" }}
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

        {/* Measure */}
        <Pressable
          style={[wiz.actionFull, { marginTop: 10, marginBottom: 10 }]}
          onPress={() => setMeasureOpen(true)}
          android_ripple={{ color: "rgba(255,255,255,0.12)" }}
        >
          <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#FFFFFF" />
          <Text style={wiz.actionText}>Measure light & direction</Text>
        </Pressable>

        {/* Distance — Slider only; show only selected value */}
        <Text style={wiz.sectionTitle}>Distance from window</Text>
        <View style={{ marginTop: 6, marginBottom: 4 }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "800", alignSelf: "flex-end", marginBottom: 4 }}>
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

        {/* Prev / Next — identical to Steps 1–3 (flat, same height) */}
        <View style={[wiz.buttonRowDual, { alignSelf: "stretch" }]}>
          <Pressable
            onPress={() => actions.goPrev()}
            style={({ pressed }) => [
              wiz.nextBtnWide,
              {
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.12)",
                paddingHorizontal: 14,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialCommunityIcons name="chevron-left" size={18} color="#FFFFFF" />
              <Text style={wiz.nextBtnText}>Previous</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => actions.goNext()}
            style={({ pressed }) => [
              wiz.nextBtnWide,
              {
                flex: 1,
                backgroundColor: "rgba(11,114,133,0.9)",
                paddingHorizontal: 14,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, width: "100%" }}>
              <Text style={wiz.nextBtnText}>Next</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Modal */}
      <MeasureExposureModal
        visible={measureOpen}
        onClose={() => setMeasureOpen(false)}
        onApply={({ light, orientation }) => {
          if (light) actions.setLightLevel(light);
          if (orientation) actions.setOrientation(orientation);
        }}
      />
    </View>
  );
}
