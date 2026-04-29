import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  ScrollView,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../../styles/reminders.styles";
import type { ReminderType } from "../../types/reminders.types";
import {
  ACCENT_BY_TYPE,
  ICON_BY_TYPE,
} from "../../constants/reminders.constants";

import ModalCloseButton from "../../../../shared/ui/ModalCloseButton";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";
import { useSettings } from "../../../../app/providers/SettingsProvider";

let DateTimePicker: any = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {}

type PlantOption = { id: string; name: string; location?: string };

type Filters = {
  plantId?: string;
  location?: string;
  types?: ReminderType[];
  dueFrom?: string;
  dueTo?: string;
};

type Props = {
  visible: boolean;
  plants: PlantOption[];
  locations: string[];
  filters: Filters;
  onCancel: () => void;
  onApply: (filters: Filters) => void;
  onClearAll: () => void;
};

const TYPE_OPTIONS: ReminderType[] = [
  "watering",
  "moisture",
  "fertilising",
  "care",
  "repot",
];

function isValidDateYYYYMMDD(v?: string) {
  if (!v) return false;
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

function formatDateForDisplay(iso?: string, pattern?: string) {
  if (!iso || !isValidDateYYYYMMDD(iso)) return "";

  const [yyyy, mm, dd] = iso.split("-");
  const fmt = pattern && typeof pattern === "string" ? pattern : "DD.MM.YYYY";

  return fmt.replace("YYYY", yyyy).replace("MM", mm).replace("DD", dd);
}

function hexToRgba(hex?: string, alpha = 1) {
  const fallback = `rgba(255,255,255,${alpha})`;
  if (!hex || typeof hex !== "string") return fallback;
  let h = hex.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return fallback;
  const bigint = parseInt(h, 16);
  if (Number.isNaN(bigint)) return fallback;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function FilterRemindersModal({
  visible,
  plants,
  locations,
  filters,
  onCancel,
  onApply,
  onClearAll,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();

  const tr = React.useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const [plantOpen, setPlantOpen] = React.useState(false);
  const [locOpen, setLocOpen] = React.useState(false);
  const [types, setTypes] = React.useState<ReminderType[]>(filters.types || []);

  const [plantId, setPlantId] = React.useState<string | undefined>(
    filters.plantId
  );
  const [location, setLocation] = React.useState<string | undefined>(
    filters.location
  );

  const [dueFrom, setDueFrom] = React.useState(filters.dueFrom || "");
  const [dueTo, setDueTo] = React.useState(filters.dueTo || "");
  const [showFromPicker, setShowFromPicker] = React.useState(false);
  const [showToPicker, setShowToPicker] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setPlantOpen(false);
      setLocOpen(false);
      setShowFromPicker(false);
      setShowToPicker(false);
      setTypes(filters.types || []);
      setPlantId(filters.plantId);
      setLocation(filters.location);
      setDueFrom(filters.dueFrom || "");
      setDueTo(filters.dueTo || "");
    }
  }, [visible, filters]);

  const toggleType = (tt: ReminderType) => {
    setTypes((curr) =>
      curr.includes(tt) ? curr.filter((x) => x !== tt) : [...curr, tt]
    );
  };

  const typeLabel = (tt: ReminderType) =>
    tr(
      `reminders.types.${tt}`,
      tt === "fertilising"
        ? "Fertilising"
        : tt.charAt(0).toUpperCase() + tt.slice(1)
    );

  const handleClearAll = () => {
    setPlantOpen(false);
    setLocOpen(false);
    setShowFromPicker(false);
    setShowToPicker(false);
    setTypes([]);
    setPlantId(undefined);
    setLocation(undefined);
    setDueFrom("");
    setDueTo("");
    onClearAll();
  };

  if (!visible) return null;

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={onCancel} />

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

        <View
          style={[
            s.promptInner,
            {
              maxHeight: "86%",
              position: "relative",
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 44,
              paddingBottom: 120,
            }}
          >
            <Text style={s.promptTitle}>
              {tr("remindersModals.filter.title", "Filter reminders")}
            </Text>

            {/* Plant dropdown */}
            <Text style={s.inputLabel}>
              {tr("remindersModals.filter.plantLabel", "Plant")}
            </Text>
            <View style={s.dropdown}>
              <Pressable
                style={s.dropdownHeader}
                onPress={() => {
                  setLocOpen(false);
                  setShowFromPicker(false);
                  setShowToPicker(false);
                  setPlantOpen((o) => !o);
                }}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <Text style={s.dropdownValue}>
                  {plantId
                    ? plants.find((p) => p.id === plantId)?.name ||
                      tr("remindersModals.filter.selectPlant", "Select plant")
                    : tr("remindersModals.filter.anyPlant", "Any plant")}
                </Text>
                <MaterialCommunityIcons
                  name={plantOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#FFFFFF"
                />
              </Pressable>

              {plantOpen && (
                <View style={s.dropdownList}>
                  <Pressable
                    key="__any_plant"
                    style={s.dropdownItem}
                    onPress={() => {
                      setPlantId(undefined);
                      setPlantOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>
                      {tr("remindersModals.filter.anyPlant", "Any plant")}
                    </Text>
                    {!plantId && (
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color="#FFFFFF"
                      />
                    )}
                  </Pressable>

                  {plants.map((p) => (
                    <Pressable
                      key={p.id}
                      style={s.dropdownItem}
                      onPress={() => {
                        setPlantId(p.id);
                        setPlantOpen(false);
                      }}
                    >
                      <Text style={s.dropdownItemText}>{p.name}</Text>
                      {plantId === p.id && (
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

            {/* Location dropdown */}
            <Text style={s.inputLabel}>
              {tr("remindersModals.filter.locationLabel", "Location")}
            </Text>
            <View style={s.dropdown}>
              <Pressable
                style={s.dropdownHeader}
                onPress={() => {
                  setPlantOpen(false);
                  setShowFromPicker(false);
                  setShowToPicker(false);
                  setLocOpen((o) => !o);
                }}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <Text style={s.dropdownValue}>
                  {location
                    ? location
                    : tr("remindersModals.filter.anyLocation", "Any location")}
                </Text>
                <MaterialCommunityIcons
                  name={locOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#FFFFFF"
                />
              </Pressable>

              {locOpen && (
                <View style={s.dropdownList}>
                  <Pressable
                    key="__any_location"
                    style={s.dropdownItem}
                    onPress={() => {
                      setLocation(undefined);
                      setLocOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>
                      {tr("remindersModals.filter.anyLocation", "Any location")}
                    </Text>
                    {!location && (
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color="#FFFFFF"
                      />
                    )}
                  </Pressable>

                  {locations.map((loc) => (
                    <Pressable
                      key={loc}
                      style={s.dropdownItem}
                      onPress={() => {
                        setLocation(loc);
                        setLocOpen(false);
                      }}
                    >
                      <Text style={s.dropdownItemText}>{loc}</Text>
                      {location === loc && (
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

            {/* Types */}
            <Text style={s.inputLabel}>
              {tr("remindersModals.filter.taskTypesLabel", "Task types")}
            </Text>
            <View
              style={[
                s.chipRow,
                {
                  paddingHorizontal: 16,
                  justifyContent: "space-between",
                  rowGap: 10,
                  columnGap: 10,
                },
              ]}
            >
              {TYPE_OPTIONS.map((tt) => {
                const selected = types.includes(tt);
                const tint = ACCENT_BY_TYPE[tt];
                const icon = ICON_BY_TYPE[tt];

                return (
                  <Pressable
                    key={tt}
                    onPress={() => toggleType(tt)}
                    style={[
                      s.chip,
                      {
                        width: "48%",
                        minHeight: 44,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        borderWidth: 0,
                        borderColor: selected
                          ? hexToRgba(tint, 0.95)
                          : hexToRgba(tint, 0.45),
                        backgroundColor: selected
                          ? hexToRgba(tint, 0.24)
                          : hexToRgba(tint, 0.14),
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={icon}
                      size={16}
                      color={tint}
                    />
                    <Text style={[s.chipText, { color: tint }]}>
                      {typeLabel(tt)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Due date range */}
            <Text style={[s.inputLabel, { marginTop: 12 }]}>
              {tr("remindersModals.filter.dueDateRangeLabel", "Due date range")}
            </Text>

            <View style={s.inlineRow}>
              <View style={s.inlineHalfLeft}>
                <Pressable
                  onPress={() => {
                    setPlantOpen(false);
                    setLocOpen(false);
                    setShowToPicker(false);
                    setShowFromPicker(true);
                  }}
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                >
                  <TextInput
                    style={[s.input, s.inputInline]}
                    placeholder={
                      settings.dateFormat ||
                      tr("remindersModals.filter.datePlaceholder", "DD.MM.YYYY")
                    }
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    value={formatDateForDisplay(dueFrom, settings.dateFormat)}
                    editable={false}
                    pointerEvents="none"
                  />
                </Pressable>

                {DateTimePicker && showFromPicker && (
                  <View style={{ marginTop: 8, marginBottom: 10 }}>
                    <DateTimePicker
                      value={(() => {
                        const d0 = isValidDateYYYYMMDD(dueFrom)
                          ? new Date(dueFrom + "T00:00:00")
                          : new Date();
                        return d0;
                      })()}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={(event: any, date?: Date) => {
                        if (Platform.OS === "android") setShowFromPicker(false);
                        if (date) setDueFrom(toYYYYMMDD(date));
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
                          onPress={() => setShowFromPicker(false)}
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
              </View>

              <View style={s.inlineHalfRight}>
                <Pressable
                  onPress={() => {
                    setPlantOpen(false);
                    setLocOpen(false);
                    setShowFromPicker(false);
                    setShowToPicker(true);
                  }}
                  android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                >
                  <TextInput
                    style={[s.input, s.inputInline]}
                    placeholder={
                      settings.dateFormat ||
                      tr("remindersModals.filter.datePlaceholder", "DD.MM.YYYY")
                    }
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    value={formatDateForDisplay(dueTo, settings.dateFormat)}
                    editable={false}
                    pointerEvents="none"
                  />
                </Pressable>

                {DateTimePicker && showToPicker && (
                  <View style={{ marginTop: 8, marginBottom: 10 }}>
                    <DateTimePicker
                      value={(() => {
                        const d0 = isValidDateYYYYMMDD(dueTo)
                          ? new Date(dueTo + "T00:00:00")
                          : new Date();
                        return d0;
                      })()}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={(event: any, date?: Date) => {
                        if (Platform.OS === "android") setShowToPicker(false);
                        if (date) setDueTo(toYYYYMMDD(date));
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
                          onPress={() => setShowToPicker(false)}
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
              </View>
            </View>

            <View style={[s.promptButtonsRow, { marginTop: 12 }]}>
              <Pressable
                onPress={handleClearAll}
                style={[s.promptBtn, s.promptDanger]}
              >
                <Text
                  style={[
                    s.promptBtnText,
                    { color: "#FF6B6B", fontWeight: "800" },
                  ]}
                >
                  {tr("remindersModals.common.clear", "Clear")}
                </Text>
              </Pressable>

              <Pressable onPress={onCancel} style={s.promptBtn}>
                <Text style={s.promptBtnText}>
                  {tr("remindersModals.common.cancel", "Cancel")}
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  onApply({
                    plantId,
                    location,
                    types,
                    dueFrom,
                    dueTo,
                  })
                }
                style={[s.promptBtn, s.promptPrimary]}
              >
                <Text style={s.promptPrimaryText}>
                  {tr("remindersModals.common.apply", "Apply")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <ModalCloseButton
            onPress={onCancel}
            accessibilityLabel={tr("remindersModals.common.close", "Close")}
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