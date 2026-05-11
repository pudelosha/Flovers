import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  LayoutChangeEvent,
  Text,
  Pressable,
  useWindowDimensions,
  Animated,
  Easing,
  StyleSheet,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import GlassHeader from "../../../shared/ui/GlassHeader";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import TopSnackbar from "../../../shared/ui/TopSnackbar";

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
function firstOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function lastOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addWeeks(d: Date, n: number) {
  return addDays(d, n * 7);
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function spanFor(range: HistoryRange, anchor: Date): DateSpan {
  if (range === "day") {
    const s = new Date(anchor);
    s.setHours(0, 0, 0, 0);
    const e = new Date(anchor);
    e.setHours(23, 59, 59, 999);
    return { from: s, to: e };
  }
  if (range === "week") return { from: startOfWeekMon(anchor), to: endOfWeekSun(anchor) };
  return { from: firstOfMonth(anchor), to: lastOfMonth(anchor) };
}

function normalizeLocaleTag(lang?: string): string {
  if (!lang) return "en";
  const lower = String(lang).toLowerCase();
  if (lower.startsWith("pl")) return "pl-PL";
  if (lower.startsWith("en")) return "en-US";
  return lang;
}

function formatHistoryPointLabel(
  atISO: string,
  range: HistoryRange,
  locale: string,
  monthBinCount?: number
): string {
  const dt = new Date(atISO);
  if (Number.isNaN(+dt)) return "";

  if (range === "day") {
    const hour = dt.getHours();
    return hour % 3 === 0 ? String(hour) : "";
  }

  if (range === "week") {
    return new Intl.DateTimeFormat(normalizeLocaleTag(locale), {
      weekday: "short",
    }).format(dt);
  }

  const dayNum = dt.getDate();
  const isEvery3rd = (dayNum - 1) % 3 === 0; // 1,4,7,10,...
  const isLast = monthBinCount != null && dayNum === monthBinCount;
  return isEvery3rd || isLast ? String(dayNum) : "";
}

/* -------------------- Error helper (401 detection) ------------------- */
function isUnauthorizedError(e: any): boolean {
  const status = (e?.response?.status ?? e?.status) as number | undefined;
  const msg = String(e?.message ?? "").toLowerCase();
  return (
    status === 401 ||
    msg.includes("401") ||
    msg.includes("unauthorized") ||
    msg.includes("unauthorised")
  );
}
/* -------------------------------------------------------------------- */

type RouteParams = Partial<{ metric: MetricKey; range: HistoryRange; id: string; name?: string }>;

// Same green tones as PlantTile / AuthCard
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

export default function ReadingsHistoryScreen() {
  const { t, i18n } = useTranslation();

  const nav = useNavigation();
  const route = useRoute<any>();
  const params: RouteParams = (route?.params || {}) as RouteParams;

  // Defaults: Daily + Temperature
  const [range, setRange] = useState<HistoryRange>("day");
  const [metric, setMetric] = useState<MetricKey>("temperature");

  // dummy chart options menu
  const [chartMenuOpen, setChartMenuOpen] = useState(false);

  // selected device (id + names, fetched under auth)
  const [device, setDevice] = useState<
    Pick<ApiReadingDevice, "id" | "device_name" | "plant_name"> | null
  >(null);

  // selected plant (display name)
  const plantName = params?.name || device?.plant_name || t("readingsHistory.plantFallback");

  // date anchor (center for current range)
  const [anchor, setAnchor] = useState<Date>(new Date());

  const span = useMemo(() => spanFor(range, anchor), [range, anchor]);

  const prevSpan = useCallback(() => {
    setChartMenuOpen(false);
    setAnchor((a) =>
      range === "day" ? addDays(a, -1) : range === "week" ? addWeeks(a, -1) : addMonths(a, -1)
    );
  }, [range]);

  // ⛔ Block navigation into future spans
  const nextSpan = useCallback(() => {
    setChartMenuOpen(false);
    setAnchor((a) => {
      const candidate =
        range === "day" ? addDays(a, 1) : range === "week" ? addWeeks(a, 1) : addMonths(a, 1);
      const today = new Date();
      const candidateSpan = spanFor(range, candidate);
      // if the whole new span starts after "now", block
      if (candidateSpan.from > today) {
        return a;
      }
      return candidate;
    });
  }, [range]);

  // ----------- Height calculation including top & bottom bars ----------
  const { height: windowH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarH = useBottomTabBarHeight();

  const [headerH, setHeaderH] = useState<number>(0);
  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    if (h !== headerH) setHeaderH(h);
  };

  const frameViewportH =
    windowH -
    insets.top -
    insets.bottom -
    tabBarH -
    headerH -
    0 /* scene top padding */ -
    0; /* scene bottom padding */

  const [chartHeight, setChartHeight] = useState<number>(180);
  const segH = useRef(0),
    nameH = useRef(0),
    dateH = useRef(0),
    pillsH = useRef(0);

  const updateChartHeight = useCallback(() => {
    if (!Number.isFinite(frameViewportH)) return;
    const innerPaddingTop = 14;
    const innerPaddingBottom = 16;
    const gaps =
      10 + // seg->name
      8 + // name->date
      10 + // date->chart
      12 + // chart->pills
      4; // pills top
    const allowance = innerPaddingTop + innerPaddingBottom + gaps;
    const nonChart = segH.current + nameH.current + dateH.current + pillsH.current + allowance;

    const available = Math.max(140, Math.floor(frameViewportH - nonChart));
    if (available !== chartHeight && Number.isFinite(available)) setChartHeight(available);
  }, [frameViewportH, chartHeight]);

  const onLayoutSeg = (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    if (h !== segH.current) {
      segH.current = h;
      updateChartHeight();
    }
  };
  const onLayoutName = (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    if (h !== nameH.current) {
      nameH.current = h;
      updateChartHeight();
    }
  };
  const onLayoutDate = (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    if (h !== dateH.current) {
      dateH.current = h;
      updateChartHeight();
    }
  };
  const onLayoutPills = (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    if (h !== pillsH.current) {
      pillsH.current = h;
      updateChartHeight();
    }
  };

  useEffect(() => {
    updateChartHeight();
  }, [frameViewportH, updateChartHeight]);
  // --------------------------------------------------------------------

  // LIVE: loading + chart data
  const [loadingDevice, setLoadingDevice] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);
  const [values, setValues] = useState<number[]>([]);

  // Toast like other screens
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] =
    useState<"default" | "success" | "error">("default");

  const showToast = useCallback(
    (msg: string, variant: "default" | "success" | "error" = "default") => {
      setToastMsg(msg);
      setToastVariant(variant);
      setToastVisible(true);
    },
    []
  );

  // initial fetch: list devices, pick one (optionally based on params.id)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingDevice(true);
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
        } else {
          setDevice(null);
          showToast(t("readingsHistory.noDevicesFound"), "error");
        }
      } catch (e: any) {
        if (!mounted) return;
        setDevice(null);
        if (isUnauthorizedError(e)) {
          showToast(t("readingsHistory.unauthorized"), "error");
        } else {
          showToast(e?.message || t("readingsHistory.failedLoadDevices"), "error");
        }
      } finally {
        if (mounted) setLoadingDevice(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [params.id, showToast, t]);

  // fetch history whenever device/range/metric/anchor changes
  useEffect(() => {
    if (!device) {
      setLabels([]);
      setValues([]);
      return;
    }

    let mounted = true;

    const run = async () => {
      try {
        setLoadingHistory(true);
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

        const monthBinCount =
          range === "month"
            ? new Date(span.to.getFullYear(), span.to.getMonth() + 1, 0).getDate()
            : undefined;

        setLabels(
          resp.points.map((p) =>
            formatHistoryPointLabel(p.at, range, i18n.language, monthBinCount)
          )
        );
        setValues(resp.points.map((p) => p.value));
      } catch (e: any) {
        if (!mounted) return;
        setLabels([]);
        setValues([]);

        let msg = t("readingsHistory.failedLoadHistory");
        if (e?.response?.data) {
          try {
            msg = JSON.stringify(e.response.data);
          } catch {
            msg = String(e.response.data);
          }
        } else if (e?.message) {
          msg = e.message;
        } else {
          msg = String(e);
        }

        showToast(msg, "error");
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [device, range, metric, anchor, span, showToast, t, i18n.language]);

  const navTo = useCallback(
    (name: string) => {
      nav.navigate(name as never);
    },
    [nav]
  );

  // ---------- ✨ ENTER/EXIT ANIMATION + reset current period ----------
  const entry = useRef(new Animated.Value(0)).current;
  const contentOpacity = entry;
  const contentTranslateY = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const contentScale = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  useFocusEffect(
    useCallback(() => {
      const now = new Date();

      if (params.metric) setMetric(params.metric);
      if (params.range) setRange(params.range);

      // always reset visible date span to current day/week/month on re-entry
      setAnchor(now);
      setChartMenuOpen(false);

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
    }, [entry, params.metric, params.range])
  );
  // -----------------------------------------------------------------

  // --------- Derived helpers for labels & navigation limits ---------
  const today = new Date();

  // Is currently selected span the "current" day/week/month (contains today)?
  const isCurrentSpan = span.from <= today && span.to >= today;

  // Latest available non-empty reading index in the current span
  // Treat 0 as "no reading" so we pick the latest bin that actually has data
  let latestIndexInCurrentSpan: number | null = null;
  if (isCurrentSpan) {
    for (let i = values.length - 1; i >= 0; i--) {
      const v = values[i];
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        latestIndexInCurrentSpan = i;
        break;
      }
    }
  }

  // Whether the "next" arrow should be enabled (span starting in the future is blocked)
  const nextCandidateAnchor =
    range === "day"
      ? addDays(anchor, 1)
      : range === "week"
        ? addWeeks(anchor, 1)
        : addMonths(anchor, 1);
  const nextCandidateSpan = spanFor(range, nextCandidateAnchor);
  const canGoNext = nextCandidateSpan.from <= today;
  // -----------------------------------------------------------------

  if (loadingDevice && !device) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title={t("readingsHistory.headerTitle")}
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          rightIconName="qrcode-scan"
          onPressRight={() => navTo("Scanner")}
          showSeparator={false}
        />
        <CenteredSpinner size={56} color="#FFFFFF" />
        <TopSnackbar
          visible={toastVisible}
          message={toastMsg}
          variant={toastVariant}
          onDismiss={() => setToastVisible(false)}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View onLayout={onHeaderLayout}>
        <GlassHeader
          title={t("readingsHistory.headerTitle")}
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          rightIconName="qrcode-scan"
          onPressRight={() => navTo("Scanner")}
          showSeparator={false}
        />
      </View>

      <Animated.View
        style={{
          flex: 1,
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }, { scale: contentScale }],
        }}
      >
        <ScrollView
          contentContainerStyle={s.screenContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.frameWrap}>
            <View style={s.frameGlass}>
              <LinearGradient
                pointerEvents="none"
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
                locations={[0, 1]}
                style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
              />

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

              <View pointerEvents="none" style={s.frameTint} />
              <View pointerEvents="none" style={s.frameBorder} />
            </View>

            <View style={s.inner}>
              <View onLayout={onLayoutSeg}>
                <HistorySegmented value={range} onChange={setRange} />
              </View>

              <View onLayout={onLayoutName}>
                <View
                  style={{
                    position: "relative",
                    minHeight: 34,
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={[
                      s.plantName,
                      {
                        paddingRight: 42,
                        textAlign: "left",
                        alignSelf: "stretch",
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {plantName}
                  </Text>

                  <Pressable
                    style={[
                      s.dateBtn,
                      {
                        position: "absolute",
                        right: 0,
                        top: 0,
                      },
                    ]}
                    onPress={() => setChartMenuOpen((v) => !v)}
                    android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}
                  >
                    <MaterialCommunityIcons
                      name="dots-vertical"
                      size={22}
                      color="#FFFFFF"
                    />
                  </Pressable>

                  {chartMenuOpen && (
                    <View
                      pointerEvents="auto"
                      style={{
                        position: "absolute",
                        top: 40,
                        right: 0,
                        zIndex: 50,
                        minWidth: 170,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor: "#000000",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.14)",
                        overflow: "hidden",
                      }}
                    >
                      <Pressable
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                        }}
                        onPress={() => setChartMenuOpen(false)}
                      >
                        <MaterialCommunityIcons
                          name="chart-line"
                          size={16}
                          color="#FFFFFF"
                          style={{ marginRight: 8 }}
                        />
                        <Text style={{ color: "#FFFFFF", fontSize: 13 }}>
                          Show average
                        </Text>
                      </Pressable>

                      <Pressable
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                        }}
                        onPress={() => setChartMenuOpen(false)}
                      >
                        <MaterialCommunityIcons
                          name="arrow-up-bold-outline"
                          size={16}
                          color="#FFFFFF"
                          style={{ marginRight: 8 }}
                        />
                        <Text style={{ color: "#FFFFFF", fontSize: 13 }}>
                          Show max
                        </Text>
                      </Pressable>

                      <Pressable
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                        }}
                        onPress={() => setChartMenuOpen(false)}
                      >
                        <MaterialCommunityIcons
                          name="arrow-down-bold-outline"
                          size={16}
                          color="#FFFFFF"
                          style={{ marginRight: 8 }}
                        />
                        <Text style={{ color: "#FFFFFF", fontSize: 13 }}>
                          Show min
                        </Text>
                      </Pressable>

                      <Pressable
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                        }}
                        onPress={() => setChartMenuOpen(false)}
                      >
                        <MaterialCommunityIcons
                          name="tag-off-outline"
                          size={16}
                          color="#FFFFFF"
                          style={{ marginRight: 8 }}
                        />
                        <Text style={{ color: "#FFFFFF", fontSize: 13 }}>
                          Hide labels
                        </Text>
                      </Pressable>

                      <Pressable
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                        }}
                        onPress={() => setChartMenuOpen(false)}
                      >
                        <MaterialCommunityIcons
                          name="tag-outline"
                          size={16}
                          color="#FFFFFF"
                          style={{ marginRight: 8 }}
                        />
                        <Text style={{ color: "#FFFFFF", fontSize: 13 }}>
                          Show labels
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>

              <View onLayout={onLayoutDate}>
                <DateNavigator
                  range={range}
                  span={span}
                  onPrev={prevSpan}
                  onNext={nextSpan}
                  canGoNext={canGoNext}
                />
              </View>

              <HistoryChart
                labels={labels}
                values={values}
                color={METRIC_COLORS[metric]}
                yTicks={4}
                height={chartHeight}
                fixedLabelIndex={
                  latestIndexInCurrentSpan !== null ? latestIndexInCurrentSpan : undefined
                }
              />

              <View onLayout={onLayoutPills}>
                <MetricPills value={metric} onChange={setMetric} />
              </View>
            </View>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </Animated.View>

      {loadingHistory && <CenteredSpinner overlay size={40} color="#FFFFFF" />}

      <TopSnackbar
        visible={toastVisible}
        message={toastMsg}
        variant={toastVariant}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}
