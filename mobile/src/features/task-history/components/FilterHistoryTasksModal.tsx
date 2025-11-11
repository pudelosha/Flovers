import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { s } from "../styles/task-history.styles";
import type { TaskType } from "../../home/types/home.types";

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
        <View style={[s.promptGlass, styles.promptGlass28]}>
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

        <View style={[s.promptInner, styles.promptInner28]}>
          <Text style={s.promptTitle}>Filter history</Text>

          <Text style={s.inputLabel}>Task types</Text>
          <View style={s.chipRow}>
            {TYPE_OPTIONS.map(({ key, label }) => {
              const active = types.includes(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => toggleType(key)}
                  style={[s.chip, active && s.chipSelected]}
                >
                  <Text style={s.chipText}>{label}</Text>
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
                style={[styles.btnBase, styles.btnDanger]}
              >
                <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>
                  Clear
                </Text>
              </Pressable>
            )}
            <Pressable onPress={onCancel} style={[styles.btnBase]}>
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onApply({ types })}
              style={[styles.btnBase, styles.btnPrimary]}
            >
              <Text style={s.promptPrimaryText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  promptGlass28: { borderRadius: 28 },
  promptInner28: { borderRadius: 28 },
  btnBase: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  btnPrimary: { backgroundColor: "rgba(11,114,133,0.92)" },
  btnDanger: { backgroundColor: "rgba(255,107,107,0.22)" },
});
