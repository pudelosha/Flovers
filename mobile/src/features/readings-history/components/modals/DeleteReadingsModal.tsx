import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import ModalCloseButton from "../../../../shared/ui/ModalCloseButton";
import { ICON_BG } from "../../../readings/constants/readings.constants";
import { s } from "../../styles/readings-history.styles";
import type {
  ApiReadingsDeleteOption,
  ApiReadingsDeleteOptions,
  ReadingsBulkDeleteRequest,
} from "../../../../api/services/readings.service";

type MetricType = "temperature" | "humidity" | "light" | "moisture";
type Mode = "day" | "week" | "month" | "types" | "olderThan";

type Props = {
  visible: boolean;
  deviceId: number | null;
  options: ApiReadingsDeleteOptions | null;
  onCancel: () => void;
  onConfirm: (payload: ReadingsBulkDeleteRequest) => void;
};

const OLDER_THAN_OPTIONS = [30, 60, 90, 180, 365];
const TYPE_ORDER: MetricType[] = ["temperature", "humidity", "light", "moisture"];
const TYPE_ICONS: Record<MetricType, string> = {
  temperature: "thermometer",
  humidity: "water-percent",
  light: "white-balance-sunny",
  moisture: "water",
};

function Dropdown({
  value,
  options,
  open,
  onToggle,
  onSelect,
}: {
  value: string;
  options: ApiReadingsDeleteOption[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  const selected = options.find((option) => option.key === value);

  return (
    <View style={[s.dropdown, { marginTop: 4 }]}>
      <Pressable
        style={[s.dropdownHeader, s.flatDropdownHeader]}
        onPress={onToggle}
        android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      >
        <Text style={s.dropdownValue}>{selected?.label || "-"}</Text>
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color="#FFFFFF"
        />
      </Pressable>

      {open && (
        <View style={[s.dropdownList, s.flatDropdownList]}>
          {options.map((option) => (
            <Pressable
              key={option.key}
              style={[s.dropdownItem, s.flatDropdownItem]}
              onPress={() => onSelect(option.key)}
            >
              <Text style={s.dropdownItemText}>{option.label}</Text>
              {option.key === value && (
                <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function DeleteReadingsModal({
  visible,
  deviceId,
  options,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = React.useState<Mode>("day");
  const [openDropdown, setOpenDropdown] = React.useState<Mode | null>(null);
  const [day, setDay] = React.useState("");
  const [weekStart, setWeekStart] = React.useState("");
  const [month, setMonth] = React.useState("");
  const [olderThanDays, setOlderThanDays] = React.useState(90);
  const [selectedTypes, setSelectedTypes] = React.useState<MetricType[]>([]);

  React.useEffect(() => {
    if (!visible || !options) return;
    setMode("day");
    setOpenDropdown(null);
    setDay(options.days[0]?.key || "");
    setWeekStart(options.weeks[0]?.key || "");
    setMonth(options.months[0]?.key || "");
    setOlderThanDays(90);
    setSelectedTypes(options.types.length ? [options.types[0]] : []);
  }, [options, visible]);

  if (!visible) return null;

  const availableTypes = TYPE_ORDER.filter((type) => options?.types.includes(type));
  const hasDayScope = !!options?.days.length;
  const hasWeekScope = !!options?.weeks.length;
  const hasMonthScope = !!options?.months.length;
  const hasTypeScope = availableTypes.length > 0;

  const olderThanOptions = OLDER_THAN_OPTIONS.map((days) => ({
    key: String(days),
    label: t("readingsHistory.deleteModal.daysOption", { count: days }),
  }));

  const canConfirm =
    !!deviceId &&
    ((mode === "day" && !!day) ||
      (mode === "week" && !!weekStart) ||
      (mode === "month" && !!month) ||
      (mode === "types" && selectedTypes.length > 0) ||
      mode === "olderThan");

  const toggleType = (type: MetricType) => {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    );
  };

  const handleConfirm = () => {
    if (!deviceId || !canConfirm) return;

    if (mode === "day") {
      onConfirm({ deviceId, mode: "day", day });
    } else if (mode === "week") {
      onConfirm({ deviceId, mode: "week", weekStart });
    } else if (mode === "month") {
      onConfirm({ deviceId, mode: "month", month });
    } else if (mode === "types") {
      onConfirm({ deviceId, mode: "types", types: selectedTypes });
    } else {
      onConfirm({ deviceId, mode: "olderThan", days: olderThanDays });
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
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          />
        </View>

        <View
          style={[
            s.promptInner,
            s.promptInner28,
            {
              height: "86%",
              maxHeight: "86%",
              position: "relative",
            },
          ]}
        >
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingTop: 44,
              paddingBottom: 120,
            }}
          >
            <Text style={s.promptTitle}>{t("readingsHistory.deleteModal.title")}</Text>
            <Text style={s.promptDescription}>
              {t("readingsHistory.deleteModal.description")}
            </Text>

            <Text style={s.inputLabel}>{t("readingsHistory.deleteModal.scopeLabel")}</Text>

            <Pressable
              style={[s.radioRow, !hasDayScope && styles.disabledRow]}
              disabled={!hasDayScope}
              onPress={() => {
                setMode("day");
                setOpenDropdown(null);
              }}
            >
              <View style={s.radioOuter}>{mode === "day" && <View style={s.radioInner} />}</View>
              <Text style={s.modalOptionText}>{t("readingsHistory.deleteModal.modeDay")}</Text>
            </Pressable>
            {mode === "day" && hasDayScope && (
              <Dropdown
                value={day}
                options={options?.days || []}
                open={openDropdown === "day"}
                onToggle={() => setOpenDropdown(openDropdown === "day" ? null : "day")}
                onSelect={(value) => {
                  setDay(value);
                  setOpenDropdown(null);
                }}
              />
            )}

            <Pressable
              style={[s.radioRow, !hasWeekScope && styles.disabledRow]}
              disabled={!hasWeekScope}
              onPress={() => {
                setMode("week");
                setOpenDropdown(null);
              }}
            >
              <View style={s.radioOuter}>{mode === "week" && <View style={s.radioInner} />}</View>
              <Text style={s.modalOptionText}>{t("readingsHistory.deleteModal.modeWeek")}</Text>
            </Pressable>
            {mode === "week" && hasWeekScope && (
              <Dropdown
                value={weekStart}
                options={options?.weeks || []}
                open={openDropdown === "week"}
                onToggle={() => setOpenDropdown(openDropdown === "week" ? null : "week")}
                onSelect={(value) => {
                  setWeekStart(value);
                  setOpenDropdown(null);
                }}
              />
            )}

            <Pressable
              style={[s.radioRow, !hasMonthScope && styles.disabledRow]}
              disabled={!hasMonthScope}
              onPress={() => {
                setMode("month");
                setOpenDropdown(null);
              }}
            >
              <View style={s.radioOuter}>{mode === "month" && <View style={s.radioInner} />}</View>
              <Text style={s.modalOptionText}>{t("readingsHistory.deleteModal.modeMonth")}</Text>
            </Pressable>
            {mode === "month" && hasMonthScope && (
              <Dropdown
                value={month}
                options={options?.months || []}
                open={openDropdown === "month"}
                onToggle={() => setOpenDropdown(openDropdown === "month" ? null : "month")}
                onSelect={(value) => {
                  setMonth(value);
                  setOpenDropdown(null);
                }}
              />
            )}

            <Pressable
              style={[s.radioRow, !hasTypeScope && styles.disabledRow]}
              disabled={!hasTypeScope}
              onPress={() => {
                setMode("types");
                setOpenDropdown(null);
              }}
            >
              <View style={s.radioOuter}>{mode === "types" && <View style={s.radioInner} />}</View>
              <Text style={s.modalOptionText}>{t("readingsHistory.deleteModal.modeTypes")}</Text>
            </Pressable>
            {mode === "types" && hasTypeScope && (
              <View style={[s.chipRow, styles.chipGrid]}>
                {availableTypes.map((type) => {
                  const selected = selectedTypes.includes(type);
                  const color = ICON_BG[type];

                  return (
                    <Pressable
                      key={type}
                      onPress={() => toggleType(type)}
                      style={[
                        s.chip,
                        styles.typeChip,
                        {
                          backgroundColor: color,
                          opacity: selected ? 1 : 0.45,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={TYPE_ICONS[type] as any}
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={s.chipText}>
                        {t(`readingsHistory.metric.${type}Short`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Pressable
              style={s.radioRow}
              onPress={() => {
                setMode("olderThan");
                setOpenDropdown(null);
              }}
            >
              <View style={s.radioOuter}>
                {mode === "olderThan" && <View style={s.radioInner} />}
              </View>
              <Text style={s.modalOptionText}>
                {t("readingsHistory.deleteModal.modeOlderThan")}
              </Text>
            </Pressable>
            {mode === "olderThan" && (
              <Dropdown
                value={String(olderThanDays)}
                options={olderThanOptions}
                open={openDropdown === "olderThan"}
                onToggle={() =>
                  setOpenDropdown(openDropdown === "olderThan" ? null : "olderThan")
                }
                onSelect={(value) => {
                  setOlderThanDays(Number(value));
                  setOpenDropdown(null);
                }}
              />
            )}

            <View style={[s.promptButtonsRow, { marginTop: 18 }]}>
              <Pressable onPress={onCancel} style={s.promptBtn}>
                <Text style={s.promptBtnText}>{t("readingsHistory.deleteModal.cancel")}</Text>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                style={[s.promptBtn, s.promptDanger, !canConfirm && { opacity: 0.5 }]}
                disabled={!canConfirm}
              >
                <Text style={[s.promptPrimaryText, styles.deleteText]}>
                  {t("readingsHistory.deleteModal.delete")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <ModalCloseButton
            onPress={onCancel}
            accessibilityLabel={t("readingsHistory.deleteModal.close", "Close")}
            style={{
              top: 8,
              right: 8,
            }}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  disabledRow: {
    opacity: 0.55,
  },
  chipGrid: {
    marginTop: 4,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    rowGap: 10,
    columnGap: 10,
  },
  typeChip: {
    width: "48%",
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 0,
  },
  deleteText: {
    color: "#FF6B6B",
    fontWeight: "800",
  },
});
