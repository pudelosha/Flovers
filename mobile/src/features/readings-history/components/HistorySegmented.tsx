import React from "react";
import { View, Pressable, Text } from "react-native";
import { s } from "../styles/readings-history.styles";
import type { HistoryRange } from "../types/readings-history.types";

type Props = {
  value: HistoryRange;
  onChange: (v: HistoryRange) => void;
};

export default function HistorySegmented({ value, onChange }: Props) {
  return (
    <View style={s.segRow}>
      {(["day", "week", "month"] as const).map((v) => {
        const active = value === v;
        return (
          <Pressable
            key={v}
            // Use style callback instead of android_ripple (prevents stuck overlay)
            style={({ pressed }) => [
              s.segBtn,
              active && s.segBtnActive,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => onChange(v)}
            // no android_ripple here
          >
            <Text style={s.segText}>{v.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
