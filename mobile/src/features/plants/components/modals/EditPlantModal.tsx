import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Slider from "@react-native-community/slider";

// Keep plant dropdown styles (identical look), etc.
import { s } from "../../styles/plants.styles";
// Import the Profile modal styles to match formatting/look
import { prompts as pr } from "../../../profile/styles/profile.styles";

import {
  ORIENTATIONS,     // [{ key: 'N'|'E'|'S'|'W', label: string }]
  POT_MATERIALS,    // [{ key: string, label: string, description?: string }]
  SOIL_MIXES,       // [{ key: string, label: string, description?: string }]
} from "../../../create-plant/constants/create-plant.constants";

// 🔁 Reuse the create-plant measure modal
import MeasureExposureModal from "../../../create-plant/components/modals/MeasureExposureModal";
import type { LightLevel } from "../../../create-plant/types/create-plant.types";

type LightLevel5 = "very-low" | "low" | "medium" | "bright-indirect" | "bright-direct";

let DateTimePicker: any = null;
try { DateTimePicker = require("@react-native-community/datetimepicker").default; } catch {}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseISODate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  if (dt.getTime() > Date.now()) return null;
  return dt;
}

type Props = {
  visible: boolean;

  // suggestions + locations (display names) from backend
  latinCatalog: string[];
  locations: string[];

  // existing controlled fields
  fName: string;
  setFName: (v: string) => void;

  fLatinQuery: string;
  setFLatinQuery: (v: string) => void;
  fLatinSelected?: string;
  setFLatinSelected: (v?: string) => void;

  fLocation?: string;
  setFLocation: (v?: string) => void;

  fNotes: string;
  setFNotes: (v: string) => void;

  // new controlled fields
  fPurchaseDateISO?: string | null;
  setFPurchaseDateISO: (v: string | null) => void;

  fLightLevel: LightLevel5;
  setFLightLevel: (v: LightLevel5) => void;

  fOrientation: "N" | "E" | "S" | "W";
  setFOrientation: (v: "N" | "E" | "S" | "W") => void;

  fDistanceCm: number; // 0..100
  setFDistanceCm: (n: number) => void;

  fPotMaterial?: string;
  setFPotMaterial: (k?: string) => void;

  fSoilMix?: string;
  setFSoilMix: (k?: string) => void;

  onCancel: () => void;
  onSave: () => void;
};

