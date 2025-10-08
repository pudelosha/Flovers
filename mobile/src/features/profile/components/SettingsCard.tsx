import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import GlassCard from "./../components/GlassCard";
import Dropdown from "./../components/Dropdown";
import { card, controls } from "../styles/profile.styles";
import { LANG_OPTIONS, DATE_OPTIONS } from "../constants/profile.constants";
import type { LangCode } from "../types/profile.types";

// Try slider if installed
let SliderView: any = View;
try { SliderView = require("@react-native-community/slider").default; } catch {}

type TempUnit = "C" | "F" | "K";
type MeasureUnit = "metric" | "imperial";

const TEMP_OPTIONS: { key: TempUnit; label: string }[] = [
  { key: "C", label: "°C (Celsius)" },
  { key: "F", label: "°F (Fahrenheit)" },
  { key: "K", label: "K (Kelvin)" },
];

const MEASURE_OPTIONS: { key: MeasureUnit; label: string }[] = [
  { key: "metric", label: "Metric (cm / m)" },
  { key: "imperial", label: "Imperial (in / ft)" },
];

export default function SettingsCard({
  language, setLanguage, langOpen, setLangOpen,
  dateFormat, setDateFormat, dateOpen, setDateOpen,
  temperatureUnit, setTemperatureUnit, tempOpen, setTempOpen,
  measureUnit, setMeasureUnit, measureOpen, setMeasureOpen,
  tileTransparency, setTileTransparency,
  onSave,
}: {
  language: LangCode; setLanguage: (c: LangCode) => void;
  langOpen: boolean; setLangOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  dateFormat: string; setDateFormat: (f: string) => void;
  dateOpen: boolean; setDateOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  temperatureUnit: TempUnit; setTemperatureUnit: (u: TempUnit) => void;
  tempOpen: boolean; setTempOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  measureUnit: MeasureUnit; setMeasureUnit: (u: MeasureUnit) => void;
  measureOpen: boolean; setMeasureOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  tileTransparency: number; setTileTransparency: (v: number | ((v: number) => number)) => void;
  onSave: () => void;
}) {
  const currentLang = LANG_OPTIONS.find(l => l.code === language);

  return (
    <GlassCard>
      <Text style={card.cardTitle}>Settings</Text>

      {/* LANGUAGE */}
      <Text style={[controls.sectionTitle, controls.sectionTitleFirst]}>Language</Text>
      <Dropdown
        open={langOpen}
        valueText={`${currentLang?.flag ?? ""} ${currentLang?.label ?? ""}`}
        onToggle={() => setLangOpen((o: boolean) => !o)}
        items={LANG_OPTIONS.map(opt => ({
          key: opt.code,
          text: `${opt.flag} ${opt.label}`,
          selected: language === opt.code,
          onPress: () => { setLanguage(opt.code); setLangOpen(false); },
        }))}
      />

      {/* DATE/TIME FORMAT */}
      <Text style={controls.sectionTitle}>Date / Time format</Text>
      <Dropdown
        open={dateOpen}
        valueText={dateFormat}
        onToggle={() => setDateOpen((o: boolean) => !o)}
        items={DATE_OPTIONS.map(fmt => ({
          key: fmt,
          text: fmt,
          selected: dateFormat === fmt,
          onPress: () => { setDateFormat(fmt); setDateOpen(false); },
        }))}
      />

      {/* TEMPERATURE UNITS */}
      <Text style={controls.sectionTitle}>Temperature units</Text>
      <Dropdown
        open={tempOpen}
        valueText={TEMP_OPTIONS.find(t => t.key === temperatureUnit)?.label ?? "°C (Celsius)"}
        onToggle={() => setTempOpen((o: boolean) => !o)}
        items={TEMP_OPTIONS.map(opt => ({
          key: opt.key,
          text: opt.label,
          selected: temperatureUnit === opt.key,
          onPress: () => { setTemperatureUnit(opt.key); setTempOpen(false); },
        }))}
      />

      {/* MEASUREMENT UNITS */}
      <Text style={controls.sectionTitle}>Measurement units</Text>
      <Dropdown
        open={measureOpen}
        valueText={MEASURE_OPTIONS.find(m => m.key === measureUnit)?.label ?? "Metric (cm / m)"}
        onToggle={() => setMeasureOpen((o: boolean) => !o)}
        items={MEASURE_OPTIONS.map(opt => ({
          key: opt.key,
          text: opt.label,
          selected: measureUnit === opt.key,
          onPress: () => { setMeasureUnit(opt.key); setMeasureOpen(false); },
        }))}
      />

      {/* TILE TRANSPARENCY */}
      <Text style={controls.sectionTitle}>Tiles transparency</Text>
      {SliderView !== View ? (
        <View style={controls.sliderRow}>
          <SliderView
            minimumValue={0}
            maximumValue={0.6}
            step={0.01}
            value={tileTransparency}
            onValueChange={setTileTransparency}
            style={{ flex: 1 }}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="rgba(255,255,255,0.4)"
            thumbTintColor="#FFFFFF"
          />
          <Text style={controls.sliderValue}>{Math.round(tileTransparency * 100)}%</Text>
        </View>
      ) : (
        <View style={controls.stepperRow}>
          <Text style={controls.stepperLabel}>Level</Text>
          <View style={controls.stepper}>
            <Pressable
              onPress={() => setTileTransparency((v: number) => Math.max(0, +(v - 0.01).toFixed(2)))}
              style={controls.stepBtn}
              android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}
            >
              <MaterialCommunityIcons name="minus" size={16} color="#FFFFFF" />
            </Pressable>
            <Text style={controls.stepTime}>{Math.round(tileTransparency * 100)}%</Text>
            <Pressable
              onPress={() => setTileTransparency((v: number) => Math.min(0.6, +(v + 0.01).toFixed(2)))}
              style={controls.stepBtn}
              android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}

      <Pressable style={controls.saveBtn} onPress={onSave}>
        <MaterialCommunityIcons name="content-save" size={18} color="#FFFFFF" />
        <Text style={controls.saveBtnText}>Save</Text>
      </Pressable>
    </GlassCard>
  );
}
