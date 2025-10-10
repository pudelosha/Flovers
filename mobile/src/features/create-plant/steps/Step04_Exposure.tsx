import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Slider from "@react-native-community/slider";
import { SegmentedButtons, useTheme } from "react-native-paper";

import { wiz } from "../styles/wizard.styles";
import { useCreatePlantWizard } from "../hooks/useCreatePlantWizard";
import { LIGHT_LEVELS, ORIENTATIONS } from "../constants/create-plant.constants";

function SegmentedFrame({ children }: { children: React.ReactNode }) {
  // Single light frame with subtle glare (no double borders)
  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.25)",
        backgroundColor: "rgba(255,255,255,0.12)",
        overflow: "hidden",
      }}
    >
      {/* Glare strip */}
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
      {children}
    </View>
  );
}

export default function Step04_Exposure({
  measureUnit = "metric" as "metric" | "imperial",
}) {
  const { state, actions } = useCreatePlantWizard();
  const theme = useTheme();
  const [measureOpen, setMeasureOpen] = useState(false);

  const toDisplay = (cm: number) =>
    measureUnit === "imperial" ? `${Math.round(cm / 2.54)} in` : `${cm} cm`;

  // Map slider index <-> LightLevel
  const lightOrder: Array<
    "very-low" | "low" | "medium" | "bright-indirect" | "bright-direct"
  > = useMemo(
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
      {/* glass with blur (same as Step 3) */}
      <View style={wiz.cardGlass}>
        <BlurView
          style={{ position: "absolute", inset: 0 } as any}
          blurType="light"
          blurAmount={10}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
        />
        <View
          pointerEvents="none"
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.12)" } as any}
        />
      </View>

      <View style={wiz.cardInner}>
        <Text style={wiz.title}>Exposure</Text>
        <Text style={wiz.subtitle}>
          Light exposure helps us tune watering schedules and care reminders. Tell us how much light
          this spot gets and the window direction.
        </Text>

        {/* Light level — slider with Low / High labels (no side padding so it aligns with header) */}
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

        {/* Window direction — smaller font, edge-to-frame fill */}
        <Text style={wiz.sectionTitle}>Window direction</Text>
        <SegmentedFrame>
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
            // Pull segments slightly into the frame so selected fill touches rounded edges
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
        </SegmentedFrame>

        {/* Measure */}
        <Pressable
          style={[wiz.actionFull, { marginTop: 10, marginBottom: 10 }]}
          onPress={() => setMeasureOpen(true)}
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

        {/* Prev / Next — same as Step 3 */}
        <View style={[wiz.buttonRowDual, { alignSelf: "stretch" }]}>
          <Pressable
            style={[
              wiz.btn,
              { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 8 },
            ]}
            onPress={() => actions.goPrev()}
          >
            <MaterialCommunityIcons name="chevron-left" size={18} color="#FFFFFF" />
            <Text style={wiz.btnText}>Previous</Text>
          </Pressable>

          <Pressable
            style={[wiz.btn, wiz.btnPrimary, { flex: 1, paddingHorizontal: 14 }]}
            onPress={() => actions.goNext()}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
              <Text style={wiz.btnText}>Next</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Simple placeholder modal; sensors to be wired later */}
      <Modal visible={measureOpen} transparent animationType="fade" onRequestClose={() => setMeasureOpen(false)}>
        <Pressable style={wiz.backdrop} onPress={() => setMeasureOpen(false)} />
        <View style={wiz.promptWrap}>
          <View style={wiz.promptGlass} />
          <View
            style={[wiz.promptInnerFull, { maxWidth: 520, alignSelf: "center", borderRadius: 18, overflow: "hidden" }]}
          >
            <View style={{ padding: 16 }}>
              <Text style={wiz.promptTitle}>Measure light & direction</Text>
              <Text style={{ color: "#FFFFFF", fontWeight: "600", marginBottom: 10 }}>
                This will use your phone’s light sensor and compass to estimate light level and NSWE
                direction. (Coming soon)
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
                <Pressable style={wiz.btn} onPress={() => setMeasureOpen(false)}>
                  <Text style={wiz.btnText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
