import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  Platform,
  ScrollView,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../../styles/reminders.styles";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";
import { useSettings } from "../../../../app/providers/SettingsProvider";
import {
  ACCENT_BY_TYPE,
  ICON_BY_TYPE,
} from "../../constants/reminders.constants";

export type ReminderType =
  | "watering"
  | "moisture"
  | "fertilising"
  | "care"
  | "repot";

let DateTimePicker: any = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {}

type PlantOption = { id: string; name: string; location?: string };

type Props = {
  visible: boolean;
  mode?: "create" | "edit";
  plants: PlantOption[];

  fType: ReminderType;
  setFType: (t: ReminderType) => void;

  fPlantId?: string;
  setFPlantId: (id?: string) => void;

  fDueDate: string; // "YYYY-MM-DD"
  setFDueDate: (v: string) => void;

  fIntervalValue?: number;
  setFIntervalValue: (n?: number) => void;

  fIntervalUnit: "days" | "months";
  setFIntervalUnit: (u: "days" | "months") => void;

  onCancel: () => void;
  onSave: () => void;
};

const TYPE_OPTIONS: ReminderType[] = [
  "watering",
  "moisture",
  "fertilising",
  "care",
  "repot",
];

function unitForType(t: ReminderType): "days" | "months" {
  return t === "repot" ? "months" : "days";
}

function getSelectedPlant(plants: PlantOption[], id?: string) {
  if (!id) return undefined;
  return plants.find((p) => p.id === id);
}

function isValidDateYYYYMMDD(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v);
  if (isNaN(+d)) return false;
  const [Y, M, D] = v.split("-").map(Number);
  return (
    d.getUTCFullYear() === Y &&
    d.getUTCMonth() + 1 === M &&
    d.getUTCDate() === D
  );
}

