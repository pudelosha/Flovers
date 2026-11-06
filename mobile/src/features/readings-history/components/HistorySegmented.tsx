import React from "react";
import { View, Pressable, Text } from "../../../shared/theme/native";
import { useTranslation } from "react-i18next";
import { s } from "../styles/readings-history.styles";
import type { HistoryRange } from "../types/readings-history.types";

type Props = {
  value: HistoryRange;
  onChange: (v: HistoryRange) => void;
};

export default function HistorySegmented({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <View style={s.segRow}>
      {(["day", "week", "month"] as const).map((v) => {
        const active = value === v;
        return (
          <Pressable
            key={v}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            // Use style callback instead of android_ripple (prevents stuck overlay)
            style={({ pressed }) => [
              s.segBtn,
              active && s.segBtnActive,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => onChange(v)}
            // no android_ripple here
          >
            <Text style={s.segText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {v === "day"
                ? t("readingsHistory.segment.day")
                : v === "week"
                ? t("readingsHistory.segment.week")
                : t("readingsHistory.segment.month")}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
