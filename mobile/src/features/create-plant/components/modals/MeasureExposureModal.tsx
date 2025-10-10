import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Pressable,
  Text,
  AppState,
  AppStateStatus,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { wiz } from "../../styles/wizard.styles";
import type { LightLevel, Orientation } from "../../types/create-plant.types";
import { Sensors } from "../../services/Sensors";

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
  const [lux, setLux] = useState<number | null>(null);
  const [isMeasuring, setIsMeasuring] = useState(false);

  // Internals for cleanup/fallback
  const compassCleanupRef = useRef<(() => void) | null>(null);
  const magFallbackCleanupRef = useRef<(() => void) | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gotCompassValueRef = useRef(false);

  const heading = useMemo(() => toHeadingDeg(magReading), [magReading]);
  const orientation = useMemo(() => headingToOrientation(heading), [heading]);
  const derivedLight = useMemo(() => luxToLightLevel(lux), [lux]);

  const startCompassPrimary = useCallback(() => {
    try {
      const sub = Sensors.startCompass?.((r: MagnetometerReading) => {
        gotCompassValueRef.current = true;
        setMagReading(r);
      });

      compassCleanupRef.current = () => {
        try {
          // @ts-ignore different facades may expose unsubscribe or remove
          sub?.unsubscribe?.();
        } catch {}
      };

      if (sub) {
        console.log("[MeasureExposure] Compass (Sensors facade) started");
      } else {
        console.warn("[MeasureExposure] Sensors.startCompass returned no subscription");
      }
    } catch (e) {
      console.warn("[MeasureExposure] Sensors.startCompass threw:", e);
      compassCleanupRef.current = null;
    }
  }, []);

  const startCompassFallback = useCallback(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { magnetometer, SensorTypes, setUpdateIntervalForType } = require("react-native-sensors");
      // 4 Hz (~250ms) is fine for heading
      setUpdateIntervalForType?.(SensorTypes.magnetometer, 250);

      const sub = magnetometer.subscribe((r: { x: number; y: number; z: number }) => {
        setMagReading({ x: r.x, y: r.y, z: r.z });
      });

      magFallbackCleanupRef.current = () => {
        try {
          sub?.unsubscribe?.();
        } catch {}
      };

      console.log("[MeasureExposure] magnetometer fallback started");
    } catch (e) {
      console.warn("[MeasureExposure] magnetometer fallback failed:", e);
      magFallbackCleanupRef.current = null;
    }
  }, []);

  const startLight = useCallback(async () => {
    try {
      const sub = await Sensors.startLight?.((lx: number | null) => {
        setLux(typeof lx === "number" ? lx : null);
      });
      return () => {
        try {
          // @ts-ignore
          sub?.remove?.();
          // @ts-ignore
          sub?.unsubscribe?.();
        } catch {}
      };
    } catch (e) {
      console.warn("[MeasureExposure] Light not available:", e);
      setLux(null);
      return null;
    }
  }, []);

  const clearFallbackTimer = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  const start = useCallback(async () => {
    if (isMeasuring) return;
    setIsMeasuring(true);
    gotCompassValueRef.current = false;

    // Start primary compass
    startCompassPrimary();

    // If no compass values arrive in 1.5s, start fallback
    clearFallbackTimer();
    fallbackTimerRef.current = setTimeout(() => {
      if (!gotCompassValueRef.current) {
        console.warn("[MeasureExposure] No compass values yet, starting magnetometer fallback");
        startCompassFallback();
      }
    }, 1500);

    // Start ambient light (Android)
    const lightCleanup = await startLight();

    // Stash a combined cleanup
    // @ts-ignore
    start._cleanup = () => {
      clearFallbackTimer();
      try {
        compassCleanupRef.current?.();
        compassCleanupRef.current = null;
      } catch {}

      try {
        magFallbackCleanupRef.current?.();
        magFallbackCleanupRef.current = null;
      } catch {}

      try {
        lightCleanup?.();
      } catch {}
    };
  }, [isMeasuring, startCompassPrimary, startCompassFallback, startLight]);

  const stop = useCallback(() => {
    setIsMeasuring(false);
    clearFallbackTimer();
    try {
      // @ts-ignore
      start._cleanup?.();
    } catch {}
    // keep last readings visible until modal closes
  }, [start]);

  // Handle foreground/background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        if (visible && isMeasuring) start();
      } else if (nextState.match(/inactive|background/)) {
        stop();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [isMeasuring, start, stop, visible]);

  // Start/stop on open/close
  useEffect(() => {
    if (!visible) {
      stop();
      setMagReading(null);
      setLux(null);
      return;
    }
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const apply = () => {
    onApply({ light: derivedLight, orientation });
    onClose();
  };

  const lightLabel = useMemo(() => {
    if (Platform.OS !== "android") return "Not available";
    if (lux == null) return "No sensor";
    return `${Math.round(lux)} lx`;
  }, [lux]);

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
        {/* Backdrop that stops at the tab bar (same darkness as Profile) */}
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
              Hold the phone flat (screen up) and slowly rotate. Do a gentle figure-8 to calibrate the compass.
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

            {/* Actions */}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <Pressable style={wiz.btn} onPress={onClose}>
                <Text style={wiz.btnText}>Close</Text>
              </Pressable>
              <Pressable
                style={[wiz.btn, isMeasuring ? { opacity: 0.9 } : undefined]}
                onPress={isMeasuring ? stop : start}
              >
                <Text style={wiz.btnText}>{isMeasuring ? "Stop" : "Start"}</Text>
              </Pressable>
              <Pressable
                style={[wiz.btn, wiz.btnPrimary]}
                onPress={apply}
                disabled={!orientation && lux == null}
              >
                <Text style={wiz.btnText}>Apply</Text>
              </Pressable>
            </View>

            <Text style={{ color: "rgba(255,255,255,0.82)", marginTop: 10 }}>
              Note: iOS does not expose a public ambient light sensor to apps. Android devices vary by hardware.
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
    backgroundColor: "rgba(0,0,0,0.6)", // darker, same as Profile
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
});
