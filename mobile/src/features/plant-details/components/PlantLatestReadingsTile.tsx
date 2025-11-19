import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { s } from "../styles/plant-details.styles";
import { TILE_BLUR } from "../constants/plant-details.constants";

import type {
  LatestReadings,
  PlantMetricKey,
  PlantSensorsConfig,
} from "../types/plant-details.types";

// Reuse icon colors + units from readings feature to stay consistent
import {
  ICON_BG,
  METRIC_UNITS,
} from "../../readings/constants/readings.constants";

type Props = {
  latestReadings: LatestReadings;
  sensors?: PlantSensorsConfig;

  // Called when the whole tile is pressed (generic history)
  onTilePress: () => void;

  // Called when a specific metric is pressed (history focused on that metric)
  onMetricPress: (metric: PlantMetricKey) => void;
};

function lastReadText(d?: string | null) {
  if (!d) return "Last read: —";
  const dt = new Date(d);
  return `Last read: ${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

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
  const { temperature, humidity, light, moisture, tsISO } = latestReadings;

  // Decide which metrics to show; default: show all
  const showTemp = sensors ? !!sensors.temperature : true;
  const showHum = sensors ? !!sensors.humidity : true;
  const showLight = sensors ? !!sensors.light : true;
  const showMoist = sensors ? !!sensors.moisture : true;

  const lastText = lastReadText(tsISO);

  return (
    <Pressable
      style={styles.cardWrap}
      onPress={onTilePress}
      android_ripple={{ color: "rgba(255,255,255,0.08)" }}
    >
      {/* Glass background (same as Plant Details tiles) */}
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
        {/* Header */}
        <View style={styles.topRow}>
          <Text style={styles.title}>Latest readings</Text>
        </View>

        {/* Metrics row – dynamic number of columns */}
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

        {/* Last read */}
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
  inner: {
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  col: {
    flex: 1,
    alignItems: "center",
  },
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
  lastRow: {
    marginTop: 6,
  },
  lastText: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    fontSize: 12,
  },
});
