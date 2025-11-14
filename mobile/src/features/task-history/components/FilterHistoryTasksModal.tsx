import React from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { s } from "../styles/task-history.styles";
import type { TaskType } from "../../home/types/home.types";
import { ACCENT_BY_TYPE } from "../../home/constants/home.constants";

type Props = {
  visible: boolean;
  filters: { types?: TaskType[] };
  onCancel: () => void;
  onApply: (filters: { types?: TaskType[] }) => void;
  onClearAll: () => void;
};

const TYPE_OPTIONS: { key: TaskType; label: string }[] = [
  { key: "watering", label: "Watering" },
  { key: "moisture", label: "Moisture" },
  { key: "fertilising", label: "Fertilising" },
  { key: "care", label: "Care" },
  { key: "repot", label: "Repot" },
];

// same helper as in Reminders filter
function hexToRgba(hex?: string, alpha = 1) {
  const fallback = `rgba(255,255,255,${alpha})`;
  if (!hex || typeof hex !== "string") return fallback;
  let h = hex.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return fallback;
  const bigint = parseInt(h, 16);
  if (Number.isNaN(bigint)) return fallback;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function FilterHistoryTasksModal({
  visible,
  filters,
  onCancel,
  onApply,
  onClearAll,
}: Props) {
  const [types, setTypes] = React.useState<TaskType[]>(filters.types || []);

  React.useEffect(() => {
    if (visible) {
      setTypes(filters.types || []);
    }
  }, [visible, filters]);

  if (!visible) return null;

  const toggleType = (t: TaskType) => {
    setTypes((curr) => (curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t]));
  };

  const isFilterActive = types.length > 0;

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={onCancel} />

      <View style={s.promptWrap}>
        <View style={[s.promptGlass, s.promptGlass28]}>
          <BlurView
            // @ts-ignore
            style={{ position: "absolute", inset: 0 }}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            // @ts-ignore
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
          />
        </View>

        <View style={[s.promptInner, s.promptInner28]}>
          <Text style={s.promptTitle}>Filter history</Text>

          <Text style={s.inputLabel}>Task types</Text>
          <View style={s.chipRow}>
            {TYPE_OPTIONS.map(({ key, label }) => {
              const selected = types.includes(key);
              const tint = ACCENT_BY_TYPE[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => toggleType(key)}
                  style={[
                    s.chip,
                    {
                      // same glazed, borderless behaviour as Reminders filter
                      backgroundColor: selected
                        ? hexToRgba(tint, 0.22)
                        : "rgba(255,255,255,0.12)",
                    },
                  ]}
                >
                  <Text style={s.chipText}>{label.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={s.promptButtonsRow}>
            {isFilterActive && (
              <Pressable
                onPress={() => {
                  onClearAll();
                  setTypes([]);
                }}
                style={[s.promptBtn, s.promptDanger]}
              >
                <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>
                  Clear
                </Text>
              </Pressable>
            )}
            <Pressable onPress={onCancel} style={s.promptBtn}>
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onApply({ types })}
              style={[s.promptBtn, s.promptPrimary]}
            >
              <Text style={s.promptPrimaryText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
