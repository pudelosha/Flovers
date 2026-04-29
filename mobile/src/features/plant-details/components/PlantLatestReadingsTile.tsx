import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider";

import { s } from "../styles/plant-details.styles";

import type {
  LatestReadings,
  PlantMetricKey,
  PlantSensorsConfig,
} from "../types/plant-details.types";

import {
  ICON_BG,
  METRIC_UNITS,
} from "../../readings/constants/readings.constants";

type Props = {
  latestReadings: LatestReadings;
  sensors?: PlantSensorsConfig;
  onTilePress: () => void;
  onMetricPress: (metric: PlantMetricKey) => void;

  /**
   * Pump section is shown only when pumpIncluded is true.
   */
  pumpIncluded?: boolean;
  lastPumpLaunchDate?: string | null;
  hasPendingWatering?: boolean;
  onScheduleWatering?: () => void;
  isSchedulingWatering?: boolean;
};

const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";
const PUMP_BLUE = "rgba(11,114,133,0.92)";

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
      style={styles.col}
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.10)" }}
    >
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color="#FFFFFF" />
      </View>

      <Text style={styles.metricValue}>
        {value === null || value === undefined
          ? "—"
          : `${typeof decimals === "number" ? value.toFixed(decimals) : value}${unit}`}
      </Text>
    </Pressable>
  );
}

export default function PlantLatestReadingsTile({
  latestReadings,
  sensors,
  onTilePress,
  onMetricPress,
  pumpIncluded = false,
  lastPumpLaunchDate = null,
  hasPendingWatering = false,
  onScheduleWatering,
  isSchedulingWatering = false,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;

      const txt = t(key, {
        ...(values || {}),
        defaultValue: fallback ?? key.split(".").pop() ?? key,
      });

      return txt || fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  const { temperature, humidity, light, moisture, tsISO } = latestReadings;

  const showTemp = sensors ? !!sensors.temperature : true;
  const showHum = sensors ? !!sensors.humidity : true;
  const showLight = sensors ? !!sensors.light : true;
  const showMoist = sensors ? !!sensors.moisture : true;

  const displayTemperature = useMemo(() => {
    return getDisplayTemperature(temperature, settings);
  }, [temperature, settings]);

  const lastText = useMemo(() => {
    if (!tsISO) {
      return `${tr("plantDetails.latestReadings.lastReadPrefix", "Last read")}: —`;
    }

    const dt = new Date(tsISO);
    const date = formatDateBySettings(dt, settings);
    const time = dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${tr("plantDetails.latestReadings.lastReadPrefix", "Last read")}: ${date} ${time}`;
  }, [tsISO, settings, tr]);

  const lastPumpText = useMemo(() => {
    if (!lastPumpLaunchDate) {
      return `${tr("plantDetails.latestReadings.lastPumpRunPrefix", "Last pump run")}: —`;
    }

    const dt = new Date(lastPumpLaunchDate);
    const date = formatDateBySettings(dt, settings);
    const time = dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${tr("plantDetails.latestReadings.lastPumpRunPrefix", "Last pump run")}: ${date} ${time}`;
  }, [lastPumpLaunchDate, settings, tr]);

  return (
    <View style={styles.cardWrap}>
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

      <Pressable
        style={styles.bodyPressable}
        onPress={onTilePress}
        android_ripple={{ color: "rgba(255,255,255,0.08)" }}
      >
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
              value={humidity}
              unit={METRIC_UNITS.humidity}
              decimals={1}
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

        <View style={styles.lastReadRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color="rgba(255,255,255,0.88)"
            style={styles.infoIcon}
          />
          <Text style={styles.lastText}>{lastText}</Text>
        </View>
      </Pressable>

      {pumpIncluded && (
        <>
          <View style={styles.line} />

          <View style={styles.lastPumpRow}>
            <MaterialCommunityIcons
              name="timer-cog-outline"
              size={14}
              color="rgba(255,255,255,0.88)"
              style={styles.infoIcon}
            />
            <Text style={styles.lastPumpText}>{lastPumpText}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.launchButton,
              hasPendingWatering && styles.unscheduleButton,
              pressed && styles.launchButtonPressed,
            ]}
            onPress={onScheduleWatering}
            disabled={!onScheduleWatering || isSchedulingWatering}
          >
            <Text style={styles.launchButtonText}>
              {isSchedulingWatering
                ? tr("plantDetails.latestReadings.opening", "Opening...")
                : hasPendingWatering
                  ? tr(
                      "plantDetails.latestReadings.unscheduleWatering",
                      "Unschedule watering"
                    )
                  : tr(
                      "plantDetails.latestReadings.scheduleWatering",
                      "Schedule watering"
                    )}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    elevation: 8,
    marginBottom: 14,
  },

  bodyPressable: {
    paddingTop: 16,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
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

  lastReadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },

  infoIcon: {
    marginRight: 8,
  },

  lastText: {
    color: "rgba(255,255,255,0.88)",
    fontWeight: "600",
    fontSize: 12,
  },

  line: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 18,
    marginVertical: 6,
  },

  lastPumpRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 6,
  },

  lastPumpText: {
    color: "rgba(255,255,255,0.88)",
    fontWeight: "600",
    fontSize: 12,
  },

  launchButton: {
    backgroundColor: PUMP_BLUE,
    borderRadius: 14,
    paddingVertical: 12,
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 14,
    alignItems: "center",
  },

  unscheduleButton: {
    backgroundColor: "rgba(255,255,255,0.12)",
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