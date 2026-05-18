import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useTranslation } from "react-i18next";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

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

function Dropdown({
  label,
  value,
  options,
  open,
  onToggle,
  onSelect,
}: {
  label: string;
  value: string;
  options: ApiReadingsDeleteOption[];
  open: boolean;
  onToggle: () => void;
  onSelect: (value: string) => void;
}) {
  const selected = options.find((option) => option.key === value);

  return (
    <View style={modalStyles.dropdown}>
      <Text style={modalStyles.inputLabel}>{label}</Text>
      <Pressable style={modalStyles.dropdownHeader} onPress={onToggle}>
        <Text style={modalStyles.dropdownValue}>
          {selected?.label || "-"}
        </Text>
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color="#FFFFFF"
        />
      </Pressable>
      {open && (
        <View style={modalStyles.dropdownList}>
          {options.map((option) => (
            <Pressable
              key={option.key}
              style={modalStyles.dropdownItem}
              onPress={() => onSelect(option.key)}
            >
              <Text style={modalStyles.dropdownItemText}>{option.label}</Text>
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
  const [mode, setMode] = useState<Mode>("day");
  const [openDropdown, setOpenDropdown] = useState<Mode | null>(null);
  const [day, setDay] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [month, setMonth] = useState("");
  const [olderThanDays, setOlderThanDays] = useState(90);
  const [selectedTypes, setSelectedTypes] = useState<MetricType[]>([]);

  const availableTypes = useMemo(
    () => TYPE_ORDER.filter((type) => options?.types.includes(type)),
    [options]
  );

  useEffect(() => {
    if (!visible || !options) return;
    setMode("day");
    setOpenDropdown(null);
    setDay(options.days[0]?.key || "");
    setWeekStart(options.weeks[0]?.key || "");
    setMonth(options.months[0]?.key || "");
    setOlderThanDays(90);
    setSelectedTypes(options.types.length ? [options.types[0]] : []);
  }, [options, visible]);

  const modeOptions: Array<{ key: Mode; label: string; icon: string }> = [
    { key: "day", label: t("readingsHistory.deleteModal.modeDay"), icon: "calendar-today" },
    { key: "week", label: t("readingsHistory.deleteModal.modeWeek"), icon: "calendar-week" },
    { key: "month", label: t("readingsHistory.deleteModal.modeMonth"), icon: "calendar-month" },
    { key: "types", label: t("readingsHistory.deleteModal.modeTypes"), icon: "shape-outline" },
    { key: "olderThan", label: t("readingsHistory.deleteModal.modeOlderThan"), icon: "calendar-clock" },
  ];

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

  const confirm = () => {
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.card}>
          <LinearGradient
            colors={["rgba(21,71,58,0.98)", "rgba(10,36,31,0.98)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={modalStyles.title}>{t("readingsHistory.deleteModal.title")}</Text>
          <Text style={modalStyles.description}>
            {t("readingsHistory.deleteModal.description")}
          </Text>

          <ScrollView style={modalStyles.body} contentContainerStyle={modalStyles.bodyContent}>
            {modeOptions.map((option) => (
              <Pressable
                key={option.key}
                style={modalStyles.radioRow}
                onPress={() => {
                  setMode(option.key);
                  setOpenDropdown(null);
                }}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={18}
                  color="#FFFFFF"
                  style={modalStyles.radioIcon}
                />
                <Text style={modalStyles.radioText}>{option.label}</Text>
                <View style={modalStyles.radioOuter}>
                  {mode === option.key && <View style={modalStyles.radioInner} />}
                </View>
              </Pressable>
            ))}

            {mode === "day" && (
              <Dropdown
                label={t("readingsHistory.deleteModal.selectDay")}
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

            {mode === "week" && (
              <Dropdown
                label={t("readingsHistory.deleteModal.selectWeek")}
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

            {mode === "month" && (
              <Dropdown
                label={t("readingsHistory.deleteModal.selectMonth")}
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

            {mode === "types" && (
              <View>
                <Text style={modalStyles.inputLabel}>
                  {t("readingsHistory.deleteModal.selectTypes")}
                </Text>
                <View style={modalStyles.chipRow}>
                  {availableTypes.map((type) => {
                    const selected = selectedTypes.includes(type);
                    return (
                      <Pressable
                        key={type}
                        style={[modalStyles.chip, selected && modalStyles.chipSelected]}
                        onPress={() => toggleType(type)}
                      >
                        <Text style={modalStyles.chipText}>
                          {t(`readingsHistory.metric.${type}Short`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {!availableTypes.length && (
                    <Text style={modalStyles.emptyText}>
                      {t("readingsHistory.deleteModal.noTypes")}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {mode === "olderThan" && (
              <Dropdown
                label={t("readingsHistory.deleteModal.selectOlderThan")}
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
          </ScrollView>

          <View style={modalStyles.buttonsRow}>
            <Pressable style={modalStyles.button} onPress={onCancel}>
              <Text style={modalStyles.buttonText}>{t("readingsHistory.deleteModal.cancel")}</Text>
            </Pressable>
            <Pressable
              style={[modalStyles.button, modalStyles.dangerButton, !canConfirm && modalStyles.disabledButton]}
              disabled={!canConfirm}
              onPress={confirm}
            >
              <Text style={modalStyles.buttonText}>{t("readingsHistory.deleteModal.delete")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "86%",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 6,
  },
  description: {
    color: "rgba(255,255,255,0.82)",
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  body: {
    maxHeight: 430,
  },
  bodyContent: {
    paddingBottom: 8,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 10,
  },
  radioIcon: {
    width: 22,
  },
  radioText: {
    flex: 1,
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  inputLabel: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "800",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 6,
    marginHorizontal: 16,
  },
  dropdown: {
    marginBottom: 10,
  },
  dropdownHeader: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dropdownValue: {
    flex: 1,
    color: "#FFFFFF",
    fontWeight: "800",
    marginRight: 12,
  },
  dropdownList: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
  },
  dropdownItemText: {
    flex: 1,
    color: "#FFFFFF",
    fontWeight: "700",
    marginRight: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  chipSelected: {
    backgroundColor: "rgba(11,114,133,0.92)",
  },
  chipText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
  emptyText: {
    color: "rgba(255,255,255,0.82)",
    fontWeight: "700",
    fontSize: 12,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 6,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dangerButton: {
    backgroundColor: "rgba(255,107,107,0.28)",
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
