import React from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { s } from "../../styles/task-history.styles";

export type HistorySortKey = "completedAt" | "plant" | "location";
export type HistorySortDir = "asc" | "desc";

type Props = {
  visible: boolean;
  sortKey: HistorySortKey;
  sortDir: HistorySortDir;
  onCancel: () => void;
  onApply: (key: HistorySortKey, dir: HistorySortDir) => void;
  onReset?: () => void;
};

export default function SortHistoryTasksModal({
  visible,
  sortKey,
  sortDir,
  onCancel,
  onApply,
  onReset,
}: Props) {
  const { t } = useTranslation();

  const [keyOpen, setKeyOpen] = React.useState(false);
  const [dirOpen, setDirOpen] = React.useState(false);
  const [k, setK] = React.useState<HistorySortKey>(sortKey);
  const [d, setD] = React.useState<HistorySortDir>(sortDir);

  React.useEffect(() => {
    if (visible) {
      setK(sortKey);
      setD(sortDir);
      setKeyOpen(false);
      setDirOpen(false);
    }
  }, [visible, sortKey, sortDir]);

  if (!visible) return null;

  const sortKeyLabel =
    k === "completedAt"
      ? t("taskHistoryModals.sort.keys.completedAt")
      : k === "plant"
        ? t("taskHistoryModals.sort.keys.plant")
        : t("taskHistoryModals.sort.keys.location");

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
          <Text style={s.promptTitle}>{t("taskHistoryModals.sort.title")}</Text>

          {/* Sort key dropdown */}
          <Text style={s.inputLabel}>{t("taskHistoryModals.sort.sortByLabel")}</Text>
          <View style={s.dropdown}>
            <Pressable
              style={[s.dropdownHeader, s.flatDropdownHeader]}
              onPress={() => {
                setDirOpen(false);
                setKeyOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>{sortKeyLabel}</Text>
              <MaterialCommunityIcons
                name={keyOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {keyOpen && (
              <View style={[s.dropdownList, s.flatDropdownList]}>
                {([
                  { key: "completedAt", label: t("taskHistoryModals.sort.keys.completedAt") },
                  { key: "plant", label: t("taskHistoryModals.sort.keys.plant") },
                  { key: "location", label: t("taskHistoryModals.sort.keys.location") },
                ] as const).map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[s.dropdownItem, s.flatDropdownItem]}
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
          <Text style={s.inputLabel}>{t("taskHistoryModals.sort.directionLabel")}</Text>
          <View style={s.dropdown}>
            <Pressable
              style={[s.dropdownHeader, s.flatDropdownHeader]}
              onPress={() => {
                setKeyOpen(false);
                setDirOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>
                {d === "asc"
                  ? t("taskHistoryModals.sort.directions.asc")
                  : t("taskHistoryModals.sort.directions.desc")}
              </Text>
              <MaterialCommunityIcons
                name={dirOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {dirOpen && (
              <View style={[s.dropdownList, s.flatDropdownList]}>
                {([
                  { key: "asc", label: t("taskHistoryModals.sort.directions.asc") },
                  { key: "desc", label: t("taskHistoryModals.sort.directions.desc") },
                ] as const).map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[s.dropdownItem, s.flatDropdownItem]}
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
              <Pressable onPress={onReset} style={[s.promptBtn, s.promptDanger]}>
                <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>
                  {t("taskHistoryModals.sort.reset")}
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onCancel} style={s.promptBtn}>
              <Text style={s.promptBtnText}>{t("taskHistoryModals.common.cancel")}</Text>
            </Pressable>
            <Pressable onPress={() => onApply(k, d)} style={[s.promptBtn, s.promptPrimary]}>
              <Text style={s.promptPrimaryText}>{t("taskHistoryModals.common.apply")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
