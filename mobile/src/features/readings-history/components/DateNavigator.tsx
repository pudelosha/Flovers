import React from "react";
import { View, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/readings-history.styles";
import type { DateSpan, HistoryRange } from "../types/readings-history.types";

type Props = {
  range: HistoryRange;
  span: DateSpan;
  onPrev: () => void;
  onNext: () => void;
};

function pad2(n: number) { return n < 10 ? `0${n}` : String(n); }
function fmtDM(d: Date) { return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`; }

export default function DateNavigator({ range, span, onPrev, onNext }: Props) {
  const text =
    range === "day"
      ? `${fmtDM(span.from)}.${span.from.getFullYear()}`
      : `${fmtDM(span.from)} - ${fmtDM(span.to)}`;

  return (
    <View style={s.dateNav}>
      <Pressable style={s.dateBtn} onPress={onPrev} android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}>
        <MaterialCommunityIcons name="chevron-left" size={22} color="#FFFFFF" />
      </Pressable>

      <Text style={s.dateText}>{text}</Text>

      <Pressable style={s.dateBtn} onPress={onNext} android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}>
        <MaterialCommunityIcons name="chevron-right" size={22} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}
