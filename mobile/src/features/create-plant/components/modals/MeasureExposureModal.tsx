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

/** ---------- Light helpers ---------- */
function luxToLightLevel(lux: number | null): LightLevel | null {
  if (lux == null || Number.isNaN(lux)) return null;
  if (lux >= 10000) return "bright-direct";
  if (lux >= 3000) return "bright-indirect";
  if (lux >= 1000) return "medium";
  if (lux >= 200) return "low";
  return "very-low";
}
function lightLevelLabel(level: LightLevel | null): string {
  switch (level) {
    case "bright-direct": return "Bright direct";
    case "bright-indirect": return "Bright indirect";
    case "medium": return "Medium / dappled";
    case "low": return "Low light";
    case "very-low": return "Very low";
    default: return "—";
  }
}

/** ---------- Cardinal bucketing (exactly as requested) ----------
 * N: 315–360 or 0–45
 * E: 45–135
 * S: 135–225
 * W: 225–315
 */
function headingToOrientation45(deg: number | null): Orientation | null {
  if (deg == null) return null;
  if (deg >= 315 || deg < 45) return "N";
  if (deg >= 45 && deg < 135) return "E";
  if (deg >= 135 && deg < 225) return "S";
  return "W"; // 225–315
}

/** Circular EMA for heading (extra-smooth on top of native smoothing) */
function smoothHeading(prev: number | null, next: number | null, alpha = 0.2): number | null {
  if (next == null) return prev;
  if (prev == null) return Math.round(next);
  let delta = next - prev;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  let sm = prev + alpha * delta;
  if (sm < 0) sm += 360;
  if (sm >= 360) sm -= 360;
  return Math.round(sm);
}

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

  // Live sensors
  const [lux, setLux] = useState<number | null>(null);
  const [headingDeg, setHeadingDeg] = useState<number | null>(null);

  // Cleanups
  const lightCleanupRef = useRef<(() => void) | null>(null);
  const headingCleanupRef = useRef<(() => void) | null>(null);

  // 5s test
  const [isTestRunning, setIsTestRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  const [remainMs, setRemainMs] = useState(0);
  const testMaxLuxRef = useRef<number | null>(null);
  const testHeadingsRef = useRef<number[]>([]);
  const [finalLuxMax, setFinalLuxMax] = useState<number | null>(null);
  const [finalOrientation, setFinalOrientation] = useState<Orientation | null>(null);

  // Optional extra JS smoothing (native already smooths)
  const [headingSmooth, setHeadingSmooth] = useState<number | null>(null);
  useEffect(() => {
    setHeadingSmooth(prev => smoothHeading(prev, headingDeg, 0.25));
  }, [headingDeg]);

  /** Start sensors: native compass + ambient light */
  const startSensors = useCallback(async () => {
    // Light (unchanged)
    try {
      const sub = await Sensors.startLight?.((lx: number | null) => {
        setLux(typeof lx === "number" ? lx : null);
      });
      lightCleanupRef.current = () => {
        // @ts-ignore
        sub?.remove?.();
        // @ts-ignore
        sub?.unsubscribe?.();
      };
    } catch (e) {
      console.warn("[MeasureExposure] Light not available:", e);
      setLux(null);
      lightCleanupRef.current = null;
    }

    // Heading (tilt-invariant via native on Android), JS smoothing on top
    try {
      const sub = await Sensors.startHeading((deg: number) => {
        setHeadingDeg(prev => {
          if (prev == null) return Math.round(deg);
          let d = deg - prev;
          if (d > 180) d -= 360;
          if (d < -180) d += 360;
          let s = prev + 0.25 * d;
          if (s < 0) s += 360;
          if (s >= 360) s -= 360;
          return Math.round(s);
        });
      });
      headingCleanupRef.current = () => {
        try {
          // @ts-ignore
          sub?.remove?.();
          // @ts-ignore
          sub?.unsubscribe?.();
        } catch {}
      };
    } catch (e) {
      console.warn("[MeasureExposure] Heading subscribe failed:", e);
      headingCleanupRef.current = null;
    }
  }, []);

  const stopSensors = useCallback(() => {
    try { headingCleanupRef.current?.(); } catch {}
    try { lightCleanupRef.current?.(); } catch {}
    headingCleanupRef.current = null;
    lightCleanupRef.current = null;
  }, []);

  /** Appstate + visibility */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        if (visible) startSensors();
      } else if (next.match(/inactive|background/)) {
        stopSensors();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [startSensors, stopSensors, visible]);

  useEffect(() => {
    if (!visible) {
      stopSensors();
      setLux(null);
      setHeadingDeg(null);
      setHeadingSmooth(null);
      setIsTestRunning(false);
      setRemainMs(0);
      testMaxLuxRef.current = null;
      testHeadingsRef.current = [];
      return;
    }
    startSensors();
    return () => stopSensors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /** 5-second test */
  const endTest = useCallback(() => {
    setIsTestRunning(false);
    if (timerRef.current != null) { clearInterval(timerRef.current); timerRef.current = null; }
    setRemainMs(0);

    const maxLux = testMaxLuxRef.current;
    setFinalLuxMax(maxLux ?? null);

    const hs = testHeadingsRef.current;
    if (hs.length) {
      const meanRad = Math.atan2(
        hs.reduce((s, d) => s + Math.sin((d * Math.PI) / 180), 0),
        hs.reduce((s, d) => s + Math.cos((d * Math.PI) / 180), 0)
      );
      let meanDeg = Math.round((meanRad * 180) / Math.PI);
      if (meanDeg < 0) meanDeg += 360;
      setFinalOrientation(headingToOrientation45(meanDeg));
    } else {
      setFinalOrientation(null);
    }

    testMaxLuxRef.current = null;
    testHeadingsRef.current = [];
  }, []);

  const start5sTest = useCallback(() => {
    if (isTestRunning) return;
    setIsTestRunning(true);
    setFinalLuxMax(null);
    setFinalOrientation(null);
    testMaxLuxRef.current = null;
    testHeadingsRef.current = [];

    const D = 5000;
    const t0 = Date.now();
    setRemainMs(D);

    timerRef.current = setInterval(() => {
      const left = Math.max(0, D - (Date.now() - t0));
      setRemainMs(left);
      if (left <= 0) endTest();
    }, 100) as unknown as number;
  }, [endTest, isTestRunning]);

  // Feed buffers during test
  useEffect(() => {
    if (!isTestRunning) return;
    if (typeof lux === "number") {
      if (testMaxLuxRef.current == null || lux > testMaxLuxRef.current) {
        testMaxLuxRef.current = lux;
      }
    }
  }, [lux, isTestRunning]);

  useEffect(() => {
    if (!isTestRunning) return;
    const d = typeof headingSmooth === "number" ? headingSmooth : headingDeg;
    if (typeof d === "number" && !isNaN(d)) {
      testHeadingsRef.current.push(d);
    }
  }, [headingSmooth, headingDeg, isTestRunning]);

  /** Apply */
  const apply = () => {
    const chosenLux = finalLuxMax ?? lux;
    const chosenLight = luxToLightLevel(chosenLux ?? null);

    const liveBucket = headingToOrientation45(headingSmooth ?? headingDeg);
    const chosenOrientation = finalOrientation ?? liveBucket ?? null;

    onApply({ light: chosenLight, orientation: chosenOrientation });
    onClose();
  };

  /** Labels */
  const lightLabelLive = useMemo(() => {
    if (Platform.OS !== "android") return "Not available";
    if (lux == null) return "No sensor";
    return `${Math.round(lux)} lx`;
  }, [lux]);

  const lightLabelFinal = useMemo(() => {
    if (finalLuxMax == null) return "—";
    const lvl = luxToLightLevel(finalLuxMax);
    return `${Math.round(finalLuxMax)} lx • ${lightLevelLabel(lvl)}`;
  }, [finalLuxMax]);

  const orientationLabelLive = useMemo(() => {
    const d = headingSmooth ?? headingDeg;
    if (d == null) return "Not available";
    const o = headingToOrientation45(d) ?? "—";
    return `${o} (${Math.round(d)}°)`;
  }, [headingSmooth, headingDeg]);

  const orientationLabelFinal = useMemo(() => {
    if (!finalOrientation) return "—";
    return finalOrientation;
  }, [finalOrientation]);

  /** Render */
  if (!visible) return null;
  const countdownSec = Math.ceil(remainMs / 1000);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        {/* Backdrop - matches other modals */}
        <Pressable
          style={[s.backdrop, { paddingBottom: insets.bottom }]}
          onPress={onClose}
        >
          <View style={{ flex: 1 }} />
        </Pressable>

        {/* Blur/tint layer - matches other modals */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { bottom: insets.bottom }]}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" }]} />
        </View>

        {/* Content container - matches the structure from AddLocationModal */}
        <View style={[s.promptWrap, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
          <View style={s.promptGlass}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="light"
              blurAmount={14}
              reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
            />
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]}
            />
          </View>

          <ScrollView
            style={s.promptInnerFull}
            contentContainerStyle={[s.promptScroll, { paddingTop: insets.top + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={wiz.promptTitle}>Measure light & direction</Text>

            <Text style={{ color: "#FFFFFF", fontWeight: "600", marginBottom: 10 }}>
              Hold the phone <Text style={{ fontWeight: "800" }}>horizontally (screen up)</Text>, with the{" "}
              <Text style={{ fontWeight: "800" }}>top edge</Text> pointing toward the window. Move/scan slowly
              near the window to record the brightest spot and direction. Then tap{" "}
              <Text style={{ fontWeight: "800" }}>Measure</Text> to run a 5-second test.
            </Text>

            {/* Live readouts */}
            <View style={{ gap: 10 }}>
              <View style={rowStyle}>
                <View style={rowLeft}>
                  <MaterialCommunityIcons name="white-balance-sunny" size={18} color="#FFFFFF" />
                  <Text style={rowTitle}>Ambient light (live)</Text>
                </View>
                <Text style={rowVal}>{lightLabelLive}</Text>
              </View>

              <View style={rowStyle}>
                <View style={rowLeft}>
                  <MaterialCommunityIcons name="compass-outline" size={18} color="#FFFFFF" />
                  <Text style={rowTitle}>Heading (live)</Text>
                </View>
                <Text style={rowVal}>{orientationLabelLive}</Text>
              </View>

              {/* 5s measurement summary */}
              <View style={[rowStyle, { borderBottomWidth: 0 }]}>
                <View style={rowLeft}>
                  <MaterialCommunityIcons name="timer-sand" size={18} color="#FFFFFF" />
                  <Text style={rowTitle}>
                    5-second measurement {isTestRunning ? "(running…)" : "(last)"}
                  </Text>
                </View>
                <Text style={rowVal}>{isTestRunning ? `~${countdownSec}s` : "done"}</Text>
              </View>

              <View style={{ paddingVertical: 2 }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                  Light (best in 5s): {lightLabelFinal}
                </Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", marginTop: 4 }}>
                  Direction (mean in 5s): {finalOrientation ?? "—"}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <Pressable style={wiz.btn} onPress={onClose}>
                <Text style={wiz.btnText}>Close</Text>
              </Pressable>
              <Pressable
                style={[wiz.btn, { minWidth: 110 }, isTestRunning ? { opacity: 0.9 } : undefined]}
                onPress={isTestRunning ? undefined : start5sTest}
                disabled={isTestRunning}
              >
                <Text style={wiz.btnText}>{isTestRunning ? "Measuring…" : "Measure (5s)"}</Text>
              </Pressable>
              <Pressable
                style={[wiz.btn, wiz.btnPrimary]}
                onPress={apply}
                disabled={
                  !(
                    finalLuxMax != null ||
                    finalOrientation ||
                    headingToOrientation45(headingSmooth ?? headingDeg) ||
                    (Platform.OS === "android" && lux != null)
                  )
                }
              >
                <Text style={wiz.btnText}>Apply</Text>
              </Pressable>
            </View>

            <Text style={{ color: "rgba(255,255,255,0.82)", marginTop: 10 }}>
              Tip: On many phones the ambient light sensor sits near the earpiece at the top. Keep the phone flat,
              point the top edge toward the window, and slowly move it to find the brightest reading. The test picks
              the highest lux over 5 seconds and averages the compass to decide between N/E/S/W (±45° buckets).
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Row styles */
const rowStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderColor: "rgba(255,255,255,0.18)",
};
const rowLeft = { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 };
const rowTitle = { color: "#FFFFFF", fontWeight: "800" as const };
const rowVal = { color: "#FFFFFF", fontWeight: "800" as const };

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  promptWrap: {
    ...StyleSheet.absoluteFillObject,
    left: 0,
    right: 0,
    top: 0,
  },
  promptGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    overflow: "hidden",
  },
  promptInnerFull: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  promptScroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});