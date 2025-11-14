import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/task-history.styles";

export type HistorySortDir = "asc" | "desc";

type Props = {
  visible: boolean;
  sortDir: HistorySortDir;
  onCancel: () => void;
  onApply: (dir: HistorySortDir) => void;
  onReset?: () => void;
};

export default function SortHistoryTasksModal({
  visible,
  sortDir,
  onCancel,
  onApply,
  onReset,
}: Props) {
  const [dirOpen, setDirOpen] = React.useState(false);
  const [d, setD] = React.useState<HistorySortDir>(sortDir);

  React.useEffect(() => {
    if (visible) {
      setD(sortDir);
      setDirOpen(false);
    }
  }, [visible, sortDir]);

  if (!visible) return null;

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
          <Text style={s.promptTitle}>Sort history</Text>

          <Text style={s.inputLabel}>Direction</Text>
          <View style={s.dropdown}>
            <Pressable
              style={[s.dropdownHeader, styles.ddHeaderFlat]}
              onPress={() => setDirOpen((o) => !o)}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>
                {d === "asc" ? "Oldest first" : "Most recent first"}
              </Text>
              <MaterialCommunityIcons
                name={dirOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {dirOpen && (
              <View style={[s.dropdownList, styles.ddListFlat]}>
                {([
                  { key: "desc", label: "Most recent first" },
                  { key: "asc", label: "Oldest first" },
                ] as const).map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[s.dropdownItem, styles.ddItemFlat]}
                    onPress={() => {
                      setD(opt.key);
                      setDirOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{opt.label}</Text>
                    {d === opt.key && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={s.promptButtonsRow}>
            {onReset ? (
              <Pressable
                onPress={onReset}
                style={[s.promptBtn, s.promptDanger]}
              >
                <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>
                  Reset
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onCancel} style={s.promptBtn}>
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onApply(d)}
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

const styles = StyleSheet.create({
  ddHeaderFlat: {
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  ddListFlat: {
    borderWidth: 0,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  ddItemFlat: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
