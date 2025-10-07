import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import GlassCard from "./components/GlassCard";
import Dropdown from "./components/Dropdown";
import { card, controls } from "./profile.styles";
import { LANG_OPTIONS, DATE_OPTIONS } from "./profile.constants";
import type { LangCode } from "./profile.types";

// Try slider if installed
let SliderView: any = View;
try { SliderView = require("@react-native-community/slider").default; } catch {}

export default function SettingsCard({
  language, setLanguage, langOpen, setLangOpen,
  dateFormat, setDateFormat, dateOpen, setDateOpen,
  tileTransparency, setTileTransparency,
  onBug, onSave,
}: {
  language: LangCode; setLanguage: (c: LangCode) => void;
  langOpen: boolean; setLangOpen: (o: boolean | ((o: boolean) => boolean)) => void;
  dateFormat: string; setDateFormat: (f: string) => void;
  dateOpen: boolean; setDateOpen: (o: boolean | ((o: boolean) => boolean)) => void;
  tileTransparency: number; setTileTransparency: (v: number | ((v: number) => number)) => void;
  onBug: () => void;
  onSave: () => void;
}) {
  return (
    <GlassCard>
      <Text style={card.cardTitle}>Settings</Text>

      {/* LANGUAGE */}
      <Text style={[controls.sectionTitle, controls.sectionTitleFirst]}>Language</Text>
      <Dropdown
        open={langOpen}
        valueText={`${LANG_OPTIONS.find(l => l.code === language)?.flag} ${LANG_OPTIONS.find(l => l.code === language)?.label}`}
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

      <View style={controls.sectionDivider} />

      {/* SUPPORT */}
      <Text style={controls.sectionTitle}>Support</Text>
      <Pressable style={[controls.actionBtnFull, controls.actionPrimary]} onPress={onBug}>
        <MaterialCommunityIcons name="bug-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, { color: "#FFFFFF" }]}>Report a bug</Text>
      </Pressable>

      <View style={controls.aboutBox}>
        <Text style={controls.aboutTitle}>About the app</Text>
        <Text style={controls.aboutLine}>Version: <Text style={controls.aboutStrong}>1.0.0</Text></Text>
        <Text style={controls.aboutLine}>Release date: <Text style={controls.aboutStrong}>07.10.2025</Text></Text>
        <Text style={controls.aboutLine}>Contact: <Text style={controls.aboutStrong}>hello@flovers.app</Text></Text>
      </View>
    </GlassCard>
  );
}
