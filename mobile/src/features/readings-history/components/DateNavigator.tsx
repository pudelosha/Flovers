import React, { useMemo } from "react";
import { View, Pressable, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/readings-history.styles";
import type { DateSpan, HistoryRange } from "../types/readings-history.types";
import { useSettings } from "../../../app/providers/SettingsProvider";

type Props = {
  range: HistoryRange;
  span: DateSpan;
  onPrev: () => void;
  onNext: () => void;
  canGoNext?: boolean;
};

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateBySettings(
  d: Date,
  settings?: any,
  opts?: { withYear?: boolean }
) {
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = String(d.getFullYear());
  const withYear = !!opts?.withYear;

  const fmt = settings?.dateFormat;

  if (fmt === "mdy" || fmt === "MM/DD/YYYY" || fmt === "MM-DD-YYYY") {
    const sep = fmt === "MM-DD-YYYY" ? "-" : "/";
    return withYear ? `${mm}${sep}${dd}${sep}${yyyy}` : `${mm}${sep}${dd}`;
  }

  if (fmt === "ymd" || fmt === "YYYY-MM-DD" || fmt === "YYYY/MM/DD") {
    const sep = fmt === "YYYY/MM/DD" ? "/" : "-";
    return withYear ? `${yyyy}${sep}${mm}${sep}${dd}` : `${mm}${sep}${dd}`;
  }

  if (fmt === "DD/MM/YYYY") {
    return withYear ? `${dd}/${mm}/${yyyy}` : `${dd}/${mm}`;
  }

  if (fmt === "DD-MM-YYYY") {
    return withYear ? `${dd}-${mm}-${yyyy}` : `${dd}-${mm}`;
  }

  return withYear ? `${dd}.${mm}.${yyyy}` : `${dd}.${mm}`;
}

export default function DateNavigator({
  range,
  span,
  onPrev,
  onNext,
  canGoNext = true,
}: Props) {
  const { settings } = useSettings();

  const text = useMemo(() => {
    if (range === "day") {
      return formatDateBySettings(span.from, settings, { withYear: true });
    }

    return `${formatDateBySettings(span.from, settings)} - ${formatDateBySettings(
      span.to,
      settings
    )}`;
  }, [range, span, settings]);

  const disableNext = !canGoNext;

  return (
    <View style={s.dateNav}>
      <Pressable
        style={s.dateBtn}
        onPress={onPrev}
        android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}
      >
        <MaterialCommunityIcons name="chevron-left" size={22} color="#FFFFFF" />
      </Pressable>

      <Text style={s.dateText}>{text}</Text>

      <Pressable
        style={[s.dateBtn, disableNext && s.dateBtnDisabled]}
        onPress={disableNext ? undefined : onNext}
        disabled={disableNext}
        android_ripple={
          disableNext
            ? undefined
            : { color: "rgba(255,255,255,0.2)", borderless: true }
        }
      >
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={disableNext ? "rgba(255,255,255,0.35)" : "#FFFFFF"}
        />
      </Pressable>
    </View>
  );
}