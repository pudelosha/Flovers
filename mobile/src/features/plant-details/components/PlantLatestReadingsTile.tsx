import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import { s } from "../styles/plant-details.styles";
import { TILE_BLUR } from "../constants/plant-details.constants";

import type {
  LatestReadings,
  PlantMetricKey,
  PlantSensorsConfig,
} from "../types/plant-details.types";

import { ICON_BG, METRIC_UNITS } from "../../readings/constants/readings.constants";

type Props = {
  latestReadings: LatestReadings;
  sensors?: PlantSensorsConfig;
  onTilePress: () => void;
  onMetricPress: (metric: PlantMetricKey) => void;
};

function MetricColPressable({
  icon,
  color,
  value,
  unit,
  onPress,
}: {
  icon: string;
  color: string;
  value: number | null;
  unit: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.col}
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.10)" }}
    >
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color="#FFFFFF" />
      </View>
      <Text style={styles.metricValue}>
        {value === null || value === undefined ? "—" : `${value}${unit}`}
      </Text>
    </Pressable>
  );
}

export default function PlantLatestReadingsTile({
  latestReadings,
  sensors,
  onTilePress,
  onMetricPress,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  const { temperature, humidity, light, moisture, tsISO } = latestReadings;

  const showTemp = sensors ? !!sensors.temperature : true;
  const showHum = sensors ? !!sensors.humidity : true;
  const showLight = sensors ? !!sensors.light : true;
  const showMoist = sensors ? !!sensors.moisture : true;

  const lastText = useMemo(() => {
    if (!tsISO) return tr("plantDetails.latestReadings.lastRead.empty", "Last read: —");
    const dt = new Date(tsISO);
    return tr("plantDetails.latestReadings.lastRead.value", "Last read: {{date}} {{time}}", {
      date: dt.toLocaleDateString(),
      time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }, [tsISO, tr]);

  return (
    <Pressable
      style={styles.cardWrap}
      onPress={onTilePress}
      android_ripple={{ color: "rgba(255,255,255,0.08)" }}
    >
      <View style={s.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={TILE_BLUR}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
        />
        <View pointerEvents="none" style={s.cardTint} />
        <View pointerEvents="none" style={s.cardBorder} />
      </View>

      <View style={styles.inner}>
        <View style={styles.topRow}>
          <Text style={styles.title}>
            {tr("plantDetails.latestReadings.title", "Latest readings")}
          </Text>
        </View>

        <View style={styles.metricsRow}>
          {showTemp && (
            <MetricColPressable
              icon="thermometer"
              color={ICON_BG.temperature}
              value={temperature}
              unit={METRIC_UNITS.temperature}
              onPress={() => onMetricPress("temperature")}
            />
          )}
          {showHum && (
            <MetricColPressable
              icon="water-percent"
              color={ICON_BG.humidity}
              value={humidity}
              unit={METRIC_UNITS.humidity}
              onPress={() => onMetricPress("humidity")}
            />
          )}
          {showLight && (
            <MetricColPressable
              icon="white-balance-sunny"
              color={ICON_BG.light}
              value={light}
              unit={METRIC_UNITS.light}
              onPress={() => onMetricPress("light")}
            />
          )}
          {showMoist && (
            <MetricColPressable
              icon="water"
              color={ICON_BG.moisture}
              value={moisture}
              unit={METRIC_UNITS.moisture}
              onPress={() => onMetricPress("moisture")}
            />
          )}
        </View>

        <View style={styles.lastRow}>
          <Text style={styles.lastText}>{lastText}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    marginBottom: 14,
  },
  inner: { padding: 16 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  title: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  col: { flex: 1, alignItems: "center" },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    marginTop: 6,
  },
  lastRow: { marginTop: 6 },
  lastText: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    fontSize: 12,
  },
});
