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
            style={[s.segBtn, active && s.segBtnActive]}
            onPress={() => onChange(v)}
            android_ripple={{ color: "rgba(255,255,255,0.16)" }}
          >
            <Text style={s.segText}>{v.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
