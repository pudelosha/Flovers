import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { s } from "../styles/readings-history.styles";

type Props = {
  labels: string[];
  values: number[];
  color: string;
  yTicks?: number; // number of horizontal guides (default 4)
  height: number; // dynamic from parent
  maxY?: number; // optional clamp (minimum scale)
  // index of bar which should always show a label (latest reading in current span)
  fixedLabelIndex?: number;
};

export default function HistoryChart({
  labels,
  values,
  color,
  yTicks = 4,
  height,
  maxY,
  fixedLabelIndex,
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

  // Which bars currently show labels due to user interaction
  const [visibleLabelIndexes, setVisibleLabelIndexes] = useState<Set<number>>(new Set());

  // Reset toggled labels whenever data set changes
  useEffect(() => {
    setVisibleLabelIndexes(new Set());
  }, [labels, values]);

  const toggleLabel = (index: number) => {
    // user shouldn't be able to hide the "fixed" latest reading label
    if (fixedLabelIndex === index) return;

    setVisibleLabelIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const formatValue = (v: number) => {
    if (!Number.isFinite(v)) return "";
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  };

  return (
    <View style={s.chartBox}>
      <View style={{ position: "relative" }}>
        <View style={[s.yGuides, { height }]}>{guides}</View>
        <View style={[s.chartArea, { height }]}>
          {values.map((v, idx) => {
            const hPct = Math.max(0, Math.min(100, (v / max) * 100));
            const isFixed = fixedLabelIndex === idx;
            const isToggled = visibleLabelIndexes.has(idx);
            const showLabel = isFixed || isToggled;

            const barHeightStyle = { height: `${hPct}%` };
            // convert percentage-based bar height to pixels so we can position the bubble
            const labelBottom = (hPct / 100) * height;
            const labelPosStyle = { bottom: labelBottom };

            return (
              <Pressable key={idx} style={s.barTapArea} onPress={() => toggleLabel(idx)}>
                {showLabel && Number.isFinite(v) && (
                  <View style={[s.valueLabelBubble, labelPosStyle]}>
                    <Text
                      style={s.valueLabelText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatValue(v)}
                    </Text>
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
