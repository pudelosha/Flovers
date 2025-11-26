import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../../styles/home.styles";

export type HomeSortKey = "dueDate" | "plant" | "location";
export type HomeSortDir = "asc" | "desc";

type Props = {
  visible: boolean;
  sortKey: HomeSortKey;
  sortDir: HomeSortDir;
  onCancel: () => void;
  onApply: (key: HomeSortKey, dir: HomeSortDir) => void;
  onReset?: () => void;
};

export default function SortHomeTasksModal({
  visible,
  sortKey,
  sortDir,
  onCancel,
  onApply,
  onReset,
}: Props) {
  const [keyOpen, setKeyOpen] = React.useState(false);
  const [dirOpen, setDirOpen] = React.useState(false);
  const [k, setK] = React.useState<HomeSortKey>(sortKey);
  const [d, setD] = React.useState<HomeSortDir>(sortDir);

  React.useEffect(() => {
    if (visible) {
      setK(sortKey);
      setD(sortDir);
      setKeyOpen(false);
      setDirOpen(false);
    }
  }, [visible, sortKey, sortDir]);

  if (!visible) return null;

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
          <Text style={s.promptTitle}>Sort tasks</Text>

          {/* Sort key dropdown */}
          <Text style={s.inputLabel}>Sort by</Text>
          <View style={s.dropdown}>
            <Pressable
              style={[s.dropdownHeader, styles.ddHeaderFlat]}
              onPress={() => {
                setDirOpen(false);
                setKeyOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>
                {k === "dueDate" ? "Due date" : k === "plant" ? "Plant name" : "Location"}
              </Text>
              <MaterialCommunityIcons
                name={keyOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {keyOpen && (
              <View style={[s.dropdownList, styles.ddListFlat]}>
                {([
                  { key: "dueDate", label: "Due date" },
                  { key: "plant", label: "Plant name" },
                  { key: "location", label: "Location" },
                ] as const).map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[s.dropdownItem, styles.ddItemFlat]}
                    onPress={() => {
                      setK(opt.key);
                      setKeyOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{opt.label}</Text>
                    {k === opt.key && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Direction dropdown */}
          <Text style={s.inputLabel}>Direction</Text>
          <View style={s.dropdown}>
            <Pressable
              style={[s.dropdownHeader, styles.ddHeaderFlat]}
              onPress={() => {
                setKeyOpen(false);
                setDirOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>{d === "asc" ? "Ascending" : "Descending"}</Text>
              <MaterialCommunityIcons
                name={dirOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {dirOpen && (
              <View style={[s.dropdownList, styles.ddListFlat]}>
                {([
                  { key: "asc", label: "Ascending" },
                  { key: "desc", label: "Descending" },
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
              <Pressable onPress={onReset} style={[styles.btnBase, styles.btnDanger]}>
                <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>
                  Reset
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onCancel} style={[styles.btnBase]}>
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onApply(k, d)}
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
  btnBase: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  btnPrimary: { backgroundColor: "rgba(11,114,133,0.92)" },
  btnDanger: { backgroundColor: "rgba(255,107,107,0.22)" },
});
