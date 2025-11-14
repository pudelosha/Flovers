import React from "react";
import { View, Text, Pressable, TextInput, Platform } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { s } from "../styles/task-history.styles";
import type { TaskType } from "../../home/types/home.types";
import { ACCENT_BY_TYPE } from "../../home/constants/home.constants";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// Optional datetime picker (same pattern as Reminders)
let DateTimePicker: any = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {}

type PlantOption = { id: string; name: string };

export type HistoryFilters = {
  plantId?: string;
  location?: string;
  types?: TaskType[];
  completedFrom?: string; // "YYYY-MM-DD"
  completedTo?: string;   // "YYYY-MM-DD"
};

type Props = {
  visible: boolean;
  plants: PlantOption[];
  locations: string[];
  filters: HistoryFilters;
  onCancel: () => void;
  onApply: (filters: HistoryFilters) => void;
  onClearAll: () => void;
};

const TYPE_OPTIONS: TaskType[] = ["watering", "moisture", "fertilising", "care", "repot"];

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

// tiny helper for tinted backgrounds (same as Reminders)
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

export default function FilterHistoryTasksModal({
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
  const [types, setTypes] = React.useState<TaskType[]>(filters.types || []);

  const [plantId, setPlantId] = React.useState<string | undefined>(filters.plantId);
  const [location, setLocation] = React.useState<string | undefined>(filters.location);

  const [completedFrom, setCompletedFrom] = React.useState(filters.completedFrom || "");
  const [completedTo, setCompletedTo] = React.useState(filters.completedTo || "");
  const [showFromPicker, setShowFromPicker] = React.useState(false);
  const [showToPicker, setShowToPicker] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setPlantOpen(false);
      setLocOpen(false);
      setTypes(filters.types || []);
      setPlantId(filters.plantId);
      setLocation(filters.location);
      setCompletedFrom(filters.completedFrom || "");
      setCompletedTo(filters.completedTo || "");
    }
  }, [visible, filters]);

  if (!visible) return null;

  const toggleType = (t: TaskType) => {
    setTypes((curr) => (curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t]));
  };

  const handleClearAll = () => {
    onClearAll();
    setTypes([]);
    setPlantId(undefined);
    setLocation(undefined);
    setCompletedFrom("");
    setCompletedTo("");
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
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
          />
        </View>

        <View style={[s.promptInner, s.promptInner28]}>
          <Text style={s.promptTitle}>Filter history</Text>

          {/* Plant dropdown (by plant name) */}
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
                {plantId
                  ? plants.find((p) => p.id === plantId)?.name || "Select plant"
                  : "Any plant"}
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
                  <Text style={s.dropdownItemText}>Any plant</Text>
                  {!plantId && (
                    <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
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
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
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
                  <Text style={s.dropdownItemText}>Any location</Text>
                  {!location && (
                    <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
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
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Task type chips (same glazed behaviour as Reminders) */}
          <Text style={s.inputLabel}>Task types</Text>
          <View style={s.chipRow}>
            {TYPE_OPTIONS.map((t) => {
              const selected = types.includes(t);
              const tint = ACCENT_BY_TYPE[t];
              return (
                <Pressable
                  key={t}
                  onPress={() => toggleType(t)}
                  style={[
                    s.chip,
                    {
                      backgroundColor: selected
                        ? hexToRgba(tint, 0.22)
                        : "rgba(255,255,255,0.12)",
                    },
                  ]}
                >
                  <Text style={s.chipText}>{t.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Completed date range */}
          <Text style={s.inputLabel}>Completed date range</Text>
          <View style={s.inlineRow}>
            <View style={s.inlineHalfLeft}>
              <Text style={s.inputLabel}>From</Text>
              <Pressable
                onPress={() => setShowFromPicker(true)}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <TextInput
                  style={[s.input, s.inputInline]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={completedFrom}
                  editable={false}
                  pointerEvents="none"
                />
              </Pressable>
              {DateTimePicker && showFromPicker && (
                <DateTimePicker
                  value={(() => {
                    const d = isValidDateYYYYMMDD(completedFrom)
                      ? new Date(completedFrom)
                      : new Date();
                    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
                  })()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(event: any, date?: Date) => {
                    if (Platform.OS === "android") setShowFromPicker(false);
                    if (date) setCompletedFrom(toYYYYMMDD(date));
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
                  style={[s.input, s.inputInline]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={completedTo}
                  editable={false}
                  pointerEvents="none"
                />
              </Pressable>
              {DateTimePicker && showToPicker && (
                <DateTimePicker
                  value={(() => {
                    const d = isValidDateYYYYMMDD(completedTo)
                      ? new Date(completedTo)
                      : new Date();
                    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
                  })()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(event: any, date?: Date) => {
                    if (Platform.OS === "android") setShowToPicker(false);
                    if (date) setCompletedTo(toYYYYMMDD(date));
                  }}
                />
              )}
            </View>
          </View>

          <View style={s.promptButtonsRow}>
            <Pressable onPress={handleClearAll} style={[s.promptBtn, s.promptDanger]}>
              <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>
                Clear
              </Text>
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
                  completedFrom,
                  completedTo,
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
