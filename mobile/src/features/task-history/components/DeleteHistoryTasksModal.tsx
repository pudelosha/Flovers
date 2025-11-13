import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/task-history.styles";

export type HistoryDeleteMode = "plant" | "location" | "olderThan";

export type HistoryDeletePayload =
  | { mode: "plant" }
  | { mode: "location" }
  | { mode: "olderThan"; days: number };

type Props = {
  visible: boolean;
  hasPlantScope: boolean;
  hasLocationScope: boolean;
  onCancel: () => void;
  onConfirm: (payload: HistoryDeletePayload) => void;
};

const DAYS_OPTIONS = [30, 60, 180];

export default function DeleteHistoryTasksModal({
  visible,
  hasPlantScope,
  hasLocationScope,
  onCancel,
  onConfirm,
}: Props) {
  const [mode, setMode] = React.useState<HistoryDeleteMode>("olderThan");
  const [daysOpen, setDaysOpen] = React.useState(false);
  const [days, setDays] = React.useState<number>(30);

  React.useEffect(() => {
    if (visible) {
      setMode("olderThan");
      setDays(30);
      setDaysOpen(false);
    }
  }, [visible]);

  if (!visible) return null;

  const canConfirm =
    mode === "olderThan" ||
    (mode === "plant" && hasPlantScope) ||
    (mode === "location" && hasLocationScope);

  const handleConfirm = () => {
    if (!canConfirm) return;
    if (mode === "olderThan") {
      onConfirm({ mode: "olderThan", days });
    } else {
      onConfirm({ mode });
    }
  };

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
          <Text style={s.promptTitle}>Delete history</Text>

          <Text style={s.inputLabel}>Scope</Text>

          {/* Delete for selected plant */}
          <Pressable
            style={[s.radioRow, !hasPlantScope && styles.disabledRow]}
            disabled={!hasPlantScope}
            onPress={() => setMode("plant")}
          >
            <View style={s.radioOuter}>
              {mode === "plant" && hasPlantScope && <View style={s.radioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.emptyText}>Delete for selected plant</Text>
              {!hasPlantScope && (
                <Text style={styles.helperText}>
                  No plant is currently selected on this screen.
                </Text>
              )}
            </View>
          </Pressable>

          {/* Delete for selected location */}
          <Pressable
            style={[s.radioRow, !hasLocationScope && styles.disabledRow]}
            disabled={!hasLocationScope}
            onPress={() => setMode("location")}
          >
            <View style={s.radioOuter}>
              {mode === "location" && hasLocationScope && <View style={s.radioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.emptyText}>Delete for selected location</Text>
              {!hasLocationScope && (
                <Text style={styles.helperText}>
                  No location is currently selected on this screen.
                </Text>
              )}
            </View>
          </Pressable>

          {/* Delete older than */}
          <Pressable
            style={s.radioRow}
            onPress={() => setMode("olderThan")}
          >
            <View style={s.radioOuter}>
              {mode === "olderThan" && <View style={s.radioInner} />}
            </View>
            <Text style={s.emptyText}>Delete tasks older than</Text>
          </Pressable>

          {/* Days dropdown */}
          <View style={[s.dropdown, { marginTop: 8 }]}>
            <Pressable
              style={[
                s.dropdownHeader,
                styles.ddHeaderFlat,
                mode !== "olderThan" && { opacity: 0.6 },
              ]}
              onPress={() => {
                if (mode !== "olderThan") return;
                setDaysOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>{days} days</Text>
              <MaterialCommunityIcons
                name={daysOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {daysOpen && (
              <View style={[s.dropdownList, styles.ddListFlat]}>
                {DAYS_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt}
                    style={[s.dropdownItem, styles.ddItemFlat]}
                    onPress={() => {
                      setDays(opt);
                      setDaysOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{opt} days</Text>
                    {days === opt && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={[s.promptButtonsRow, { marginTop: 18 }]}>
            <Pressable onPress={onCancel} style={s.promptBtn}>
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={[
                s.promptBtn,
                s.promptDanger,
                !canConfirm && { opacity: 0.5 },
              ]}
              disabled={!canConfirm}
            >
              <Text style={[s.promptPrimaryText, { color: "#FF6B6B", fontWeight: "800" }]}>
                Delete
              </Text>
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
  helperText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  disabledRow: {
    opacity: 0.55,
  },
});