export default function EditPlantModal(props: Props) {
  const {
    visible,
    latinCatalog,
    locations,
    fName, setFName,
    fLatinQuery, setFLatinQuery,
    fLatinSelected, setFLatinSelected,
    fLocation, setFLocation,
    fNotes, setFNotes,
    fPurchaseDateISO, setFPurchaseDateISO,
    fLightLevel, setFLightLevel,
    fOrientation, setFOrientation,
    fDistanceCm, setFDistanceCm,
    fPotMaterial, setFPotMaterial,
    fSoilMix, setFSoilMix,
    onCancel, onSave,
  } = props;

  const [showLatin, setShowLatin] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [matOpen, setMatOpen] = useState(false);
  const [soilOpen, setSoilOpen] = useState(false);

  const [nativePickerOpen, setNativePickerOpen] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackDate, setFallbackDate] = useState<string>(fPurchaseDateISO ?? "");

  // 👉 New: control the Measure light & direction modal
  const [measureVisible, setMeasureVisible] = useState(false);

  const lightOrder: LightLevel5[] = ["very-low", "low", "medium", "bright-indirect", "bright-direct"];
  const lightIndex = Math.max(0, lightOrder.indexOf(fLightLevel));

  const suggestions = useMemo(() => {
    const q = fLatinQuery.trim().toLowerCase();
    if (!q) return [];
    return latinCatalog.filter((n) => n.toLowerCase().includes(q)).slice(0, 6);
  }, [latinCatalog, fLatinQuery]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop (Profile modal look) */}
      <Pressable
        style={pr.backdrop}
        onPress={() => {
          Keyboard.dismiss();
          onCancel();
        }}
      />

      {/* Modal wrapper (Profile modal look) */}
      <View style={pr.promptWrap}>
        <View style={pr.promptGlass}>
          <BlurView
            style={{ position: "absolute", inset: 0 } as any}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" } as any}
          />
        </View>

        {/* Sheet — full width like Profile prompts; Scrollable with capped height */}
        <View style={[pr.promptInner, { maxHeight: "86%" }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={pr.promptTitle}>Edit plant</Text>

            {/* Name */}
            <TextInput
              style={pr.input}
              placeholder="Plant name (required)"
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={fName}
              onChangeText={setFName}
            />

            {/* Latin live search */}
            <View style={{ position: "relative" }}>
              <TextInput
                style={pr.input}
                placeholder="Latin name (search)…"
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={fLatinQuery}
                onFocus={() => setShowLatin(true)}
                onChangeText={(t) => {
                  setFLatinQuery(t);
                  setFLatinSelected(undefined);
                  setShowLatin(true);
                }}
              />
              {showLatin && suggestions.length > 0 && (
                <View style={s.suggestBox}>
                  {suggestions.map((latin) => (
                    <Pressable
                      key={latin}
                      style={s.suggestItem}
                      onPress={() => {
                        setFLatinQuery(latin);
                        setFLatinSelected(latin);
                        setShowLatin(false);
                        Keyboard.dismiss();
                      }}
                    >
                      <Text style={s.suggestText}>{latin}</Text>
                      {fLatinSelected === latin && (
                        <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Location dropdown (same flat style as Profile controls) */}
            <View style={[s.dropdown, { marginHorizontal: 16 }]}>
              <Pressable
                style={s.dropdownHeader}
                onPress={() => {
                  setShowLatin(false);
                  setLocOpen((o) => !o);
                  setMatOpen(false);
                  setSoilOpen(false);
                }}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <Text style={s.dropdownValue}>{fLocation || "Select location (optional)"} </Text>
                <MaterialCommunityIcons name={locOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
              </Pressable>
              {locOpen && (
                <View style={s.dropdownList}>
                  {locations.map((loc) => (
                    <Pressable
                      key={loc}
                      style={s.dropdownItem}
                      onPress={() => {
                        setFLocation(loc);
                        setLocOpen(false);
                      }}
                    >
                      <Text style={s.dropdownItemText}>{loc}</Text>
                      {fLocation === loc && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                    </Pressable>
                  ))}
                  <Pressable
                    style={s.dropdownItem}
                    onPress={() => {
                      setFLocation(undefined);
                      setLocOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>— None —</Text>
                    {!fLocation && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
                  </Pressable>
                </View>
              )}
            </View>

            {/* Notes */}
            <TextInput
              style={[pr.input, { height: 120, textAlignVertical: "top", paddingTop: 10 }]}
              placeholder="Notes… (optional)"
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={fNotes}
              onChangeText={setFNotes}
              multiline
            />

            {/* Purchase date */}
            <Text style={[{ color: "#FFFFFF", fontWeight: "800", marginHorizontal: 16, marginTop: 6, marginBottom: 8 }]}>
              Purchase date
            </Text>
            <Pressable
              style={[s.dropdownHeader, { marginHorizontal: 16 }]}
              onPress={() => {
                if (DateTimePicker) {
                  setShowLatin(false);
                  setLocOpen(false);
                  setMatOpen(false);
                  setSoilOpen(false);
                  setNativePickerOpen(true);
                } else {
                  setFallbackDate(fPurchaseDateISO ?? "");
                  setFallbackOpen(true);
                }
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>{fPurchaseDateISO ?? "Not set"}</Text>
              <MaterialCommunityIcons name="calendar" size={20} color="#FFFFFF" />
            </Pressable>

            {nativePickerOpen && DateTimePicker && (
              <View style={{ marginTop: 8, marginBottom: 10, marginHorizontal: 16 }}>
                <DateTimePicker
                  value={fPurchaseDateISO ? new Date(fPurchaseDateISO + "T00:00:00") : new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(_, date?: Date) => {
                    if (Platform.OS === "android") setNativePickerOpen(false);
                    if (date) setFPurchaseDateISO?.(toISODate(date));
                  }}
                  maximumDate={new Date()}
                />
                {Platform.OS === "ios" && (
                  <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "flex-end" }}>
                    <Pressable
                      onPress={() => setNativePickerOpen(false)}
                      style={[pr.promptBtn, pr.promptPrimary]}
                    >
                      <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>Done</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {fallbackOpen && (
              <>
                <Pressable style={pr.backdrop} onPress={() => setFallbackOpen(false)} />
                <View style={[s.dropdownList, { marginHorizontal: 16 }]}>
                  <View style={{ padding: 12 }}>
                    <Text style={[s.dropdownValue, { marginBottom: 8 }]}>Set purchase date (YYYY-MM-DD)</Text>
                    <TextInput
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="rgba(255,255,255,0.7)"
                      value={fallbackDate}
                      onChangeText={setFallbackDate}
                      style={pr.input}
                    />
                    <View style={[pr.promptButtonsRow, { marginTop: 8 }]}>
                      <Pressable style={pr.promptBtn} onPress={() => setFallbackOpen(false)}>
                        <Text style={pr.promptBtnText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={[pr.promptBtn, pr.promptPrimary]}
                        onPress={() => {
                          if (!fallbackDate) {
                            setFPurchaseDateISO?.(null);
                            setFallbackOpen(false);
                            return;
                          }
                          const dt = parseISODate(fallbackDate.trim());
                          if (!dt) {
                            Alert.alert("Invalid date", "Use format YYYY-MM-DD");
                            return;
                          }
                          setFPurchaseDateISO?.(toISODate(dt));
                          setFallbackOpen(false);
                        }}
                      >
                        <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>Set</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Exposure — light level */}
            <Text style={[{ color: "#FFFFFF", fontWeight: "800", marginHorizontal: 16, marginTop: 6, marginBottom: 8 }]}>
              Light level
            </Text>
            <View style={{ marginTop: 2, marginBottom: 6, marginHorizontal: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Low</Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>High</Text>
              </View>
              <Slider
                value={lightIndex}
                onValueChange={(v) => {
                  const idx = Math.max(0, Math.min(4, Math.round(v)));
                  setFLightLevel?.(lightOrder[idx]);
                }}
                onSlidingComplete={(v) => {
                  const idx = Math.max(0, Math.min(4, Math.round(v)));
                  setFLightLevel?.(lightOrder[idx]);
                }}
                minimumValue={0}
                maximumValue={4}
                step={1}
                minimumTrackTintColor="#0B7285"
                maximumTrackTintColor="rgba(255,255,255,0.35)"
                thumbTintColor="#0B7285"
              />
            </View>

            {/* Window direction */}
            <Text style={[{ color: "#FFFFFF", fontWeight: "800", marginHorizontal: 16, marginTop: 6, marginBottom: 8 }]}>
              Window direction
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 6, marginHorizontal: 16 }}>
              {ORIENTATIONS.map(({ key, label }) => {
                const active = fOrientation === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setFOrientation?.(key as any)}
                    style={[
                      {
                        flex: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      { backgroundColor: active ? "rgba(11,114,133,0.9)" : "rgba(255,255,255,0.12)" },
                    ]}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12 }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 👉 New: Measure light & direction button */}
            <View style={{ marginHorizontal: 16, marginBottom: 6 }}>
              <Pressable
                style={[
                  pr.promptBtn,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  },
                ]}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
                onPress={() => {
                  setMeasureVisible(true);
                }}
              >
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={pr.promptBtnText}>Measure light & direction</Text>
              </Pressable>
            </View>

            {/* Distance from window */}
            <Text style={[{ color: "#FFFFFF", fontWeight: "800", marginHorizontal: 16, marginTop: 6, marginBottom: 8 }]}>
              Distance from window
            </Text>
            <View style={{ marginTop: 6, marginBottom: 4, marginHorizontal: 16 }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "800", alignSelf: "flex-end", marginBottom: 4 }}>
                {fDistanceCm} cm
              </Text>
              <Slider
                value={fDistanceCm}
                onValueChange={(v) => setFDistanceCm?.(Math.round(v))}
                onSlidingComplete={(v) => setFDistanceCm?.(Math.round(v))}
                minimumValue={0}
                maximumValue={100}
                step={10}
                minimumTrackTintColor="#0B7285"
                maximumTrackTintColor="rgba(255,255,255,0.35)"
                thumbTintColor="#0B7285"
              />
            </View>

            {/* Container material */}
            <Text style={[{ color: "#FFFFFF", fontWeight: "800", marginHorizontal: 16, marginTop: 6, marginBottom: 8 }]}>
              Container material
            </Text>
            <Pressable
              style={[s.dropdownHeader, { marginHorizontal: 16 }]}
              onPress={() => {
                setMatOpen((o) => !o);
                setLocOpen(false);
                setSoilOpen(false);
                setShowLatin(false);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>
                {POT_MATERIALS.find(m => m.key === fPotMaterial)?.label || "Not specified"}
              </Text>
              <MaterialCommunityIcons name={matOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
            </Pressable>
            {matOpen && (
              <View style={[s.dropdownList, { marginHorizontal: 16 }]}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Pressable style={s.dropdownItem} onPress={() => { setFPotMaterial?.(undefined); setMatOpen(false); }}>
                    <Text style={s.dropdownItemText}>Not specified</Text>
                  </Pressable>
                  {POT_MATERIALS.map(opt => (
                    <Pressable
                      key={opt.key}
                      style={s.dropdownItem}
                      onPress={() => { setFPotMaterial?.(opt.key); setMatOpen(false); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={s.dropdownItemText}>{opt.label}</Text>
                        {!!opt.description && (
                          <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{opt.description}</Text>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Soil mix */}
            <Text style={[{ color: "#FFFFFF", fontWeight: "800", marginHorizontal: 16, marginTop: 6, marginBottom: 8 }]}>
              Soil / potting mix
            </Text>
            <Pressable
              style={[s.dropdownHeader, { marginHorizontal: 16 }]}
              onPress={() => {
                setSoilOpen((o) => !o);
                setLocOpen(false);
                setMatOpen(false);
                setShowLatin(false);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <Text style={s.dropdownValue}>
                {SOIL_MIXES.find(m => m.key === fSoilMix)?.label || "Not specified"}
              </Text>
              <MaterialCommunityIcons name={soilOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
            </Pressable>
            {soilOpen && (
              <View style={[s.dropdownList, { marginHorizontal: 16 }]}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Pressable style={s.dropdownItem} onPress={() => { setFSoilMix?.(undefined); setSoilOpen(false); }}>
                    <Text style={s.dropdownItemText}>Not specified</Text>
                  </Pressable>
                  {SOIL_MIXES.map(opt => (
                    <Pressable
                      key={opt.key}
                      style={s.dropdownItem}
                      onPress={() => { setFSoilMix?.(opt.key); setSoilOpen(false); }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={s.dropdownItemText}>{opt.label}</Text>
                        {!!opt.description && (
                          <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{opt.description}</Text>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Footer */}
            <View style={pr.promptButtonsRow}>
              <Pressable style={pr.promptBtn} onPress={onCancel}>
                <Text style={pr.promptBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[pr.promptBtn, pr.promptPrimary, !fName.trim() && { opacity: 0.5 }]}
                disabled={!fName.trim()}
                onPress={onSave}
              >
                <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>Update</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* 🔁 Shared Measure light & direction modal */}
      <MeasureExposureModal
        visible={measureVisible}
        onClose={() => setMeasureVisible(false)}
        onApply={({ light, orientation }) => {
          if (light) {
            // cast because unions are compatible
            setFLightLevel(light as LightLevel5 as LightLevel);
          }
          if (orientation) {
            setFOrientation(orientation);
          }
        }}
      />
    </>
  );
}
