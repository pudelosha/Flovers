// src/features/profile/pages/ProfileScreen.tsx
import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GlassHeader from "../../../shared/ui/GlassHeader";
import { useAuth } from "../../../app/providers/useAuth";

import { layout as ly, prompts as pr } from "../styles/profile.styles";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/profile.constants";
import type { PromptKey, LangCode } from "../types/profile.types";

import AccountCard from "../components/AccountCard";
import NotificationsCard from "../components/NotificationsCard";
import SettingsCard from "../components/SettingsCard";
import SupportCard from "../components/SupportCard";

function formatDate(d?: string | Date | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  // PROMPTS
  const [prompt, setPrompt] = useState<PromptKey | "contact" | null>(null);

  // Notifications state
  const [emailDaily, setEmailDaily] = useState(true);
  const [emailHour, setEmailHour] = useState(12);
  const [email24h, setEmail24h] = useState(false);
  const [pushDaily, setPushDaily] = useState(true);
  const [pushHour, setPushHour] = useState(12);
  const [push24h, setPush24h] = useState(false);

  const formatHour = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const incHour = (h: number) => (h + 1) % 24;
  const decHour = (h: number) => (h + 23) % 24;

  // Settings state
  const [language, setLanguage] = useState<LangCode>("en");
  const [langOpen, setLangOpen] = useState(false);
  const [dateFormat, setDateFormat] = useState<string>("DD.MM.YYYY");
  const [dateOpen, setDateOpen] = useState(false);
  const [tileTransparency, setTileTransparency] = useState<number>(0.12);

  const [temperatureUnit, setTemperatureUnit] = useState<"C" | "F" | "K">("C");
  const [measureUnit, setMeasureUnit] = useState<"metric" | "imperial">("metric");
  const [tempOpen, setTempOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER (no submenu, no right icon) */}
      <GlassHeader
        title="Profile"
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

      {/* CONTENT: all “subpages” combined */}
      <ScrollView contentContainerStyle={[ly.content, { paddingBottom: insets.bottom + 120 }]}>
        <AccountCard
          email={user?.email}
          createdText={formatDate((user as any)?.date_joined)}
          onPrompt={setPrompt}
          onLogout={logout}
        />

        <NotificationsCard
          emailDaily={emailDaily} setEmailDaily={setEmailDaily}
          emailHour={emailHour} setEmailHour={setEmailHour}
          email24h={email24h} setEmail24h={setEmail24h}
          pushDaily={pushDaily} setPushDaily={setPushDaily}
          pushHour={pushHour} setPushHour={setPushHour}
          push24h={push24h} setPush24h={setPush24h}
          formatHour={formatHour} incHour={incHour} decHour={decHour}
          onSave={() => { /* TODO: persist notifications later */ }}
        />

        <SettingsCard
          language={language} setLanguage={setLanguage}
          langOpen={langOpen} setLangOpen={setLangOpen}
          dateFormat={dateFormat} setDateFormat={setDateFormat}
          dateOpen={dateOpen} setDateOpen={setDateOpen}
          // NEW
          temperatureUnit={temperatureUnit} setTemperatureUnit={setTemperatureUnit}
          tempOpen={tempOpen} setTempOpen={setTempOpen}
          measureUnit={measureUnit} setMeasureUnit={setMeasureUnit}
          measureOpen={measureOpen} setMeasureOpen={setMeasureOpen}
          tileTransparency={tileTransparency} setTileTransparency={setTileTransparency}
          onSave={() => { /* TODO: persist settings later */ }}
        />

        <SupportCard
          onContact={() => setPrompt("contact")}
          onBug={() => setPrompt("bug")}
        />
      </ScrollView>

      {/* PROMPTS / MODALS */}
      {prompt && (
        <>
          <Pressable style={pr.backdrop} onPress={() => setPrompt(null)} />
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

            {prompt === "email" && (
              <View style={pr.promptInner}>
                <Text style={pr.promptTitle}>Change email</Text>
                <TextInput style={pr.input} placeholder="New email" placeholderTextColor="rgba(255,255,255,0.7)" />
                <TextInput style={pr.input} placeholder="Current password" placeholderTextColor="rgba(255,255,255,0.7)" secureTextEntry />
                <View style={pr.promptButtonsRow}>
                  <Pressable style={pr.promptBtn} onPress={() => setPrompt(null)}>
                    <Text style={pr.promptBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[pr.promptBtn, pr.promptPrimary]}>
                    <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>Change</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {prompt === "password" && (
              <View style={pr.promptInner}>
                <Text style={pr.promptTitle}>Change password</Text>
                <TextInput style={pr.input} placeholder="Current password" placeholderTextColor="rgba(255,255,255,0.7)" secureTextEntry />
                <TextInput style={pr.input} placeholder="New password" placeholderTextColor="rgba(255,255,255,0.7)" secureTextEntry />
                <TextInput style={pr.input} placeholder="Confirm new password" placeholderTextColor="rgba(255,255,255,0.7)" secureTextEntry />
                <View style={pr.promptButtonsRow}>
                  <Pressable style={pr.promptBtn} onPress={() => setPrompt(null)}>
                    <Text style={pr.promptBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[pr.promptBtn, pr.promptPrimary]}>
                    <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>Update</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {prompt === "delete" && (
              <View style={pr.promptInner}>
                <Text style={pr.promptTitle}>Delete account</Text>
                <Text style={pr.warningText}>
                  This action is irreversible. If you proceed, your account and data will be permanently deleted.
                </Text>
                <TextInput style={pr.input} placeholder="Enter password to confirm" placeholderTextColor="rgba(255,255,255,0.7)" secureTextEntry />
                <View style={pr.promptButtonsRow}>
                  <Pressable style={pr.promptBtn} onPress={() => setPrompt(null)}>
                    <Text style={pr.promptBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[pr.promptBtn, pr.promptDanger]}>
                    <Text style={[pr.promptBtnText, pr.promptDangerText]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {prompt === "bug" && (
              <View style={pr.promptInner}>
                <Text style={pr.promptTitle}>Report a bug</Text>
                <TextInput style={pr.input} placeholder="Subject" placeholderTextColor="rgba(255,255,255,0.7)" />
                <TextInput
                  style={[pr.input, { height: 120, textAlignVertical: "top", paddingTop: 10 }]}
                  placeholder="Describe the issue…"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  multiline
                />
                <View style={pr.promptButtonsRow}>
                  <Pressable style={pr.promptBtn} onPress={() => setPrompt(null)}>
                    <Text style={pr.promptBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[pr.promptBtn, pr.promptPrimary]}>
                    <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>Send</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {prompt === "contact" && (
              <View style={pr.promptInner}>
                <Text style={pr.promptTitle}>Contact us</Text>
                <TextInput style={pr.input} placeholder="Subject" placeholderTextColor="rgba(255,255,255,0.7)" />
                <TextInput
                  style={[pr.input, { height: 120, textAlignVertical: "top", paddingTop: 10 }]}
                  placeholder="How can we help?"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  multiline
                />
                <View style={pr.promptButtonsRow}>
                  <Pressable style={pr.promptBtn} onPress={() => setPrompt(null)}>
                    <Text style={pr.promptBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[pr.promptBtn, pr.promptPrimary]}>
                    <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>Send</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}
