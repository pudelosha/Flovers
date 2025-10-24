import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/readings.styles";
import { ReadingTileModel } from "../types/readings.types";
import { ICON_BG, METRIC_UNITS, TILE_BLUR } from "../constants/readings.constants";
import ReadingMenu from "./ReadingMenu";

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
};

function MetricCol({
  icon, color, value, unit,
}: {
  icon: string; color: string; value: number | null; unit: string;
}) {
  return (
    <View style={s.col}>
      <View style={[s.iconCircle, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color="#FFFFFF" />
      </View>
      <Text style={s.metricValue}>
        {value === null || value === undefined ? "—" : `${value}${unit}`}
      </Text>
    </View>
  );
}

export default function ReadingTile({
  data, isMenuOpen, onPressBody, onPressMenu,
  onHistory, onEdit, onDelete, onPlantDetails,
}: Props) {
  const dt = data.lastReadISO ? new Date(data.lastReadISO) : null;
  const lastText = dt
    ? `Last read: ${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Last read: —";

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
          <Text style={s.name} numberOfLines={1}>{data.name}</Text>
        </Pressable>
        <Pressable onPress={onPressMenu} style={s.dotsBtn} android_ripple={{ color: "rgba(255,255,255,0.16)", borderless: true }} hitSlop={8}>
          <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Metrics row — 4 columns (icon + value only) */}
      <View style={s.metricsRow}>
        <MetricCol icon="thermometer"       color={ICON_BG.temperature} value={data.metrics.temperature} unit={METRIC_UNITS.temperature} />
        <MetricCol icon="water-percent"     color={ICON_BG.humidity}    value={data.metrics.humidity}    unit={METRIC_UNITS.humidity} />
        <MetricCol icon="white-balance-sunny" color={ICON_BG.light}     value={data.metrics.light}       unit={METRIC_UNITS.light} />
        <MetricCol icon="water"             color={ICON_BG.moisture}    value={data.metrics.moisture}    unit={METRIC_UNITS.moisture} />
      </View>

      {/* Last read */}
      <View style={s.lastRow}>
        <Text style={s.lastText}>{lastText}</Text>
      </View>

      {/* Menu */}
      {isMenuOpen && (
        <ReadingMenu
          onHistory={onHistory}
          onEdit={onEdit}
          onDelete={onDelete}
          onPlantDetails={onPlantDetails}
        />
      )}
    </View>
  );
}
