// C:\Projekty\Python\Flovers\mobile\src\features\plants\components\modals\EditPlantModal.tsx
import React, { useMemo, useState, useCallback } from "react";
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
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

// Keep plant dropdown styles (identical look), etc.
import { s } from "../../styles/plants.styles";
// Import the Profile modal styles to match formatting/look
import { prompts as pr } from "../../../profile/styles/profile.styles";

import {
  ORIENTATIONS, // [{ key: 'N'|'E'|'S'|'W', label: string }]
  POT_MATERIALS, // [{ key: string }]
  SOIL_MIXES, // [{ key: string }]
} from "../../../create-plant/constants/create-plant.constants";

import type {
  PotMaterialKey,
  SoilMixKey,
} from "../../../create-plant/constants/create-plant.constants";

// 🔁 Reuse the create-plant measure modal
import MeasureExposureModal from "../../../create-plant/components/modals/MeasureExposureModal";
import type { LightLevel } from "../../../create-plant/types/create-plant.types";

type LightLevel5 =
  | "very-low"
  | "low"
  | "medium"
  | "bright-indirect"
  | "bright-direct";

let DateTimePicker: any = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {}

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
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d)
    return null;
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
    fName,
    setFName,
    fLatinQuery,
    setFLatinQuery,
    fLatinSelected,
    setFLatinSelected,
    fLocation,
    setFLocation,
    fNotes,
    setFNotes,
    fPurchaseDateISO,
    setFPurchaseDateISO,
    fLightLevel,
    setFLightLevel,
    fOrientation,
    setFOrientation,
    fDistanceCm,
    setFDistanceCm,
    fPotMaterial,
    setFPotMaterial,
    fSoilMix,
    setFSoilMix,
    onCancel,
    onSave,
  } = props;

  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  // Safe t() (treat key-echo as missing)
  const tr = useCallback(
    (key: string, fallback?: string) => {
      void currentLanguage;
      const txt = t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const [showLatin, setShowLatin] = useState(false);
  const [locOpen, setLocOpen] = useState(false);

  // ✅ these were in your file; keep and use them
  const [matOpen, setMatOpen] = useState(false);
  const [soilOpen, setSoilOpen] = useState(false);

  const [nativePickerOpen, setNativePickerOpen] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackDate, setFallbackDate] = useState<string>(
    fPurchaseDateISO ?? ""
  );

  // 👉 Measure light & direction modal
  const [measureVisible, setMeasureVisible] = useState(false);

  const lightOrder: LightLevel5[] = [
    "very-low",
    "low",
    "medium",
    "bright-indirect",
    "bright-direct",
  ];
  const lightIndex = Math.max(0, lightOrder.indexOf(fLightLevel));

  const suggestions = useMemo(() => {
    const q = fLatinQuery.trim().toLowerCase();
    if (!q) return [];
    return latinCatalog
      .filter((n) => n.toLowerCase().includes(q))
      .slice(0, 6);
  }, [latinCatalog, fLatinQuery]);

  // ✅ Same pattern as Step05_ContainerAndSoil:
  // derive translated label for currently selected pot material / soil mix
  const potMaterialLabel = useMemo(() => {
    if (!fPotMaterial)
      return tr("createPlant.step05.notSpecified", "Not specified");

    const key = String(fPotMaterial) as PotMaterialKey;
    const found = POT_MATERIALS.find((p) => p.key === key);
    if (!found) return tr("createPlant.step05.notSpecified", "Not specified");

    return tr(
      `createPlant.step05.potMaterials.${found.key}.label`,
      String(found.key)
    );
  }, [fPotMaterial, tr]);

  const soilMixLabel = useMemo(() => {
    if (!fSoilMix) return tr("createPlant.step05.notSpecified", "Not specified");

    const key = String(fSoilMix) as SoilMixKey;
    const found = SOIL_MIXES.find((s0) => s0.key === key);
    if (!found) return tr("createPlant.step05.notSpecified", "Not specified");

    return tr(
      `createPlant.step05.soilMixes.${found.key}.label`,
      String(found.key)
    );
  }, [fSoilMix, tr]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <Pressable
        style={pr.backdrop}
        onPress={() => {
          Keyboard.dismiss();
          onCancel();
        }}
      />

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
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            } as any}
          />
        </View>

        {/* Sheet */}
        <View style={[pr.promptInner, { maxHeight: "86%" }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={pr.promptTitle}>
              {tr("plantsModals.edit.title", "Edit plant")}
            </Text>

            {/* Name */}
            <TextInput
              style={pr.input}
              placeholder={tr(
                "plantsModals.edit.namePlaceholder",
                "Plant name (required)"
              )}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={fName}
              onChangeText={setFName}
            />

            {/* Latin live search */}
            <View style={{ position: "relative" }}>
              <TextInput
                style={pr.input}
                placeholder={tr(
                  "plantsModals.edit.latinPlaceholder",
                  "Latin name (search)…"
                )}
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={fLatinQuery}
                onFocus={() => setShowLatin(true)}
                onChangeText={(txt) => {
                  setFLatinQuery(txt);
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
                <Text style={s.dropdownValue}>
                  {fLocation ||
                    tr(
                      "plantsModals.edit.locationOptional",
                      "Select location (optional)"
                    )}{" "}
                </Text>
                <MaterialCommunityIcons
                  name={locOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#FFFFFF"
                />
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
                      {fLocation === loc && (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color="#FFFFFF"
                        />
                      )}
                    </Pressable>
                  ))}

                  <Pressable
                    style={s.dropdownItem}
                    onPress={() => {
                      setFLocation(undefined);
                      setLocOpen(false);
                    }}
                  >
                    <Text style={s.dropdownItemText}>
                      {tr("plantsModals.edit.none", "— None —")}
                    </Text>
                    {!fLocation && (
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color="#FFFFFF"
                      />
                    )}
                  </Pressable>
                </View>
              )}
            </View>

            {/* Notes */}
            <TextInput
              style={[
                pr.input,
                { height: 120, textAlignVertical: "top", paddingTop: 10 },
              ]}
              placeholder={tr(
                "plantsModals.edit.notesPlaceholder",
                "Notes… (optional)"
              )}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={fNotes}
              onChangeText={setFNotes}
              multiline
            />

            {/* Purchase date */}
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "800",
                marginHorizontal: 16,
                marginTop: 6,
                marginBottom: 8,
              }}
            >
              {tr("plantsModals.edit.purchaseDateLabel", "Purchase date")}
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
              <Text style={s.dropdownValue}>
                {fPurchaseDateISO ??
                  tr("plantsModals.edit.notSet", "Not set")}
              </Text>
              <MaterialCommunityIcons name="calendar" size={20} color="#FFFFFF" />
            </Pressable>

            {nativePickerOpen && DateTimePicker && (
              <View style={{ marginTop: 8, marginBottom: 10, marginHorizontal: 16 }}>
                <DateTimePicker
                  value={
                    fPurchaseDateISO
                      ? new Date(fPurchaseDateISO + "T00:00:00")
                      : new Date()
                  }
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
                      <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                        {tr("plantsModals.common.done", "Done")}
                      </Text>
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
                    <Text style={[s.dropdownValue, { marginBottom: 8 }]}>
                      {tr(
                        "plantsModals.edit.fallbackDateTitle",
                        "Set purchase date (YYYY-MM-DD)"
                      )}
                    </Text>

                    <TextInput
                      placeholder={tr(
                        "plantsModals.edit.fallbackDatePlaceholder",
                        "YYYY-MM-DD"
                      )}
                      placeholderTextColor="rgba(255,255,255,0.7)"
                      value={fallbackDate}
                      onChangeText={setFallbackDate}
                      style={pr.input}
                    />

                    <View style={[pr.promptButtonsRow, { marginTop: 8 }]}>
                      <Pressable style={pr.promptBtn} onPress={() => setFallbackOpen(false)}>
                        <Text style={pr.promptBtnText}>
                          {tr("plantsModals.common.cancel", "Cancel")}
                        </Text>
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
                            Alert.alert(
                              tr("plantsModals.edit.invalidDateTitle", "Invalid date"),
                              tr("plantsModals.edit.invalidDateMsg", "Use format YYYY-MM-DD")
                            );
                            return;
                          }
                          setFPurchaseDateISO?.(toISODate(dt));
                          setFallbackOpen(false);
                        }}
                      >
                        <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                          {tr("plantsModals.edit.set", "Set")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* Light level */}
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "800",
                marginHorizontal: 16,
                marginTop: 6,
                marginBottom: 8,
              }}
            >
              {tr("plantsModals.edit.lightLevelLabel", "Light level")}
            </Text>

            <View style={{ marginTop: 2, marginBottom: 6, marginHorizontal: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                  {tr("plantsModals.edit.low", "Low")}
                </Text>
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                  {tr("plantsModals.edit.high", "High")}
                </Text>
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
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "800",
                marginHorizontal: 16,
                marginTop: 6,
                marginBottom: 8,
              }}
            >
              {tr("plantsModals.edit.windowDirectionLabel", "Window direction")}
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginBottom: 6, marginHorizontal: 16 }}>
              {ORIENTATIONS.map(({ key, label }) => {
                const active = fOrientation === key;
                // ✅ translate direction labels
                const translated = tr(
                  `plantsModals.edit.orientations.${key}`,
                  label
                );

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
                      {
                        backgroundColor: active
                          ? "rgba(11,114,133,0.9)"
                          : "rgba(255,255,255,0.12)",
                      },
                    ]}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12 }}>
                      {translated}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Measure light & direction */}
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
                onPress={() => setMeasureVisible(true)}
              >
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={pr.promptBtnText}>
                  {tr("plantsModals.edit.measureBtn", "Measure light & direction")}
                </Text>
              </Pressable>
            </View>

            {/* Distance */}
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "800",
                marginHorizontal: 16,
                marginTop: 6,
                marginBottom: 8,
              }}
            >
              {tr("plantsModals.edit.distanceLabel", "Distance from window")}
            </Text>

            <View style={{ marginTop: 6, marginBottom: 4, marginHorizontal: 16 }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontWeight: "800",
                  alignSelf: "flex-end",
                  marginBottom: 4,
                }}
              >
                {fDistanceCm} {tr("plantsModals.edit.cm", "cm")}
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
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "800",
                marginHorizontal: 16,
                marginTop: 6,
                marginBottom: 8,
              }}
            >
              {tr("plantsModals.edit.containerMaterialLabel", "Container material")}
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
              <Text style={s.dropdownValue}>{potMaterialLabel}</Text>
              <MaterialCommunityIcons
                name={matOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {matOpen && (
              <View style={[s.dropdownList, { marginHorizontal: 16 }]}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Pressable
                    style={s.dropdownItem}
                    onPress={() => {
                      setFPotMaterial?.(undefined);
                      setMatOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.dropdownItemText}>
                        {tr("createPlant.step05.notSpecified", "Not specified")}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                        {tr(
                          "createPlant.step05.notSpecifiedDesc",
                          "Skip this if you’re not sure."
                        )}
                      </Text>
                    </View>
                    {!fPotMaterial && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>

                  {POT_MATERIALS.map((opt) => {
                    const label = tr(
                      `createPlant.step05.potMaterials.${opt.key}.label`,
                      String(opt.key)
                    );
                    const desc = tr(
                      `createPlant.step05.potMaterials.${opt.key}.description`,
                      ""
                    );
                    const selected = String(fPotMaterial) === String(opt.key);

                    return (
                      <Pressable
                        key={opt.key}
                        style={s.dropdownItem}
                        onPress={() => {
                          setFPotMaterial?.(opt.key as PotMaterialKey);
                          setMatOpen(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={s.dropdownItemText}>{label}</Text>
                          {!!desc && (
                            <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                              {desc}
                            </Text>
                          )}
                        </View>
                        {selected && (
                          <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Soil mix */}
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "800",
                marginHorizontal: 16,
                marginTop: 6,
                marginBottom: 8,
              }}
            >
              {tr("plantsModals.edit.soilMixLabel", "Soil / potting mix")}
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
              <Text style={s.dropdownValue}>{soilMixLabel}</Text>
              <MaterialCommunityIcons
                name={soilOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            {soilOpen && (
              <View style={[s.dropdownList, { marginHorizontal: 16 }]}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Pressable
                    style={s.dropdownItem}
                    onPress={() => {
                      setFSoilMix?.(undefined);
                      setSoilOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.dropdownItemText}>
                        {tr("createPlant.step05.notSpecified", "Not specified")}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                        {tr(
                          "createPlant.step05.notSpecifiedDesc",
                          "Skip this if you’re not sure."
                        )}
                      </Text>
                    </View>
                    {!fSoilMix && (
                      <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>

                  {SOIL_MIXES.map((opt) => {
                    const label = tr(
                      `createPlant.step05.soilMixes.${opt.key}.label`,
                      String(opt.key)
                    );
                    const desc = tr(
                      `createPlant.step05.soilMixes.${opt.key}.description`,
                      ""
                    );
                    const selected = String(fSoilMix) === String(opt.key);

                    return (
                      <Pressable
                        key={opt.key}
                        style={s.dropdownItem}
                        onPress={() => {
                          setFSoilMix?.(opt.key as SoilMixKey);
                          setSoilOpen(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={s.dropdownItemText}>{label}</Text>
                          {!!desc && (
                            <Text style={{ color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                              {desc}
                            </Text>
                          )}
                        </View>
                        {selected && (
                          <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Footer */}
            <View style={pr.promptButtonsRow}>
              <Pressable style={pr.promptBtn} onPress={onCancel}>
                <Text style={pr.promptBtnText}>
                  {tr("plantsModals.common.cancel", "Cancel")}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  pr.promptBtn,
                  pr.promptPrimary,
                  !fName.trim() && { opacity: 0.5 },
                ]}
                disabled={!fName.trim()}
                onPress={onSave}
              >
                <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                  {tr("plantsModals.edit.update", "Update")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Measure light & direction modal */}
      <MeasureExposureModal
        visible={measureVisible}
        onClose={() => setMeasureVisible(false)}
        onApply={({ light, orientation }) => {
          if (light) {
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
