import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import GlassCard from "./../components/GlassCard";
import Dropdown from "./../components/Dropdown";
import { card, controls } from "../styles/profile.styles";
import { LANG_OPTIONS, DATE_OPTIONS, BACKGROUND_OPTIONS, FAB_POSITION_OPTIONS } from "../constants/profile.constants";
import type { LangCode, FabPosition, BackgroundKey, TileMotive } from "../types/profile.types";

// Try slider if installed
let SliderView: any = View;
try { SliderView = require("@react-native-community/slider").default; } catch {}

type TempUnit = "C" | "F" | "K";
type MeasureUnit = "metric" | "imperial";

export default function SettingsCard({
  language, setLanguage, langOpen, setLangOpen,
  dateFormat, setDateFormat, dateOpen, setDateOpen,
  temperatureUnit, setTemperatureUnit, tempOpen, setTempOpen,
  measureUnit, setMeasureUnit, measureOpen, setMeasureOpen,
  tileTransparency, setTileTransparency,
  // NEW props
  background, setBackground, bgOpen, setBgOpen,
  tileMotive, setTileMotive, tileMotiveOpen, setTileMotiveOpen,
  fabPosition, setFabPosition, fabOpen, setFabOpen,
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

  // NEW: Background + Tile motive + FAB position
  background: BackgroundKey; setBackground: (b: BackgroundKey) => void;
  bgOpen: boolean; setBgOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  tileMotive: TileMotive; setTileMotive: (m: TileMotive) => void;
  tileMotiveOpen: boolean; setTileMotiveOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  fabPosition: FabPosition; setFabPosition: (p: FabPosition) => void;
  fabOpen: boolean; setFabOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  onSave: () => void;
}) {
  const { t } = useTranslation();
  const currentLang = LANG_OPTIONS.find(l => l.code === language);

  const TEMP_OPTIONS: { key: TempUnit; label: string }[] = [
    { key: "C", label: t("profile.settings.temperatureOptions.C") },
    { key: "F", label: t("profile.settings.temperatureOptions.F") },
    { key: "K", label: t("profile.settings.temperatureOptions.K") },
  ];

  const MEASURE_OPTIONS: { key: MeasureUnit; label: string }[] = [
    { key: "metric", label: t("profile.settings.measureOptions.metric") },
    { key: "imperial", label: t("profile.settings.measureOptions.imperial") },
  ];

  // Tile motive options
  const TILE_MOTIVE_OPTIONS: { key: TileMotive; label: string }[] = [
    { key: "light", label: t("profile.settings.tileMotiveOptions.light") },
    { key: "dark", label: t("profile.settings.tileMotiveOptions.dark") },
  ];

  const bgLabel = (k: BackgroundKey) => {
    if (k === "bg1") return t("profile.settings.backgroundOptions.bg1");
    if (k === "bg2") return t("profile.settings.backgroundOptions.bg2");
    if (k === "bg3") return t("profile.settings.backgroundOptions.bg3");
    if (k === "bg4") return t("profile.settings.backgroundOptions.bg4");
    return t("profile.settings.backgroundOptions.bg5");
  };

  const fabLabel = (k: "left" | "right") => {
    return k === "left"
      ? t("profile.settings.fabPositionOptions.left")
      : t("profile.settings.fabPositionOptions.right");
  };

  return (
    <GlassCard>
      <Text style={card.cardTitle}>{t("profile.settings.title")}</Text>

      {/* LANGUAGE */}
      <Text style={[controls.sectionTitle, controls.sectionTitleFirst]}>
        {t("profile.settings.language")}
      </Text>
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
      <Text style={controls.sectionTitle}>{t("profile.settings.dateTimeFormat")}</Text>
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
      <Text style={controls.sectionTitle}>{t("profile.settings.temperatureUnits")}</Text>
      <Dropdown
        open={tempOpen}
        valueText={TEMP_OPTIONS.find(tu => tu.key === temperatureUnit)?.label ?? t("profile.settings.temperatureOptions.C")}
        onToggle={() => setTempOpen((o: boolean) => !o)}
        items={TEMP_OPTIONS.map(opt => ({
          key: opt.key,
          text: opt.label,
          selected: temperatureUnit === opt.key,
          onPress: () => { setTemperatureUnit(opt.key); setTempOpen(false); },
        }))}
      />

      {/* MEASUREMENT UNITS */}
      <Text style={controls.sectionTitle}>{t("profile.settings.measurementUnits")}</Text>
      <Dropdown
        open={measureOpen}
        valueText={MEASURE_OPTIONS.find(m => m.key === measureUnit)?.label ?? t("profile.settings.measureOptions.metric")}
        onToggle={() => setMeasureOpen((o: boolean) => !o)}
        items={MEASURE_OPTIONS.map(opt => ({
          key: opt.key,
          text: opt.label,
          selected: measureUnit === opt.key,
          onPress: () => { setMeasureUnit(opt.key); setMeasureOpen(false); },
        }))}
      />

      {/* NEW: FAB POSITION */}
      <Text style={controls.sectionTitle}>{t("profile.settings.fabPosition")}</Text>
      <Dropdown
        open={fabOpen}
        valueText={fabLabel(FAB_POSITION_OPTIONS.find(f => f.key === fabPosition)?.key ?? "right")}
        onToggle={() => setFabOpen((o: boolean) => !o)}
        items={FAB_POSITION_OPTIONS.map(opt => ({
          key: opt.key,
          text: fabLabel(opt.key),
          selected: fabPosition === opt.key,
          onPress: () => { setFabPosition(opt.key as FabPosition); setFabOpen(false); },
        }))}
      />

      {/* NEW: BACKGROUND (placed above Tiles transparency) */}
      <Text style={controls.sectionTitle}>{t("profile.settings.background")}</Text>
      <Dropdown
        open={bgOpen}
        valueText={bgLabel(BACKGROUND_OPTIONS.find(b => b.key === background)?.key ?? "bg1")}
        onToggle={() => setBgOpen((o: boolean) => !o)}
        items={BACKGROUND_OPTIONS.map(opt => ({
          key: opt.key,
          text: bgLabel(opt.key),
          selected: background === opt.key,
          onPress: () => { setBackground(opt.key as BackgroundKey); setBgOpen(false); },
        }))}
      />

      {/* NEW: TILE MOTIVE */}
      <Text style={controls.sectionTitle}>{t("profile.settings.tileMotive")}</Text>
      <Dropdown
        open={tileMotiveOpen}
        valueText={TILE_MOTIVE_OPTIONS.find(ti => ti.key === tileMotive)?.label ?? t("profile.settings.tileMotiveOptions.light")}
        onToggle={() => setTileMotiveOpen((o: boolean) => !o)}
        items={TILE_MOTIVE_OPTIONS.map(opt => ({
          key: opt.key,
          text: opt.label,
          selected: tileMotive === opt.key,
          onPress: () => { setTileMotive(opt.key); setTileMotiveOpen(false); },
        }))}
      />

      {/* TILE TRANSPARENCY */}
      <Text style={controls.sectionTitle}>{t("profile.settings.tilesTransparency")}</Text>
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
          <Text style={controls.stepperLabel}>{t("profile.settings.level")}</Text>
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
        <Text style={controls.saveBtnText}>{t("profile.common.save")}</Text>
      </Pressable>
    </GlassCard>
  );
}
