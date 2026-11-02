import React from "react";
import { Text, Pressable } from "../../../shared/theme/native";
import { useTranslation } from "react-i18next";
import GlassCard from "./../components/GlassCard";
import Dropdown from "./../components/Dropdown";
import { card, controls } from "../styles/profile.styles";
import {
  LANG_OPTIONS,
  DATE_OPTIONS,
  FAB_POSITION_OPTIONS,
} from "../constants/profile.constants";
import {THEME_OPTIONS} from "../../../app/settings/themes";
import type {
  LangCode,
  FabPosition,
  ThemeMode,
  TileMotive,
} from "../types/profile.types";

type TempUnit = "C" | "F" | "K";
type MeasureUnit = "metric" | "imperial";

export default function SettingsCard({
  language,
  setLanguage,
  langOpen,
  setLangOpen,
  dateFormat,
  setDateFormat,
  dateOpen,
  setDateOpen,
  temperatureUnit,
  setTemperatureUnit,
  tempOpen,
  setTempOpen,
  measureUnit,
  setMeasureUnit,
  measureOpen,
  setMeasureOpen,
  tileTransparency: _tileTransparency,
  setTileTransparency: _setTileTransparency,
  theme,
  setTheme,
  themeOpen,
  setThemeOpen,
  tileMotive: _tileMotive,
  setTileMotive: _setTileMotive,
  tileMotiveOpen: _tileMotiveOpen,
  setTileMotiveOpen: _setTileMotiveOpen,
  fabPosition,
  setFabPosition,
  fabOpen,
  setFabOpen,
  onSave,
}: {
  language: LangCode;
  setLanguage: (c: LangCode) => void | Promise<void>;
  langOpen: boolean;
  setLangOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  dateFormat: string;
  setDateFormat: (f: string) => void;
  dateOpen: boolean;
  setDateOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  temperatureUnit: TempUnit;
  setTemperatureUnit: (u: TempUnit) => void;
  tempOpen: boolean;
  setTempOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  measureUnit: MeasureUnit;
  setMeasureUnit: (u: MeasureUnit) => void;
  measureOpen: boolean;
  setMeasureOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  // kept intentionally so parent save logic remains unchanged
  tileTransparency: number;
  setTileTransparency: (v: number | ((v: number) => number)) => void;

  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  themeOpen: boolean;
  setThemeOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  // kept intentionally so parent save logic remains unchanged
  tileMotive: TileMotive;
  setTileMotive: (m: TileMotive) => void;
  tileMotiveOpen: boolean;
  setTileMotiveOpen: (o: boolean | ((o: boolean) => boolean)) => void;

  fabPosition: FabPosition;
  setFabPosition: (p: FabPosition) => void;
  fabOpen: boolean;
  setFabOpen: (o: boolean | ((o: boolean) => boolean)) => void;

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

  const fabLabel = (k: "left" | "right") => {
    return k === "left"
      ? t("profile.settings.fabPositionOptions.left")
      : t("profile.settings.fabPositionOptions.right");
  };

  return (
    <GlassCard>
      <Text style={card.cardTitle}>{t("profile.settings.title")}</Text>

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
          onPress: () => {
            setLanguage(opt.code);
            setLangOpen(false);
          },
        }))}
      />

      <Text style={controls.sectionTitle}>
        {t("profile.settings.dateTimeFormat")}
      </Text>
      <Dropdown
        open={dateOpen}
        valueText={dateFormat}
        onToggle={() => setDateOpen((o: boolean) => !o)}
        items={DATE_OPTIONS.map(fmt => ({
          key: fmt,
          text: fmt,
          selected: dateFormat === fmt,
          onPress: () => {
            setDateFormat(fmt);
            setDateOpen(false);
          },
        }))}
      />

      <Text style={controls.sectionTitle}>
        {t("profile.settings.temperatureUnits")}
      </Text>
      <Dropdown
        open={tempOpen}
        valueText={
          TEMP_OPTIONS.find(tu => tu.key === temperatureUnit)?.label ??
          t("profile.settings.temperatureOptions.C")
        }
        onToggle={() => setTempOpen((o: boolean) => !o)}
        items={TEMP_OPTIONS.map(opt => ({
          key: opt.key,
          text: opt.label,
          selected: temperatureUnit === opt.key,
          onPress: () => {
            setTemperatureUnit(opt.key);
            setTempOpen(false);
          },
        }))}
      />

      <Text style={controls.sectionTitle}>
        {t("profile.settings.measurementUnits")}
      </Text>
      <Dropdown
        open={measureOpen}
        valueText={
          MEASURE_OPTIONS.find(m => m.key === measureUnit)?.label ??
          t("profile.settings.measureOptions.metric")
        }
        onToggle={() => setMeasureOpen((o: boolean) => !o)}
        items={MEASURE_OPTIONS.map(opt => ({
          key: opt.key,
          text: opt.label,
          selected: measureUnit === opt.key,
          onPress: () => {
            setMeasureUnit(opt.key);
            setMeasureOpen(false);
          },
        }))}
      />

      <Text style={controls.sectionTitle}>
        {t("profile.settings.fabPosition")}
      </Text>
      <Dropdown
        open={fabOpen}
        valueText={
          fabLabel(FAB_POSITION_OPTIONS.find(f => f.key === fabPosition)?.key ?? "right")
        }
        onToggle={() => setFabOpen((o: boolean) => !o)}
        items={FAB_POSITION_OPTIONS.map(opt => ({
          key: opt.key,
          text: fabLabel(opt.key),
          selected: fabPosition === opt.key,
          onPress: () => {
            setFabPosition(opt.key as FabPosition);
            setFabOpen(false);
          },
        }))}
      />

      <Text style={controls.sectionTitle}>{t("profile.settings.theme",{defaultValue:"Theme"})}</Text>
      <Dropdown open={themeOpen}
        valueText={String(t(`profile.settings.themeOptions.${theme}`,{defaultValue:"Dark"}))}
        onToggle={()=>setThemeOpen(open=>!open)}
        items={THEME_OPTIONS.map(option=>({
          key:option.key,
          text:String(t(`profile.settings.themeOptions.${option.key}`,{defaultValue:option.key==="dark" ? "Dark" : "Light"}))
            + (option.available ? "" : ` (${t("profile.settings.comingSoon",{defaultValue:"coming soon"})})`),
          selected:theme===option.key,disabled:!option.available,
          onPress:()=>{if(!option.available)return;setTheme(option.key);setThemeOpen(false);},
        }))}/>

      <Pressable style={controls.saveBtn} onPress={onSave}>
        <Text style={controls.saveBtnText}>{t("profile.common.save")}</Text>
      </Pressable>
    </GlassCard>
  );
}
