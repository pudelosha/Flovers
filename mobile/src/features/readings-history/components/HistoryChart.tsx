import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { s } from "../styles/readings-history.styles";

type Props = {
  labels: string[];
  values: number[];
  color: string;
  yTicks?: number; // number of horizontal guides (default 4)
  maxY?: number;   // provide to clamp/normalize (else auto from data)
};

export default function HistoryChart({ labels, values, color, yTicks = 4, maxY }: Props) {
  const max = useMemo(() => {
    const m = values.reduce((acc, v) => (v > acc ? v : acc), 0);
    return Math.max(m, 1, maxY || 0);
  }, [values, maxY]);

  const guides = Array.from({ length: yTicks + 1 }).map((_, i) => {
    const top = (i / yTicks) * 100;
    return <View key={i} style={[s.guideLine, { top: `${top}%` }]} />;
  });

  return (
    <View style={s.chartBox}>
      <View style={{ position: "relative" }}>
        <View style={s.yGuides}>{guides}</View>
        <View style={s.chartArea}>
          {values.map((v, idx) => {
            const hPct = Math.max(0, Math.min(100, (v / max) * 100));
            return (
              <View
                key={idx}
                style={[s.bar, { height: `${hPct}%`, backgroundColor: color }]}
              />
            );
          })}
        </View>
      </View>

      <View style={s.xRow}>
        {labels.map((lbl, i) => (
          <Text key={i} numberOfLines={1} style={s.xLabel}>
            {lbl}
          </Text>
        ))}
      </View>
    </View>
  );
}
