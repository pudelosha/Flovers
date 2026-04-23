import React, { useMemo, useState } from "react";
import { View, Pressable, Text, StyleSheet, Switch } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";

import { s } from "../styles/readings.styles";
import { ReadingTileModel } from "../types/readings.types";
import { ICON_BG, METRIC_UNITS } from "../constants/readings.constants";
import ReadingMenu from "./ReadingMenu";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider";

type MetricKey = "temperature" | "humidity" | "light" | "moisture";

type Props = {
  data: ReadingTileModel;
  isMenuOpen: boolean;
  onPressBody: () => void;
  onPressMenu: () => void;

  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPlantDetails: () => void;

  onMetricPress: (metric: MetricKey) => void;

  deviceName?: string;
  sensors?: {
    temperature?: boolean;
    humidity?: boolean;
    light?: boolean;
    moisture?: boolean;
  };
  // New props for pump functionality
  autoPumpEnabled?: boolean;
  soilMoistureThreshold?: number;
  lastPumpLaunchDate?: string | null;
  onAutoPumpToggle?: (enabled: boolean) => void;
  onLaunchPump?: () => void;
  isLaunchingPump?: boolean;
};

function formatDateBySettings(d: Date, settings?: any) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());

  const fmt = settings?.dateFormat;

  if (fmt === "mdy" || fmt === "MM/DD/YYYY" || fmt === "MM-DD-YYYY") {
    const sep = fmt === "MM-DD-YYYY" ? "-" : "/";
    return `${mm}${sep}${dd}${sep}${yyyy}`;
  }

  if (fmt === "ymd" || fmt === "YYYY-MM-DD" || fmt === "YYYY/MM/DD") {
    const sep = fmt === "YYYY/MM/DD" ? "/" : "-";
    return `${yyyy}${sep}${mm}${sep}${dd}`;
  }

  if (fmt === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  if (fmt === "DD-MM-YYYY") return `${dd}-${mm}-${yyyy}`;

  return `${dd}.${mm}.${yyyy}`;
}

function getTemperatureUnitFromSettings(settings?: any): "C" | "F" {
  const raw =
    settings?.temperatureUnit ??
    settings?.tempUnit ??
    settings?.units?.temperature ??
    "C";

  const normalized = String(raw).trim().toLowerCase();

  if (
    normalized === "f" ||
    normalized === "°f" ||
    normalized === "fahrenheit"
  ) {
    return "F";
  }

  return "C";
}

function celsiusToFahrenheit(celsius: number) {
  return (celsius * 9) / 5 + 32;
}

function getDisplayTemperature(
  value: number | null | undefined,
  settings?: any
): { value: number | null; unit: string; decimals: number } {
  if (value === null || value === undefined) {
    return { value: null, unit: "°C", decimals: 1 };
  }

  const unitPref = getTemperatureUnitFromSettings(settings);

  if (unitPref === "F") {
    return {
      value: celsiusToFahrenheit(value),
      unit: "°F",
      decimals: 1,
    };
  }

  return {
    value,
    unit: "°C",
    decimals: 1,
  };
}

