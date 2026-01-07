// C:\Projekty\Python\Flovers\mobile\src\features\reminders\components\modals\EditReminderModal.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  Platform,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../../styles/reminders.styles";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";
import { useSettings } from "../../../../app/providers/SettingsProvider"; // 👈 NEW

export type ReminderType =
  | "watering"
  | "moisture"
  | "fertilising"
  | "care"
  | "repot";

// Optional datetime picker (same pattern you mentioned)
let DateTimePicker: any = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {}

type PlantOption = { id: string; name: string; location?: string };

type Props = {
  visible: boolean;

  /** NEW: drives title & button label */
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

  /** kept for compatibility (RemindersScreen already uses onSave) */
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
  // iso is always YYYY-MM-DD internally
  if (!isValidDateYYYYMMDD(iso)) return iso;

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const yyyy = m[1];
  const mm = m[2];
  const dd = m[3];

  const fmt = settings?.dateFormat;

  // Support common "DMY/MDY/YMD" + common format strings.
  if (fmt === "mdy" || fmt === "MM/DD/YYYY" || fmt === "MM-DD-YYYY") {
    const sep = fmt === "MM-DD-YYYY" ? "-" : "/";
    return `${mm}${sep}${dd}${sep}${yyyy}`;
  }
  if (fmt === "ymd" || fmt === "YYYY-MM-DD" || fmt === "YYYY/MM/DD") {
    const sep = fmt === "YYYY/MM/DD" ? "/" : "-";
    return `${yyyy}${sep}${mm}${sep}${dd}`;
  }

  // default: dmy
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
  const { settings } = useSettings(); // 👈 NEW

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

  // keep unit in sync with type
  useEffect(() => {
    const u = unitForType(fType);
    if (u !== fIntervalUnit) setFIntervalUnit(u);
  }, [fType, fIntervalUnit, setFIntervalUnit]);

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

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>
            {mode === "create"
              ? tr("remindersModals.edit.titleCreate", "Add reminder")
              : tr("remindersModals.edit.titleEdit", "Edit reminder")}
          </Text>

          {/* Type */}
          <Text style={s.inputLabel}>{tr("remindersModals.edit.typeLabel", "Type")}</Text>
          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setPlantOpen(false);
                setTypeOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>{typeLabel(fType)}</Text>
              <MaterialCommunityIcons
                name={typeOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>
            {typeOpen && (
              <View style={s.dropdownList}>
                {TYPE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt}
                    style={s.dropdownItem}
                    onPress={() => {
                      setFType(opt);
                      setTypeOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>{typeLabel(opt)}</Text>
                    {fType === opt && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                ))}
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
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
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
            placeholder={tr("remindersModals.edit.locationPlaceholder", "Location")}
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={location || ""}
            editable={false}
          />

          {/* Due date with DatePicker */}
          <Text style={s.inputLabel}>
            {tr("remindersModals.edit.dueDateLabel", "Due date")}
          </Text>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
          >
            <TextInput
              style={s.input}
              placeholder={tr(
                "remindersModals.edit.datePlaceholder",
                "YYYY-MM-DD"
              )}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={dateDisplay || fDueDate}
              editable={false}
              pointerEvents="none"
            />
          </Pressable>

          {DateTimePicker && showDatePicker && (
            <DateTimePicker
              value={(() => {
                const d = isValidDateYYYYMMDD(fDueDate) ? new Date(fDueDate) : new Date();
                return new Date(d.getFullYear(), d.getMonth(), d.getDate());
              })()}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={(event: any, date?: Date) => {
                if (Platform.OS === "android") setShowDatePicker(false);
                if (date) setFDueDate(toYYYYMMDD(date)); // keep ISO in state
              }}
            />
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
                value={String(typeof fIntervalValue === "number" ? fIntervalValue : "")}
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

          <View style={s.promptButtonsRow}>
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
        </View>
      </View>
    </>
  );
}
