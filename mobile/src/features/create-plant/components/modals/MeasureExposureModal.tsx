import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Pressable,
  Text,
  Platform,
  AppState,
  AppStateStatus,
  ScrollView,
  StyleSheet,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { wiz } from "../../styles/wizard.styles";
import type { LightLevel, Orientation } from "../../types/create-plant.types";

/**
 * Magnetometer via `react-native-sensors` (compass/heading).
 * Ambient light is NOT used at this stage (no external light sensor package).
 * The UI gracefully shows "Not available" for light level; you can still apply
 * orientation from the compass, and set light level on the step screen’s slider.
 */

// Types for magnetometer readings
type MagnetometerReading = { x: number; y: number; z: number };

function toHeadingDeg(reading: MagnetometerReading | null): number | null {
  if (!reading) return null;
  const { x, y } = reading;
  const angleRad = Math.atan2(y, x); // -PI..PI
  let deg = (angleRad * 180) / Math.PI; // -180..180
  if (deg < 0) deg += 360; // 0..360
  return Math.round(deg);
}

function headingToOrientation(deg: number | null): Orientation | null {
  if (deg == null) return null;
  if ((deg >= 315 && deg <= 360) || deg < 45) return "N";
  if (deg >= 45 && deg < 135) return "E";
  if (deg >= 135 && deg < 225) return "S";
  return "W";
}

// Keep helper for future light integration; currently always returns null
function luxToLightLevel(lux: number | null): LightLevel | null {
  if (lux == null || Number.isNaN(lux)) return null;
  if (lux >= 10000) return "bright-direct";
  if (lux >= 3000) return "bright-indirect";
  if (lux >= 1000) return "medium";
  if (lux >= 200) return "low";
  return "very-low";
}

const TAB_HEIGHT = 16; // matches your AppTabs space reservation

export default function MeasureExposureModal({
  visible,
  onClose,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (vals: { light?: LightLevel | null; orientation?: Orientation | null }) => void;
}) {
  const insets = useSafeAreaInsets();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const [magReading, setMagReading] = useState<MagnetometerReading | null>(null);
  const [lux, setLux] = useState<number | null>(null); // stays null for now
  const [isMeasuring, setIsMeasuring] = useState(false);

  const heading = useMemo(() => toHeadingDeg(magReading), [magReading]);
  const orientation = useMemo(() => headingToOrientation(heading), [heading]);
  const derivedLight = useMemo(() => luxToLightLevel(lux), [lux]); // will be null

  const startSensors = useCallback(async () => {
    setIsMeasuring(true);
    // --- Magnetometer (react-native-sensors) ---
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Magnetometer, SensorTypes, setUpdateIntervalForType } = require("react-native-sensors");
      setUpdateIntervalForType(SensorTypes.magnetometer, 250);
      const sub = Magnetometer.subscribe((r: MagnetometerReading) => setMagReading(r));
      // @ts-ignore store for cleanup
      (startSensors as any)._magSub = sub;
    } catch {
      setMagReading(null);
    }
    // No ambient light subscription here (package removed)
    setLux(null);
  }, []);

  const stopSensors = useCallback(() => {
    setIsMeasuring(false);
    try {
      // @ts-ignore
      (startSensors as any)._magSub?.unsubscribe?.();
    } catch {}
  }, [startSensors]);

  // Stop sensors when app goes background; resume on foreground if still visible
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        if (visible && isMeasuring) startSensors();
      } else if (nextState.match(/inactive|background/)) {
        stopSensors();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [isMeasuring, startSensors, stopSensors, visible]);

  useEffect(() => {
    if (!visible) {
      stopSensors();
      setMagReading(null);
      setLux(null);
      return;
    }
    // Auto-start measuring on open
    startSensors();
    return () => stopSensors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const apply = () => {
    onApply({ light: derivedLight, orientation });
    onClose();
  };

  const lightLabel = useMemo(() => {
    // Always "Not available" for now (no ambient light integration)
    return Platform.OS === "ios" ? "Not available on iOS" : "Not available";
  }, []);

  const orientationLabel = useMemo(() => {
    if (heading == null) return "Not available";
    const o = orientation ?? "—";
    return `${o} (${heading}°)`;
  }, [heading, orientation]);

  if (!visible) return null;

  const bottomInset = TAB_HEIGHT + insets.bottom;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        {/* Backdrop that stops at the tab bar (same darkness and layout as AddLocationModal) */}
        <Pressable
          style={[styles.backdrop, { paddingBottom: bottomInset }]}
          onPress={onClose}
        >
          <View style={{ flex: 1 }} />
        </Pressable>

        {/* Blur/tint layer in the same bounds as backdrop */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { bottom: bottomInset }]}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.6)" }, // darker, matches Profile modals
            ]}
          />
        </View>

        {/* Content above tab bar; full width */}
        <View style={[styles.contentWrap, { paddingBottom: bottomInset }]} pointerEvents="box-none">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.contentInner, { paddingTop: insets.top + 16 }]}
          >
            <Text style={wiz.promptTitle}>Measure light & direction</Text>
            <Text style={{ color: "#FFFFFF", fontWeight: "600", marginBottom: 10 }}>
              We’ll use your phone’s compass to estimate window direction. Ambient light
              is not available on this build; set light level with the slider on the previous screen.
            </Text>

            {/* Readouts */}
            <View style={{ gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialCommunityIcons name="white-balance-sunny" size={18} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Ambient light</Text>
                </View>
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>{lightLabel}</Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialCommunityIcons name="compass-outline" size={18} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Heading</Text>
                </View>
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>{orientationLabel}</Text>
              </View>
            </View>

            {/* Actions – right-aligned, same button visuals as your other modal */}
            <View style={styles.actionsRow}>
              <Pressable style={wiz.btn} onPress={onClose}>
                <Text style={wiz.btnText}>Close</Text>
              </Pressable>
              <Pressable
                style={[wiz.btn, isMeasuring ? { opacity: 0.9 } : undefined]}
                onPress={isMeasuring ? stopSensors : startSensors}
              >
                <Text style={wiz.btnText}>{isMeasuring ? "Stop" : "Start"}</Text>
              </Pressable>
              <Pressable
                style={[wiz.btn, wiz.btnPrimary]}
                onPress={apply}
                disabled={!orientation} // light not required here
              >
                <Text style={wiz.btnText}>Apply</Text>
              </Pressable>
            </View>

            {/* Small note */}
            <Text style={{ color: "rgba(255,255,255,0.82)", marginTop: 10 }}>
              Note: Many devices don’t expose an ambient light sensor to apps. The compass works on most phones.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)", // darker, same as Profile/AddLocationModal
  },
  contentWrap: {
    ...StyleSheet.absoluteFillObject,
    left: 0,
    right: 0,
    top: 0,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    justifyContent: "flex-end",
  },
});
