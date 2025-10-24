import React from "react";
import { View, Pressable, Text } from "react-native";
import { s } from "../styles/readings-history.styles";
import type { MetricKey } from "../types/readings-history.types";
import { METRIC_LABELS } from "../constants/readings-history.constants";

type Props = {
  value: MetricKey;
  onChange: (v: MetricKey) => void;
};

export default function MetricPills({ value, onChange }: Props) {
  const items: { key: MetricKey; label: string }[] = [
    { key: "temperature", label: METRIC_LABELS.temperature },
    { key: "humidity",    label: METRIC_LABELS.humidity },
    { key: "light",       label: METRIC_LABELS.light },
    { key: "moisture",    label: METRIC_LABELS.moisture },
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
              active && s.pillActive,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => onChange(it.key)}
            // no ripple to avoid overlay artifacts
          >
            <Text style={s.pillText}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