function MetricColPressable({
  icon,
  color,
  value,
  unit,
  onPress,
  decimals,
}: {
  icon: string;
  color: string;
  value: number | null;
  unit: string;
  onPress: () => void;
  decimals?: number;
}) {
  return (
    <Pressable
      style={s.col}
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.10)" }}
    >
      <View style={[s.iconCircle, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color="#FFFFFF" />
      </View>
      <Text style={s.metricValue}>
        {value === null || value === undefined
          ? "—"
          : `${typeof decimals === "number" ? value.toFixed(decimals) : value}${unit}`}
      </Text>
    </Pressable>
  );
}

const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

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
  autoPumpEnabled,
  soilMoistureThreshold,
  lastPumpLaunchDate,
  onAutoPumpToggle,
  onLaunchPump,
  isLaunchingPump = false,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();

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

  const effectivePumpIncluded = !!data.pumpIncluded;
  const effectiveAutoPumpEnabled = autoPumpEnabled ?? data.automaticPumpLaunch;
  const effectiveSoilMoistureThreshold = soilMoistureThreshold ?? data.pumpThresholdPct ?? 30;
  const effectiveLastPumpLaunchDate = lastPumpLaunchDate ?? data.lastPumpRunAt ?? null;

  const lastText = useMemo(() => {
    if (!dt) return `${tr("readings.tile.lastReadPrefix", "Last read")}: —`;

    const date = formatDateBySettings(dt, settings);

    const time = dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${tr("readings.tile.lastReadPrefix", "Last read")}: ${date} ${time}`;
  }, [dt, tr, settings]);

  const displayTemperature = useMemo(() => {
    return getDisplayTemperature(data.metrics.temperature, settings);
  }, [data.metrics.temperature, settings]);

  const showTemp = sensors ? !!sensors.temperature : true;
  const showHum = sensors ? !!sensors.humidity : true;
  const showLight = sensors ? !!sensors.light : true;
  const showMoist = sensors ? !!sensors.moisture : true;

  // Format last pump launch date
  const lastPumpText = useMemo(() => {
    if (!effectiveLastPumpLaunchDate) {
      return "Ostatnie uruchomienie: —";
    }
    
    const pumpDate = new Date(effectiveLastPumpLaunchDate);
    const date = formatDateBySettings(pumpDate, settings);
    const time = pumpDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    
    return `Ostatnie uruchomienie: ${date} ${time}`;
  }, [effectiveLastPumpLaunchDate, settings]);

  return (
    <View style={s.cardWrap}>
      <View style={s.cardGlass}>
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

        <View pointerEvents="none" style={s.cardTint} />
        <View pointerEvents="none" style={s.cardBorder} />
      </View>

      <View style={s.topRow}>
        <Pressable
          style={{ flex: 1, paddingRight: 8 }}
          onPress={onPressBody}
          android_ripple={{ color: "rgba(255,255,255,0.08)" }}
        >
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
          <MaterialCommunityIcons
            name="dots-horizontal"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      <View style={s.metricsRow}>
        {showTemp && (
          <MetricColPressable
            icon="thermometer"
            color={ICON_BG.temperature}
            value={displayTemperature.value}
            unit={displayTemperature.unit}
            decimals={displayTemperature.decimals}
            onPress={() => onMetricPress("temperature")}
          />
        )}

        {showHum && (
          <MetricColPressable
            icon="water-percent"
            color={ICON_BG.humidity}
            value={data.metrics.humidity}
            unit={METRIC_UNITS.humidity}
            decimals={1}
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

      <View style={s.lastRow}>
        <Text style={s.lastText}>{lastText}</Text>
      </View>

      {effectivePumpIncluded && (
        <>
          {/* Horizontal Line - pale, with margins */}
          <View style={horizontalLineStyles.line} />

          {/* Auto Pump Section - artificially set to always show */}
          <>
            <View style={pumpStyles.autoPumpContainer}>
              <View style={pumpStyles.autoPumpTextContainer}>
                <Text style={pumpStyles.autoPumpLabel}>Automatyczna pompa</Text>
                <Text style={pumpStyles.autoPumpSubtext}>
                  Gdy wilgotność gleby &lt;{effectiveSoilMoistureThreshold}%
                </Text>
              </View>
              <Switch
                value={effectiveAutoPumpEnabled}
                onValueChange={onAutoPumpToggle}
                trackColor={{ false: "rgba(255,255,255,0.3)", true: "#4CAF50" }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Last Pump Launch - clock icon and date */}
            <View style={pumpStyles.lastPumpRow}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="rgba(255,255,255,0.88)" />
              <Text style={pumpStyles.lastPumpText}>{lastPumpText}</Text>
            </View>

            {/* Launch Pump Button - same style as Login button */}
            <Pressable
              style={({ pressed }) => [
                pumpStyles.launchButton,
                pressed && pumpStyles.launchButtonPressed,
              ]}
              onPress={onLaunchPump}
              disabled={isLaunchingPump}
            >
              <Text style={pumpStyles.launchButtonText}>
                {isLaunchingPump ? "Uruchamianie..." : "Uruchom pompę"}
              </Text>
            </Pressable>
          </>
        </>
      )}
    </View>
  );
}

const horizontalLineStyles = StyleSheet.create({
  line: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)", // Pale white
    marginHorizontal: 18, // Margins from edges
    marginVertical: 12,
  },
});

const pumpStyles = StyleSheet.create({
  autoPumpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  autoPumpTextContainer: {
    flex: 1,
  },
  autoPumpLabel: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  autoPumpSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    marginTop: 2,
  },
  lastPumpRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 6,
    gap: 8,
  },
  lastPumpText: {
    color: "rgba(255,255,255,0.88)",
    fontWeight: "600",
    fontSize: 10,
  },
  launchButton: {
    backgroundColor: "rgba(11,114,133,0.92)",
    borderRadius: 14,
    paddingVertical: 12,
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  launchButtonPressed: {
    opacity: 0.85,
  },
  launchButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },
});