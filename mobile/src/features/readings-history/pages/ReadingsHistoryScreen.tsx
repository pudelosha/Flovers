import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  LayoutChangeEvent,
  Text,
  useWindowDimensions,
  Animated,
  Easing,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import GlassHeader from "../../../shared/ui/GlassHeader";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";

import { s } from "../styles/readings-history.styles";
import HistorySegmented from "../components/HistorySegmented";
import MetricPills from "../components/MetricPills";
import HistoryChart from "../components/HistoryChart";
import DateNavigator from "../components/DateNavigator";

import type { HistoryRange, MetricKey, DateSpan } from "../types/readings-history.types";
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
  METRIC_COLORS,
  METRIC_UNITS,
  TILE_BLUR,
} from "../constants/readings-history.constants";

import { listReadingDevices, fetchReadingsHistory } from "../../../api/services/readings.service";
import type { ApiReadingDevice } from "../../readings/types/readings.types";

/* ------------ Date helpers for spans and label generation ------------ */
function startOfWeekMon(d: Date) {
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (dd.getDay() + 6) % 7; // 0=Mon..6=Sun
  dd.setDate(dd.getDate() - day);
  dd.setHours(0, 0, 0, 0);
  return dd;
}
function endOfWeekSun(d: Date) {
  const s = startOfWeekMon(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
function firstOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function lastOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addWeeks(d: Date, n: number) { return addDays(d, n * 7); }
function addMonths(d: Date, n: number) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }

function spanFor(range: HistoryRange, anchor: Date): DateSpan {
  if (range === "day") {
    const s = new Date(anchor); s.setHours(0, 0, 0, 0);
    const e = new Date(anchor); e.setHours(23, 59, 59, 999);
    return { from: s, to: e };
  }
  if (range === "week") return { from: startOfWeekMon(anchor), to: endOfWeekSun(anchor) };
  return { from: firstOfMonth(anchor), to: lastOfMonth(anchor) };
}
function weekdayShort(d: Date) {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][(d.getDay() + 6) % 7];
}
/* -------------------------------------------------------------------- */

type RouteParams = Partial<{ metric: MetricKey; range: HistoryRange; id: string; name?: string }>;

