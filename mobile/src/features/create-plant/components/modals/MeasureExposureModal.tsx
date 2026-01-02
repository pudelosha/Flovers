// C:\Projekty\Python\Flovers\mobile\src\features\create-plant\components\modals\MeasureExposureModal.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

import { wiz } from "../../styles/wizard.styles";
import type { LightLevel, Orientation } from "../../types/create-plant.types";
import { Sensors } from "../../services/Sensors";
import { s as remindersStyles } from "../../../reminders/styles/reminders.styles";

/** ---------- Light helpers ---------- */
function luxToLightLevel(lux: number | null): LightLevel | null {
  if (lux == null || Number.isNaN(lux)) return null;
  if (lux >= 10000) return "bright-direct";
  if (lux >= 3000) return "bright-indirect";
  if (lux >= 1000) return "medium";
  if (lux >= 200) return "low";
  return "very-low";
}

/** ---------- Cardinal bucketing ---------- */
function headingToOrientation45(deg: number | null): Orientation | null {
  if (deg == null) return null;
  if (deg >= 315 || deg < 45) return "N";
  if (deg >= 45 && deg < 135) return "E";
  if (deg >= 135 && deg < 225) return "S";
  return "W";
}

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
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const tr = useCallback(
    (key: string, fallback?: string) => {
      void currentLanguage;
      const txt = t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

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

  // Optional extra smoothing
  const [headingSmooth, setHeadingSmooth] = useState<number | null>(null);
  useEffect(() => {
    setHeadingSmooth((prev) => smoothHeading(prev, headingDeg, 0.25));
  }, [headingDeg]);

  const lightLevelLabel = useCallback(
    (level: LightLevel | null): string => {
      switch (level) {
        case "bright-direct":
          return tr("createPlant.step04.modal.levels.brightDirect", "Bright direct");
        case "bright-indirect":
          return tr("createPlant.step04.modal.levels.brightIndirect", "Bright indirect");
        case "medium":
          return tr("createPlant.step04.modal.levels.medium", "Medium / dappled");
        case "low":
          return tr("createPlant.step04.modal.levels.low", "Low light");
        case "very-low":
          return tr("createPlant.step04.modal.levels.veryLow", "Very low");
        default:
          return tr("createPlant.step04.modal.dash", "—");
      }
    },
    [tr]
  );

  const startSensors = useCallback(async () => {
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

    try {
      const sub = await Sensors.startHeading((deg: number) => {
        setHeadingDeg((prev) => {
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
    try {
      headingCleanupRef.current?.();
    } catch {}
    try {
      lightCleanupRef.current?.();
    } catch {}
    headingCleanupRef.current = null;
    lightCleanupRef.current = null;
  }, []);

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
      setFinalLuxMax(null);
      setFinalOrientation(null);
      return;
    }
    startSensors();
    return () => stopSensors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const endTest = useCallback(() => {
    setIsTestRunning(false);
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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
    if (typeof d === "number" && !isNaN(d)) testHeadingsRef.current.push(d);
  }, [headingSmooth, headingDeg, isTestRunning]);

  const apply = () => {
    const chosenLux = finalLuxMax ?? lux;
    const chosenLight = luxToLightLevel(chosenLux ?? null);
    const liveBucket = headingToOrientation45(headingSmooth ?? headingDeg);
    const chosenOrientation = finalOrientation ?? liveBucket ?? null;

    onApply({ light: chosenLight, orientation: chosenOrientation });
    onClose();
  };

  const lightLabelLive = useMemo(() => {
    if (Platform.OS !== "android") return tr("createPlant.step04.modal.notAvailable", "Not available");
    if (lux == null) return tr("createPlant.step04.modal.noSensor", "No sensor");
    return `${Math.round(lux)} lx`;
  }, [lux, tr]);

  const lightLabelFinal = useMemo(() => {
    if (finalLuxMax == null) return tr("createPlant.step04.modal.dash", "—");
    const lvl = luxToLightLevel(finalLuxMax);
    return `${Math.round(finalLuxMax)} lx • ${lightLevelLabel(lvl)}`;
  }, [finalLuxMax, lightLevelLabel, tr]);

  const orientationLabelLive = useMemo(() => {
    const d = headingSmooth ?? headingDeg;
    if (d == null) return tr("createPlant.step04.modal.notAvailable", "Not available");
    const o = headingToOrientation45(d) ?? "—";
    return `${o} (${Math.round(d)}°)`;
  }, [headingSmooth, headingDeg, tr]);

  if (!visible) return null;
  const countdownSec = Math.ceil(remainMs / 1000);

  const canApply =
    finalLuxMax != null ||
    finalOrientation != null ||
    headingToOrientation45(headingSmooth ?? headingDeg) != null ||
    (Platform.OS === "android" && lux != null);

  return (
    <>
      <Pressable style={remindersStyles.promptBackdrop} onPress={onClose} />

      <View style={remindersStyles.promptWrap}>
        <View style={remindersStyles.promptGlass}>
          <BlurView
            style={{ position: "absolute", inset: 0 } as any}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" } as any}
          />
        </View>

        <View style={[remindersStyles.promptInner, { maxHeight: "86%" }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.contentInner,
              { paddingTop: 16 + insets.top, paddingBottom: 80 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={wiz.promptTitle}>
              {tr("createPlant.step04.modal.title", "Measure light & direction")}
            </Text>

            <Text style={{ color: "#FFFFFF", fontWeight: "600", marginBottom: 10 }}>
              {tr(
                "createPlant.step04.modal.instructions",
                "Hold the phone horizontally (screen up), with the top edge pointing toward the window. Move/scan slowly near the window, then tap Measure to run a 5-second test."
              )}
            </Text>

            <View style={{ gap: 10 }}>
              <View style={rowStyle}>
                <View style={rowLeft}>
                  <MaterialCommunityIcons name="white-balance-sunny" size={18} color="#FFFFFF" />
                  <Text style={rowTitle}>
                    {tr("createPlant.step04.modal.ambientLive", "Ambient light (live)")}
                  </Text>
                </View>
                <Text style={rowVal}>{lightLabelLive}</Text>
              </View>

              <View style={rowStyle}>
                <View style={rowLeft}>
                  <MaterialCommunityIcons name="compass-outline" size={18} color="#FFFFFF" />
                  <Text style={rowTitle}>
                    {tr("createPlant.step04.modal.headingLive", "Heading (live)")}
                  </Text>
                </View>
                <Text style={rowVal}>{orientationLabelLive}</Text>
              </View>

              <View style={[rowStyle, { borderBottomWidth: 0 }]}>
                <View style={rowLeft}>
                  <MaterialCommunityIcons name="timer-sand" size={18} color="#FFFFFF" />
                  <Text style={rowTitle}>
                    {tr("createPlant.step04.modal.testLabel", "5-second measurement")}{" "}
                    {isTestRunning
                      ? tr("createPlant.step04.modal.running", "(running…)") 
                      : tr("createPlant.step04.modal.last", "(last)")}
                  </Text>
                </View>
                <Text style={rowVal}>{isTestRunning ? `~${countdownSec}s` : tr("createPlant.step04.modal.done", "done")}</Text>
              </View>

              <View style={{ paddingVertical: 2 }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                  {tr("createPlant.step04.modal.bestLight", "Light (best in 5s)")} {lightLabelFinal}
                </Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", marginTop: 4 }}>
                  {tr("createPlant.step04.modal.meanDirection", "Direction (mean in 5s)")}{" "}
                  {finalOrientation ?? tr("createPlant.step04.modal.dash", "—")}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <Pressable style={wiz.btn} onPress={onClose}>
                <Text style={wiz.btnText}>{tr("createPlant.step04.modal.close", "Close")}</Text>
              </Pressable>

              <Pressable
                style={[wiz.btn, { minWidth: 110 }, isTestRunning ? { opacity: 0.9 } : undefined]}
                onPress={isTestRunning ? undefined : start5sTest}
                disabled={isTestRunning}
              >
                <Text style={wiz.btnText}>
                  {isTestRunning
                    ? tr("createPlant.step04.modal.measuring", "Measuring…")
                    : tr("createPlant.step04.modal.measure5s", "Measure (5s)")}
                </Text>
              </Pressable>

              <Pressable
                style={[wiz.btn, wiz.btnPrimary, !canApply ? { opacity: 0.5 } : undefined]}
                onPress={apply}
                disabled={!canApply}
              >
                <Text style={wiz.btnText}>{tr("createPlant.step04.modal.apply", "Apply")}</Text>
              </Pressable>
            </View>

            <Text style={{ color: "rgba(255,255,255,0.82)", marginTop: 10 }}>
              {tr(
                "createPlant.step04.modal.tip",
                "Tip: On many phones the ambient light sensor sits near the earpiece at the top. Keep the phone flat and point the top edge toward the window to find the brightest reading."
              )}
            </Text>
          </ScrollView>
        </View>
      </View>
    </>
  );
}

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

const styles = StyleSheet.create({
  contentInner: {
    paddingHorizontal: 16,
  },
});
