import React from "react";
import { View, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { s } from "../styles/readings-history.styles";
import type { MetricKey } from "../types/readings-history.types";
import { ICON_BG } from "../../readings/constants/readings.constants";

type Props = {
  value: MetricKey;
  onChange: (v: MetricKey) => void;
};

export default function MetricPills({ value, onChange }: Props) {
  const { t } = useTranslation();

  const items: { key: MetricKey; label: string; icon: string; color: string }[] = [
    {
      key: "temperature",
      label: t("readingsHistory.metric.temperatureShort"),
      icon: "thermometer",
      color: ICON_BG.temperature,
    },
    {
      key: "humidity",
      label: t("readingsHistory.metric.humidityShort"),
      icon: "water-percent",
      color: ICON_BG.humidity,
    },
    {
      key: "light",
      label: t("readingsHistory.metric.lightShort"),
      icon: "white-balance-sunny",
      color: ICON_BG.light,
    },
    {
      key: "moisture",
      label: t("readingsHistory.metric.moistureShort"),
      icon: "water",
      color: ICON_BG.moisture,
    },
  ];

  return (
    <View style={s.pillsRow}>
      {items.map((it) => {
        const active = value === it.key;
        return (
          <Pressable
            key={it.key}
            style={({ pressed }) => [
              s.pill,
              { backgroundColor: it.color },
              active && s.pillActive,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => onChange(it.key)}
            // no ripple to avoid overlay artifacts
          >
            <MaterialCommunityIcons
              name={it.icon as any}
              size={16}
              color="#FFFFFF"
              style={s.pillIcon}
            />
            <Text style={s.pillText}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
