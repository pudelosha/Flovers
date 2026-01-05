import React, { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";
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
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string) => {
      void currentLanguage;
      const txt = t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

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
            style={{ position: "absolute", inset: 0 } as any}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            } as any}
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>
            {tr("plantsModals.sort.title", "Sort plants")}
          </Text>

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
              <Text style={s.dropdownValue}>
                {k === "plant"
                  ? tr("plantsModals.sort.keyPlant", "Plant name")
                  : tr("plantsModals.sort.keyLocation", "Location")}
              </Text>
              <MaterialCommunityIcons
                name={keyOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {keyOpen && (
              <View style={s.dropdownList}>
                {([
                  { key: "plant", labelKey: "plantsModals.sort.keyPlant", fallback: "Plant name" },
                  { key: "location", labelKey: "plantsModals.sort.keyLocation", fallback: "Location" },
                ] as const).map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={s.dropdownItem}
                    onPress={() => {
                      setK(opt.key);
                      setKeyOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{tr(opt.labelKey, opt.fallback)}</Text>
                    {k === opt.key && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
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
              <Text style={s.dropdownValue}>
                {d === "asc"
                  ? tr("plantsModals.sort.dirAsc", "Ascending")
                  : tr("plantsModals.sort.dirDesc", "Descending")}
              </Text>
              <MaterialCommunityIcons
                name={dirOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {dirOpen && (
              <View style={s.dropdownList}>
                {([
                  { key: "asc", labelKey: "plantsModals.sort.dirAsc", fallback: "Ascending" },
                  { key: "desc", labelKey: "plantsModals.sort.dirDesc", fallback: "Descending" },
                ] as const).map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={s.dropdownItem}
                    onPress={() => {
                      setD(opt.key);
                      setDirOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{tr(opt.labelKey, opt.fallback)}</Text>
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
              <Pressable onPress={onReset} style={[s.promptBtn, s.promptDanger]}>
                <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>
                  {tr("plantsModals.common.reset", "Reset")}
                </Text>
              </Pressable>
            ) : null}

            <Pressable onPress={onCancel} style={s.promptBtn}>
              <Text style={s.promptBtnText}>
                {tr("plantsModals.common.cancel", "Cancel")}
              </Text>
            </Pressable>

            <Pressable onPress={() => onApply(k, d)} style={[s.promptBtn, s.promptPrimary]}>
              <Text style={s.promptPrimaryText}>
                {tr("plantsModals.common.apply", "Apply")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
