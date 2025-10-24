import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, ScrollView } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useNavigation, useRoute } from "@react-navigation/native";

import GlassHeader from "../../../shared/ui/GlassHeader";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import FAB from "../../../shared/ui/FAB";

import { s } from "../styles/readings-history.styles";
import HistorySegmented from "../components/HistorySegmented";
import MetricPills from "../components/MetricPills";
import HistoryChart from "../components/HistoryChart";

import type { HistoryRange, MetricKey, HistorySeries } from "../types/readings-history.types";
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
  METRIC_COLORS,
  METRIC_UNITS,
  TILE_BLUR,
} from "../constants/readings-history.constants";

/* ---------------- Mock data source: replace with API ---------------- */
function genRangeLabels(range: HistoryRange): string[] {
  if (range === "day") return Array.from({ length: 24 }, (_, i) => (i % 3 === 0 ? `${i}` : ""));
  if (range === "week") return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return Array.from({ length: 30 }, (_, i) => `${i + 1}`);
}

function getHistory(range: HistoryRange, metric: MetricKey): HistorySeries {
  const labels = genRangeLabels(range);
  const n = labels.length;

  const seed = (metric.charCodeAt(0) + range.charCodeAt(0)) % 97;
  let x = seed;
  const rand = () => ((x = (x * 9301 + 49297) % 233280) / 233280);

  const values = Array.from({ length: n }, () => {
    const base =
      metric === "temperature" ? 18 + rand() * 10 :
      metric === "humidity"    ? 40 + rand() * 40 :
      metric === "light"       ? 200 + rand() * 900 :
                                 25 + rand() * 60;
    const factor = range === "day" ? 0.7 : range === "week" ? 1.0 : 1.2;
    return Math.round(base * factor);
  });

  return {
    metric,
    unit: METRIC_UNITS[metric],
    color: METRIC_COLORS[metric],
    points: values.map((v, i) => ({ label: labels[i], value: v })),
  };
}
/* ------------------------------------------------------------------- */

type RouteParams = Partial<{ metric: MetricKey; range: HistoryRange; id: string }>;

export default function ReadingsHistoryScreen() {
  const nav = useNavigation();
  const route = useRoute<any>();

  // Defaults (as requested): Daily + Temperature
  const [range, setRange] = useState<HistoryRange>("day");
  const [metric, setMetric] = useState<MetricKey>("temperature");

  // ✅ NEW: react to param changes even when the screen is already mounted
  useEffect(() => {
    const p: RouteParams = (route?.params || {}) as RouteParams;
    if (p.metric) setMetric(p.metric);
    if (p.range) setRange(p.range);
  }, [route?.params?.metric, route?.params?.range]);

  const [loading] = useState(false);
  const [modalOpen] = useState(false); // for FAB hiding logic if you add sheets
  const showFAB = !modalOpen;

  const series = useMemo(() => getHistory(range, metric), [range, metric]);
  const labels = useMemo(() => series.points.map((p) => p.label), [series]);
  const values = useMemo(() => series.points.map((p) => p.value), [series]);

  const navTo = useCallback((name: string) => {
    nav.navigate(name as never);
  }, [nav]);

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title="Readings History"
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          rightIconName="qrcode-scan"
          onPressRight={() => navTo("Scanner")}
          showSeparator={false}
        />
        <CenteredSpinner size={56} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title="Readings History"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        rightIconName="qrcode-scan"
        onPressRight={() => navTo("Scanner")}
        showSeparator={false}
      />

      <ScrollView contentContainerStyle={s.screenContent} showsVerticalScrollIndicator={false}>
        {/* Glass frame */}
        <View style={s.frameWrap}>
          <View style={s.frameGlass}>
            <BlurView
              style={{ position: "absolute", inset: 0 } as any}
              blurType="light"
              blurAmount={TILE_BLUR}
              overlayColor="transparent"
              reducedTransparencyFallbackColor="transparent"
            />
            <View pointerEvents="none" style={s.frameTint} />
            <View pointerEvents="none" style={s.frameBorder} />
          </View>

          <View style={s.inner}>
            {/* Top segmented menu */}
            <HistorySegmented value={range} onChange={setRange} />

            {/* Chart */}
            <HistoryChart labels={labels} values={values} color={series.color} yTicks={4} />

            {/* Metric buttons */}
            <MetricPills value={metric} onChange={setMetric} />
          </View>
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* FAB (hidden when a modal/sheet is open) */}
      {showFAB && (
        <FAB
          bottomOffset={92}
          actions={[
            { key: "configure", icon: "cog-outline", label: "Configure sensors", onPress: () => navTo("EditSensors") },
            { key: "sort", icon: "sort", label: "Sort", onPress: () => navTo("SortHistory") },
            { key: "filter", icon: "filter-variant", label: "Filter", onPress: () => navTo("FilterHistory") },
          ]}
        />
      )}
    </View>
  );
}