function toYYYYMMDD(d: Date) {
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

function formatISOForDisplay(iso: string, settings?: any) {
  if (!isValidDateYYYYMMDD(iso)) return iso;

  const [yyyy, mm, dd] = iso.split("-");
  const fmt = settings?.dateFormat;

  if (fmt === "mdy" || fmt === "MM/DD/YYYY" || fmt === "MM-DD-YYYY") {
    const sep = fmt === "MM-DD-YYYY" ? "-" : "/";
    return `${mm}${sep}${dd}${sep}${yyyy}`;
  }

  if (fmt === "ymd" || fmt === "YYYY-MM-DD" || fmt === "YYYY/MM/DD") {
    const sep = fmt === "YYYY/MM/DD" ? "/" : "-";
    return `${yyyy}${sep}${mm}${sep}${dd}`;
  }

  if (fmt === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  if (fmt === "DD-MM-YYYY") return `${dd}-${mm}-${yyyy}`;

  return `${dd}.${mm}.${yyyy}`;
}

export default function EditReminderModal(props: Props) {
  const {
    visible,
    mode = "edit",
    plants,
    fType,
    setFType,
    fPlantId,
    setFPlantId,
    fDueDate,
    setFDueDate,
    fIntervalValue,
    setFIntervalValue,
    fIntervalUnit,
    setFIntervalUnit,
    onCancel,
    onSave,
  } = props;

  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const [typeOpen, setTypeOpen] = useState(false);
  const [plantOpen, setPlantOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const u = unitForType(fType);
    if (u !== fIntervalUnit) setFIntervalUnit(u);
  }, [fType, fIntervalUnit, setFIntervalUnit]);

  useEffect(() => {
    if (visible) {
      setTypeOpen(false);
      setPlantOpen(false);
      setShowDatePicker(false);
    }
  }, [visible]);

  const selectedPlant = getSelectedPlant(plants, fPlantId);
  const location = selectedPlant?.location;

  const canSave =
    !!fType &&
    !!fPlantId &&
    !!fDueDate &&
    isValidDateYYYYMMDD(fDueDate) &&
    !!fIntervalValue &&
    fIntervalValue > 0;

  const dateDisplay = useMemo(
    () =>
      fDueDate && isValidDateYYYYMMDD(fDueDate)
        ? formatISOForDisplay(fDueDate, settings)
        : "",
    [fDueDate, settings]
  );

  if (!visible) return null;

  const typeLabel = (rt: ReminderType) =>
    tr(
      `reminders.types.${rt}`,
      rt === "fertilising"
        ? "Fertilising"
        : rt.charAt(0).toUpperCase() + rt.slice(1)
    );

  const unitLabel = (u: "days" | "months") => tr(`reminders.units.${u}`, u);

  const selectedTypeTint = ACCENT_BY_TYPE[fType];
  const selectedTypeIcon = ICON_BY_TYPE[fType];

  return (
    <>
      <Pressable
        style={s.promptBackdrop}
        onPress={() => {
          Keyboard.dismiss();
          onCancel();
        }}
      />

      <View style={s.promptWrap}>
        <View style={s.promptGlass}>
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

        <View style={[s.promptInner, { maxHeight: "86%" }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
          >
            <Text style={s.promptTitle}>
              {mode === "create"
                ? tr("remindersModals.edit.titleCreate", "Add reminder")
                : tr("remindersModals.edit.titleEdit", "Edit reminder")}
            </Text>

            {/* Type */}
            <Text style={s.inputLabel}>
              {tr("remindersModals.edit.typeLabel", "Type")}
            </Text>
            <View style={s.dropdown}>
              <Pressable
                style={s.dropdownHeader}
                onPress={() => {
                  setPlantOpen(false);
                  setShowDatePicker(false);
                  setTypeOpen((o) => !o);
                }}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <MaterialCommunityIcons
                    name={selectedTypeIcon}
                    size={18}
                    color={selectedTypeTint}
                  />
                  <Text
                    style={[s.dropdownValue, { color: selectedTypeTint, flexShrink: 1 }]}
                    numberOfLines={1}
                  >
                    {typeLabel(fType)}
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name={typeOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#FFFFFF"
                />
              </Pressable>

              {typeOpen && (
                <View style={s.dropdownList}>
                  {TYPE_OPTIONS.map((opt) => {
                    const tint = ACCENT_BY_TYPE[opt];
                    const icon = ICON_BY_TYPE[opt];
                    const selected = fType === opt;

                    return (
                      <Pressable
                        key={opt}
                        style={s.dropdownItem}
                        onPress={() => {
                          setFType(opt);
                          setTypeOpen(false);
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <MaterialCommunityIcons
                            name={icon}
                            size={18}
                            color={tint}
                          />
                          <Text
                            style={[
                              s.dropdownItemText,
                              { color: selected ? tint : "#FFFFFF", flexShrink: 1 },
                            ]}
                            numberOfLines={1}
                          >
                            {typeLabel(opt)}
                          </Text>
                        </View>

                        {selected && (
                          <MaterialCommunityIcons
                            name="check"
                            size={18}
                            color={tint}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Plant */}
            <Text style={s.inputLabel}>
              {tr("remindersModals.edit.plantLabel", "Plant")}
            </Text>
            <View style={s.dropdown}>
              <Pressable
                style={s.dropdownHeader}
                onPress={() => {
                  setTypeOpen(false);
                  setShowDatePicker(false);
                  setPlantOpen((o) => !o);
                }}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <Text style={s.dropdownValue}>
                  {selectedPlant
                    ? selectedPlant.name
                    : tr("remindersModals.edit.selectPlant", "Select plant")}
                </Text>
                <MaterialCommunityIcons
                  name={plantOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#FFFFFF"
                />
              </Pressable>

              {plantOpen && (
                <View style={s.dropdownList}>
                  {plants.map((p) => (
                    <Pressable
                      key={p.id}
                      style={s.dropdownItem}
                      onPress={() => {
                        setFPlantId(p.id);
                        setPlantOpen(false);
                      }}
                    >
                      <Text style={s.dropdownItemText}>{p.name}</Text>
                      {fPlantId === p.id && (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color="#FFFFFF"
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Location (read-only) */}
            <Text style={s.inputLabel}>
              {tr("remindersModals.edit.locationLabel", "Location")}
            </Text>
            <TextInput
              style={[s.input, { opacity: 0.85 }]}
              placeholder={tr(
                "remindersModals.edit.locationPlaceholder",
                "Location"
              )}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={location || ""}
              editable={false}
            />

            {/* Due date */}
            <Text style={s.inputLabel}>
              {tr("remindersModals.edit.dueDateLabel", "Due date")}
            </Text>
            <Pressable
              onPress={() => {
                setTypeOpen(false);
                setPlantOpen(false);
                setShowDatePicker(true);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <TextInput
                style={s.input}
                placeholder={
                  settings?.dateFormat ||
                  tr("remindersModals.edit.datePlaceholder", "DD.MM.YYYY")
                }
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={dateDisplay || fDueDate}
                editable={false}
                pointerEvents="none"
              />
            </Pressable>

            {DateTimePicker && showDatePicker && (
              <View style={{ marginTop: 8, marginBottom: 10, marginHorizontal: 16 }}>
                <DateTimePicker
                  value={(() => {
                    const d0 = isValidDateYYYYMMDD(fDueDate)
                      ? new Date(fDueDate + "T00:00:00")
                      : new Date();
                    return d0;
                  })()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(event: any, date?: Date) => {
                    if (Platform.OS === "android") setShowDatePicker(false);
                    if (date) setFDueDate(toYYYYMMDD(date));
                  }}
                />

                {Platform.OS === "ios" && (
                  <View
                    style={{
                      marginTop: 8,
                      flexDirection: "row",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Pressable
                      onPress={() => setShowDatePicker(false)}
                      style={[s.promptBtn, s.promptPrimary]}
                    >
                      <Text style={s.promptPrimaryText}>
                        {tr("remindersModals.common.apply", "Apply")}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* Interval */}
            <Text style={s.inputLabel}>
              {tr("remindersModals.edit.intervalLabel", "Interval")}
            </Text>
            <View style={s.inlineRow}>
              <View style={s.inlineHalfLeft}>
                <TextInput
                  style={[s.input, s.inputInline]}
                  placeholder={tr(
                    "remindersModals.edit.intervalValuePlaceholder",
                    "Value"
                  )}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={String(
                    typeof fIntervalValue === "number" ? fIntervalValue : ""
                  )}
                  onChangeText={(txt) => {
                    const n = Number(txt.replace(/[^\d]/g, ""));
                    if (!txt) setFIntervalValue(undefined);
                    else if (!Number.isNaN(n)) setFIntervalValue(n);
                  }}
                  keyboardType="number-pad"
                />
              </View>

              <View style={s.inlineHalfRight}>
                <TextInput
                  style={[s.input, s.inputInline, { opacity: 0.85 }]}
                  value={unitLabel(fIntervalUnit)}
                  editable={false}
                />
              </View>
            </View>

            <View style={[s.promptButtonsRow, { marginTop: 12 }]}>
              <Pressable
                style={s.promptBtn}
                onPress={() => {
                  Keyboard.dismiss();
                  onCancel();
                }}
              >
                <Text style={s.promptBtnText}>
                  {tr("remindersModals.common.cancel", "Cancel")}
                </Text>
              </Pressable>

              <Pressable
                style={[s.promptBtn, s.promptPrimary, !canSave && { opacity: 0.5 }]}
                disabled={!canSave}
                onPress={() => {
                  Keyboard.dismiss();
                  onSave();
                }}
              >
                <Text style={[s.promptBtnText, s.promptPrimaryText]}>
                  {mode === "create"
                    ? tr("remindersModals.common.create", "Create")
                    : tr("remindersModals.common.update", "Update")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </>
  );
}