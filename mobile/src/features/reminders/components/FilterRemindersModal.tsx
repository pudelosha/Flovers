import React from "react";
import { View, Text, Pressable, TextInput, Platform } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { s } from "../styles/reminders.styles";
import type { ReminderType } from "../types/reminders.types";

// Optional datetime picker (same pattern as EditReminderModal)
let DateTimePicker: any = null;
try { DateTimePicker = require("@react-native-community/datetimepicker").default; } catch {}

type PlantOption = { id: string; name: string; location?: string };

type Filters = {
  plantId?: string;       // specific plant or undefined for Any
  location?: string;      // specific location or undefined for Any
  types?: ReminderType[]; // multi
  dueFrom?: string;       // "YYYY-MM-DD"
  dueTo?: string;         // "YYYY-MM-DD"
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

const TYPE_OPTIONS: ReminderType[] = ["watering", "moisture", "fertilising", "care", "repot"];

function isValidDateYYYYMMDD(v?: string) {
  if (!v) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v);
  if (isNaN(+d)) return false;
  const [Y, M, D] = v.split("-").map(Number);
  return d.getUTCFullYear() === Y && d.getUTCMonth() + 1 === M && d.getUTCDate() === D;
}
function toYYYYMMDD(d: Date) {
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
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
  const [plantOpen, setPlantOpen] = React.useState(false);
  const [locOpen, setLocOpen] = React.useState(false);
  const [types, setTypes] = React.useState<ReminderType[]>(filters.types || []);

  const [plantId, setPlantId] = React.useState<string | undefined>(filters.plantId);
  const [location, setLocation] = React.useState<string | undefined>(filters.location);

  const [dueFrom, setDueFrom] = React.useState(filters.dueFrom || "");
  const [dueTo, setDueTo] = React.useState(filters.dueTo || "");
  const [showFromPicker, setShowFromPicker] = React.useState(false);
  const [showToPicker, setShowToPicker] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setPlantOpen(false);
      setLocOpen(false);
      setTypes(filters.types || []);
      setPlantId(filters.plantId);
      setLocation(filters.location);
      setDueFrom(filters.dueFrom || "");
      setDueTo(filters.dueTo || "");
    }
  }, [visible, filters]);

  const toggleType = (t: ReminderType) => {
    setTypes((curr) => (curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t]));
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
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>Filter reminders</Text>

          {/* Plant dropdown */}
          <Text style={s.inputLabel}>Plant</Text>
          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setLocOpen(false);
                setPlantOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>
                {plantId ? (plants.find((p) => p.id === plantId)?.name || "Select plant") : "Any plant"}
              </Text>
              <MaterialCommunityIcons name={plantOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
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
                  <Text style={s.dropdownItemText}>Any plant</Text>
                  {!plantId && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
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
                    {plantId === p.id && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Location dropdown */}
          <Text style={s.inputLabel}>Location</Text>
          <View style={s.dropdown}>
            <Pressable
              style={s.dropdownHeader}
              onPress={() => {
                setPlantOpen(false);
                setLocOpen((o) => !o);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>{location ? location : "Any location"}</Text>
              <MaterialCommunityIcons name={locOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
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
                  <Text style={s.dropdownItemText}>Any location</Text>
                  {!location && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
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
                    {location === loc && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Types (chips) */}
          <Text style={s.inputLabel}>Task types</Text>
          <View style={s.chipRow}>
            {TYPE_OPTIONS.map((t) => (
              <Pressable
                key={t}
                onPress={() => toggleType(t)}
                style={[s.chip, types.includes(t) && s.chipSelected]}
              >
                <Text style={s.chipText}>{t.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          {/* Due date range */}
          <Text style={s.inputLabel}>Due date range</Text>
          <View style={s.inlineRow}>
            <View style={s.inlineHalfLeft}>
              <Text style={s.inputLabel}>From</Text>
              <Pressable
                onPress={() => setShowFromPicker(true)}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <TextInput
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={dueFrom}
                  editable={false}
                  pointerEvents="none"
                />
              </Pressable>
              {DateTimePicker && showFromPicker && (
                <DateTimePicker
                  value={(() => {
                    const d = isValidDateYYYYMMDD(dueFrom) ? new Date(dueFrom) : new Date();
                    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
                  })()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(event: any, date?: Date) => {
                    if (Platform.OS === "android") setShowFromPicker(false);
                    if (date) setDueFrom(toYYYYMMDD(date));
                  }}
                />
              )}
            </View>

            <View style={s.inlineHalfRight}>
              <Text style={s.inputLabel}>To</Text>
              <Pressable
                onPress={() => setShowToPicker(true)}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <TextInput
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={dueTo}
                  editable={false}
                  pointerEvents="none"
                />
              </Pressable>
              {DateTimePicker && showToPicker && (
                <DateTimePicker
                  value={(() => {
                    const d = isValidDateYYYYMMDD(dueTo) ? new Date(dueTo) : new Date();
                    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
                  })()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(event: any, date?: Date) => {
                    if (Platform.OS === "android") setShowToPicker(false);
                    if (date) setDueTo(toYYYYMMDD(date));
                  }}
                />
              )}
            </View>
          </View>

          <View style={s.promptButtonsRow}>
            <Pressable onPress={onClearAll} style={[s.promptBtn, s.promptDanger]}>
              <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>Clear</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={s.promptBtn}>
              <Text style={s.promptBtnText}>Cancel</Text>
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
              <Text style={s.promptPrimaryText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
