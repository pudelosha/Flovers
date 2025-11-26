import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";
import { s } from "../../styles/plants.styles";

export type SortKey = "plant" | "location";
export type SortDir = "asc" | "desc";

type Props = {
  visible: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  onCancel: () => void;
  onApply: (key: SortKey, dir: SortDir) => void;
  onReset?: () => void;
};

export default function SortPlantsModal({
  visible,
  sortKey,
  sortDir,
  onCancel,
  onApply,
  onReset,
}: Props) {
  const [keyOpen, setKeyOpen] = React.useState(false);
  const [dirOpen, setDirOpen] = React.useState(false);
  const [k, setK] = React.useState<SortKey>(sortKey);
  const [d, setD] = React.useState<SortDir>(sortDir);

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
        <View style={s.promptGlass}>
          <BlurView
            style={{ position: "absolute", inset: 0 } as any
            }
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          {/* Dark overlay — no white tint, no border */}
          <View
            pointerEvents="none"
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" } as any}
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>Sort plants</Text>

          {/* Sort key */}
          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setDirOpen(false);
                setKeyOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>{k === "plant" ? "Plant name" : "Location"}</Text>
              <MaterialCommunityIcons name={keyOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
            </Pressable>
            {keyOpen && (
              <View style={s.dropdownList}>
                {([
                  { key: "plant", label: "Plant name" },
                  { key: "location", label: "Location" },
                ] as const).map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={s.dropdownItem}
                    onPress={() => {
                      setK(opt.key);
                      setKeyOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{opt.label}</Text>
                    {k === opt.key && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Direction */}
          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setKeyOpen(false);
                setDirOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>{d === "asc" ? "Ascending" : "Descending"}</Text>
              <MaterialCommunityIcons name={dirOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
            </Pressable>
            {dirOpen && (
              <View style={s.dropdownList}>
                {([
                  { key: "asc", label: "Ascending" },
                  { key: "desc", label: "Descending" },
                ] as const).map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={s.dropdownItem}
                    onPress={() => {
                      setD(opt.key);
                      setDirOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{opt.label}</Text>
                    {d === opt.key && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={s.promptButtonsRow}>
            {onReset ? (
              <Pressable onPress={onReset} style={[s.promptBtn, s.promptDanger]}>
                <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>Reset</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onCancel} style={s.promptBtn}>
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => onApply(k, d)} style={[s.promptBtn, s.promptPrimary]}>
              <Text style={s.promptPrimaryText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