export default function ReadingsHistoryScreen() {
  const nav = useNavigation();
  const route = useRoute<any>();
  const params: RouteParams = (route?.params || {}) as RouteParams;

  // Defaults (as requested): Daily + Temperature
  const [range, setRange] = useState<HistoryRange>("day");
  const [metric, setMetric] = useState<MetricKey>("temperature");

  // selected device (id + names, fetched under auth)
  const [device, setDevice] = useState<Pick<ApiReadingDevice, "id" | "device_name" | "plant_name"> | null>(null);

  // selected plant (display name)
  const plantName = params?.name || device?.plant_name || "Plant";

  // date anchor (center for current range)
  const [anchor, setAnchor] = useState<Date>(new Date());

  // ✅ react to param changes even when mounted
  useEffect(() => {
    if (params.metric) setMetric(params.metric);
    if (params.range) setRange(params.range);
  }, [params.metric, params.range]);

  const span = useMemo(() => spanFor(range, anchor), [range, anchor]);

  // prev/next handlers per range
  const prevSpan = useCallback(() => {
    setAnchor((a) => (range === "day" ? addDays(a, -1) : range === "week" ? addWeeks(a, -1) : addMonths(a, -1)));
  }, [range]);
  const nextSpan = useCallback(() => {
    setAnchor((a) => (range === "day" ? addDays(a, 1) : range === "week" ? addWeeks(a, 1) : addMonths(a, 1)));
  }, [range]);

  // ----------- Height calculation including top & bottom bars ----------
  const { height: windowH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarH = useBottomTabBarHeight();

  // measure header height
  const [headerH, setHeaderH] = useState<number>(0);
  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    if (h !== headerH) setHeaderH(h);
  };

  // You set paddings to 0 — kept as-is here
  const frameViewportH =
    windowH
    - insets.top - insets.bottom
    - tabBarH
    - headerH
    - 0 /* scene top padding */
    - 0 /* scene bottom padding */;

  const [chartHeight, setChartHeight] = useState<number>(180);
  const segH = useRef(0), nameH = useRef(0), dateH = useRef(0), pillsH = useRef(0);

  const updateChartHeight = useCallback(() => {
    if (!Number.isFinite(frameViewportH)) return;
    // Inner paddings & gaps inside the glass frame:
    const innerPaddingTop = 14;
    const innerPaddingBottom = 16;
    const gaps = 10 /* seg->name */ + 8 /* name->date */ + 10 /* date->chart */ + 12 /* chart->pills */ + 4 /* pills top */;
    const allowance = innerPaddingTop + innerPaddingBottom + gaps;
    const nonChart = segH.current + nameH.current + dateH.current + pillsH.current + allowance;

    const available = Math.max(140, Math.floor(frameViewportH - nonChart));
    if (available !== chartHeight && Number.isFinite(available)) setChartHeight(available);
  }, [frameViewportH, chartHeight]);

  const onLayoutSeg = (e: LayoutChangeEvent) => { const h = Math.ceil(e.nativeEvent.layout.height); if (h !== segH.current) { segH.current = h; updateChartHeight(); } };
  const onLayoutName = (e: LayoutChangeEvent) => { const h = Math.ceil(e.nativeEvent.layout.height); if (h !== nameH.current) { nameH.current = h; updateChartHeight(); } };
  const onLayoutDate = (e: LayoutChangeEvent) => { const h = Math.ceil(e.nativeEvent.layout.height); if (h !== dateH.current) { dateH.current = h; updateChartHeight(); } };
  const onLayoutPills = (e: LayoutChangeEvent) => { const h = Math.ceil(e.nativeEvent.layout.height); if (h !== pillsH.current) { pillsH.current = h; updateChartHeight(); } };

  useEffect(() => { updateChartHeight(); }, [frameViewportH, updateChartHeight]);
  // --------------------------------------------------------------------

  // LIVE: loading + chart data
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);
  const [values, setValues] = useState<number[]>([]);

  // initial fetch: list devices, pick one (optionally based on params.id)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const list = await listReadingDevices({ auth: true });
        if (!mounted) return;

        let chosen: ApiReadingDevice | undefined;
        if (params.id) {
          chosen = list.find((d) => String(d.id) === String(params.id));
        }
        if (!chosen && list.length > 0) {
          chosen = list[0];
        }

        if (chosen) {
          setDevice({
            id: chosen.id,
            device_name: chosen.device_name,
            plant_name: chosen.plant_name,
          });
        }
      } catch {
        // swallow for now; UI will just show empty chart
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  // fetch history whenever device/range/metric/anchor changes
  useEffect(() => {
    if (!device) return;

    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        const resp = await fetchReadingsHistory(
          {
            deviceId: device.id,
            range,
            metric,
            anchor: anchor.toISOString(),
          },
          { auth: true }
        );

        if (!mounted) return;

        setLabels(resp.points.map((p) => p.label));
        setValues(resp.points.map((p) => p.value));
      } catch {
        if (!mounted) return;
        setLabels([]);
        setValues([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [device, range, metric, anchor]);

  const navTo = useCallback((name: string) => {
    nav.navigate(name as never);
  }, [nav]);

  // ---------- ✨ ENTER/EXIT ANIMATION (like Profile/Login) ----------
  const entry = useRef(new Animated.Value(0)).current;
  const contentOpacity = entry;
  const contentTranslateY = entry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const contentScale = entry.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  useFocusEffect(
    useCallback(() => {
      Animated.timing(entry, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      return () => {
        Animated.timing(entry, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start();
      };
    }, [entry])
  );
  // -----------------------------------------------------------------

  if (loading && !device) {
    // initial loading state (no device selected yet)
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
      {/* measure header height */}
      <View onLayout={onHeaderLayout}>
        <GlassHeader
          title="Readings History"
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          rightIconName="qrcode-scan"
          onPressRight={() => navTo("Scanner")}
          showSeparator={false}
        />
      </View>

      <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateY: contentTranslateY }, { scale: contentScale }] }}>
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
              <View onLayout={onLayoutSeg}>
                <HistorySegmented value={range} onChange={setRange} />
              </View>

              {/* Plant name */}
              <View onLayout={onLayoutName}>
                <Text style={s.plantName}>{plantName}</Text>
              </View>

              {/* Date navigator */}
              <View onLayout={onLayoutDate}>
                <DateNavigator range={range} span={span} onPrev={prevSpan} onNext={nextSpan} />
              </View>

              {/* Chart with dynamic height */}
              <HistoryChart
                labels={labels}
                values={values}
                color={METRIC_COLORS[metric]}
                yTicks={4}
                height={chartHeight}
              />

              {/* Metric buttons */}
              <View onLayout={onLayoutPills}>
                <MetricPills value={metric} onChange={setMetric} />
              </View>
            </View>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}
