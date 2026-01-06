import React, { useMemo } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/readings.styles";
import { ReadingTileModel } from "../types/readings.types";
import { ICON_BG, METRIC_UNITS, TILE_BLUR } from "../constants/readings.constants";
import ReadingMenu from "./ReadingMenu";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

type MetricKey = "temperature" | "humidity" | "light" | "moisture";

type Props = {
  data: ReadingTileModel;
  isMenuOpen: boolean;
  onPressBody: () => void;
  onPressMenu: () => void;

  // menu actions
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPlantDetails: () => void;

  // NEW: deep-link to History for a specific metric
  onMetricPress: (metric: MetricKey) => void;

  // NEW: explicitly pass device name and selected sensors
  deviceName?: string;
  sensors?: {
    temperature?: boolean;
    humidity?: boolean;
    light?: boolean;
    moisture?: boolean;
  };
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
    <Pressable style={s.col} onPress={onPress} android_ripple={{ color: "rgba(255,255,255,0.10)" }}>
      <View style={[s.iconCircle, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color="#FFFFFF" />
      </View>
      <Text style={s.metricValue}>{value === null || value === undefined ? "—" : `${value}${unit}`}</Text>
    </Pressable>
  );
}

export default function ReadingTile({
  data,
  isMenuOpen,
  onPressBody,
  onPressMenu,
  onHistory,
  onEdit,
  onDelete,
  onPlantDetails,
  onMetricPress,
  deviceName,
  sensors,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = React.useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const dt = data.lastReadISO ? new Date(data.lastReadISO) : null;

  const lastText = useMemo(() => {
    if (!dt) return `${tr("readings.tile.lastReadPrefix", "Last read")}: —`;
    const date = dt.toLocaleDateString();
    const time = dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${tr("readings.tile.lastReadPrefix", "Last read")}: ${date} ${time}`;
  }, [dt, tr]);

  // Decide which metrics to show:
  // - If sensors not provided → keep existing behavior (show all).
  // - If provided → show only enabled ones, in the same order.
  const showTemp = sensors ? !!sensors.temperature : true;
  const showHum = sensors ? !!sensors.humidity : true;
  const showLight = sensors ? !!sensors.light : true;
  const showMoist = sensors ? !!sensors.moisture : true;

  return (
    <View style={s.cardWrap}>
      {/* Glass background */}
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

      {/* Top row: name + dots */}
      <View style={s.topRow}>
        <Pressable style={{ flex: 1, paddingRight: 8 }} onPress={onPressBody} android_ripple={{ color: "rgba(255,255,255,0.08)" }}>
          <Text style={s.name} numberOfLines={1}>
            {deviceName ?? data.name}
          </Text>
        </Pressable>
        <Pressable
          onPress={onPressMenu}
          style={s.dotsBtn}
          android_ripple={{ color: "rgba(255,255,255,0.16)", borderless: true }}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Metrics row — up to 4 columns (icon + value only) */}
      <View style={s.metricsRow}>
        {showTemp && (
          <MetricColPressable
            icon="thermometer"
            color={ICON_BG.temperature}
            value={data.metrics.temperature}
            unit={METRIC_UNITS.temperature}
            onPress={() => onMetricPress("temperature")}
          />
        )}
        {showHum && (
          <MetricColPressable
            icon="water-percent"
            color={ICON_BG.humidity}
            value={data.metrics.humidity}
            unit={METRIC_UNITS.humidity}
            onPress={() => onMetricPress("humidity")}
          />
        )}
        {showLight && (
          <MetricColPressable
            icon="white-balance-sunny"
            color={ICON_BG.light}
            value={data.metrics.light}
            unit={METRIC_UNITS.light}
            onPress={() => onMetricPress("light")}
          />
        )}
        {showMoist && (
          <MetricColPressable
            icon="water"
            color={ICON_BG.moisture}
            value={data.metrics.moisture}
            unit={METRIC_UNITS.moisture}
            onPress={() => onMetricPress("moisture")}
          />
        )}
      </View>

      {/* Last read */}
      <View style={s.lastRow}>
        <Text style={s.lastText}>{lastText}</Text>
      </View>

      {/* Menu */}
      {isMenuOpen && <ReadingMenu onHistory={onHistory} onEdit={onEdit} onDelete={onDelete} onPlantDetails={onPlantDetails} />}
    </View>
  );
}
