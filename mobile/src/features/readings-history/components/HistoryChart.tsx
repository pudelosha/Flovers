import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { s } from "../styles/readings-history.styles";

type LabelOverride = "show" | "hide";

type Props = {
  labels: string[];
  values: number[];
  color: string;
  yTicks?: number; // number of horizontal guides (default 4)
  height: number; // dynamic from parent
  maxY?: number; // optional clamp (minimum scale)
  // index of bar which should always show a label (latest reading in current span)
  fixedLabelIndex?: number;
  labelMode?: "latest" | "hidden" | "all";
};

export default function HistoryChart({
  labels,
  values,
  color,
  yTicks = 4,
  height,
  maxY,
  fixedLabelIndex,
  labelMode = "latest",
}: Props) {
  // Add a bit of headroom so tallest bar doesn't stick to the top
  const max = useMemo(() => {
    const m = values.reduce((acc, v) => (v > acc ? v : acc), 0);
    const base = Math.max(m, 1, maxY || 0);
    const padded = base * 1.1; // 10% padding at the top
    return padded;
  }, [values, maxY]);

  const guides = Array.from({ length: yTicks + 1 }).map((_, i) => {
    const top = (i / yTicks) * 100;
    return <View key={i} style={[s.guideLine, { top: `${top}%` }]} />;
  });

  const [labelOverrides, setLabelOverrides] = useState<Record<number, LabelOverride>>({});

  // Reset individual label changes whenever data set or global label mode changes.
  useEffect(() => {
    setLabelOverrides({});
  }, [labels, values, labelMode]);

  const formatValue = (v: number) => {
    if (!Number.isFinite(v)) return "";
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  };

  const canDisplayLabel = (value: number) => {
    const label = formatValue(value);
    return label !== "" && label !== "0" && label !== "0.0";
  };

  const shouldShowLabel = (index: number, value: number) => {
    if (!canDisplayLabel(value)) return false;

    const override = labelOverrides[index];
    if (override === "show") return true;
    if (override === "hide") return false;

    if (labelMode === "all") return true;
    if (labelMode === "hidden") return false;

    return labelMode === "latest" && fixedLabelIndex === index;
  };

  const toggleLabel = (index: number, value: number) => {
    if (!canDisplayLabel(value)) return;

    const isVisible = shouldShowLabel(index, value);
    setLabelOverrides((prev) => ({
      ...prev,
      [index]: isVisible ? "hide" : "show",
    }));
  };

  return (
    <View style={s.chartBox}>
      <View style={{ position: "relative" }}>
        <View style={[s.yGuides, { height }]}>{guides}</View>
        <View style={[s.chartArea, { height }]}>
          {values.map((v, idx) => {
            const hPct = Math.max(0, Math.min(100, (v / max) * 100));
            const showLabel = shouldShowLabel(idx, v);

            const barHeightStyle = { height: `${hPct}%` };
            // convert percentage-based bar height to pixels so we can position the bubble
            const labelBottom = (hPct / 100) * height;
            const labelPosStyle = { bottom: labelBottom };

            return (
              <Pressable key={idx} style={s.barTapArea} onPress={() => toggleLabel(idx, v)}>
                {showLabel && Number.isFinite(v) && (
                  <View style={[s.valueLabelSlot, labelPosStyle]}>
                    <View style={s.valueLabelBubble}>
                      <Text
                        style={s.valueLabelText}
                        numberOfLines={1}
                      >
                        {formatValue(v)}
                      </Text>
                    </View>
                  </View>
                )}
                <View style={[s.bar, barHeightStyle, { backgroundColor: color }]} />
              </Pressable>
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
