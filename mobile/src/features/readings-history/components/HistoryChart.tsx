import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { s } from "../styles/readings-history.styles";

type LabelOverride = "show" | "hide";
type Props = {
  labels: string[];
  values: (number | null)[];
  color: string;
  unit?: string;
  yTicks?: number;
  height: number;
  maxY?: number;
  fixedLabelIndex?: number;
  labelMode?: "latest" | "hidden" | "all";
};

export default function HistoryChart({ labels, values, color, unit = "", yTicks = 4, height, maxY,
  fixedLabelIndex, labelMode = "latest" }: Props) {
  const scale = useMemo(() => {
    const present = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const min = Math.min(0, ...present) * 1.1;
    const max = Math.max(1, maxY || 0, ...present) * 1.1;
    return { min, max, range: max - min };
  }, [values, maxY]);
  const baseline = -scale.min / scale.range * 100;
  const [labelOverrides, setLabelOverrides] = useState<Record<number, LabelOverride>>({});
  useEffect(() => { setLabelOverrides({}); }, [labels, values, labelMode]);
  const formatValue = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
  const shouldShowLabel = (index: number) => {
    if (labelOverrides[index]) return labelOverrides[index] === "show";
    return labelMode === "all" || (labelMode === "latest" && fixedLabelIndex === index);
  };

  return <View style={s.chartBox}>
    {!!unit && <Text testID="history-chart-unit" style={[s.xLabel, { alignSelf: "flex-end", marginBottom: 8 }]}>{unit}</Text>}
    <View style={{ position: "relative" }}>
      <View style={[s.yGuides, { height }]}>{Array.from({ length: yTicks + 1 }, (_, index) =>
        <View key={index} style={[s.guideLine, { top: `${index / yTicks * 100}%` }]} />
      )}</View>
      <View style={[s.chartArea, { height }]}>
        {values.map((value, index) => {
          const present = typeof value === "number" && Number.isFinite(value);
          const position = present ? (value - scale.min) / scale.range * 100 : 0;
          const barHeight = present ? Math.abs(position - baseline) : 0;
          const showLabel = present && shouldShowLabel(index);
          return <Pressable key={index} style={[s.barTapArea, { height: "100%", position: "relative" }]}
            accessibilityRole={present ? "button" : undefined} disabled={!present}
            accessibilityLabel={present ? `${formatValue(value)} ${unit}`.trim() : undefined}
            onPress={() => setLabelOverrides((previous) => ({ ...previous, [index]: showLabel ? "hide" : "show" }))}>
            {showLabel && <View style={[s.valueLabelSlot, { bottom: position / 100 * height }]}>
              <View style={s.valueLabelBubble}><Text style={s.valueLabelText} numberOfLines={1}>{formatValue(value)}</Text></View>
            </View>}
            {present ? <View testID={`history-bar-${index}`} style={[s.bar, {
              position: "absolute", bottom: `${Math.min(position, baseline)}%`,
              height: value === 0 ? 2 : `${barHeight}%`, backgroundColor: color,
            }]} /> : <View testID={`history-gap-${index}`} />}
          </Pressable>;
        })}
      </View>
    </View>
    <View style={s.xRow}>{labels.map((label, index) => <Text key={index} numberOfLines={1} style={s.xLabel}>{label}</Text>)}</View>
  </View>;
}
