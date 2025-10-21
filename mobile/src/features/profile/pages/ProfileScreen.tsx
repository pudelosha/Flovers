// src/features/profile/pages/ProfileScreen.tsx
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Alert } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GlassHeader from "../../../shared/ui/GlassHeader";
import { useAuth } from "../../../app/providers/useAuth";

import { layout as ly, prompts as pr } from "../styles/profile.styles";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/profile.constants";
import type { PromptKey, LangCode, FabPosition, BackgroundKey } from "../types/profile.types";

import AccountCard from "../components/AccountCard";
import NotificationsCard from "../components/NotificationsCard";
import SettingsCard from "../components/SettingsCard";
import SupportCard from "../components/SupportCard";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";

import {
  fetchProfileNotifications,
  fetchProfileSettings,
  updateProfileNotifications,
  updateProfileSettings,
} from "../../../api/services/profile.service";

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

  // ---------- Loading state for initial fetch ----------
  const [loading, setLoading] = useState<boolean>(true);
  // Optional save states
  const [savingNotif, setSavingNotif] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // ---------- Notifications state ----------
  const [emailDaily, setEmailDaily] = useState(true);
  const [emailHour, setEmailHour] = useState(12);
  const [email24h, setEmail24h] = useState(false);
  const [pushDaily, setPushDaily] = useState(true);
  const [pushHour, setPushHour] = useState(12);
  const [push24h, setPush24h] = useState(false);

  const formatHour = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const incHour = (h: number) => (h + 1) % 24;
  const decHour = (h: number) => (h + 23) % 24;

  // ---------- Settings state ----------
  const [language, setLanguage] = useState<LangCode>("en");
  const [langOpen, setLangOpen] = useState(false);
  const [dateFormat, setDateFormat] = useState<string>("DD.MM.YYYY");
  const [dateOpen, setDateOpen] = useState(false);
  const [tileTransparency, setTileTransparency] = useState<number>(0.12);

  const [temperatureUnit, setTemperatureUnit] = useState<"C" | "F" | "K">("C");
  const [measureUnit, setMeasureUnit] = useState<"metric" | "imperial">("metric");
  const [tempOpen, setTempOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);

  // NEW: Background selection (above tile transparency)
  const [background, setBackground] = useState<BackgroundKey>("bg1");
  const [bgOpen, setBgOpen] = useState(false);

  // NEW: FAB position (right default)
  const [fabPosition, setFabPosition] = useState<FabPosition>("right");
  const [fabOpen, setFabOpen] = useState(false);

  // ---------- Initial fetch ----------
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [notif, settings] = await Promise.all([
          fetchProfileNotifications({ auth: true }),
          fetchProfileSettings({ auth: true }),
        ]);

        if (!isMounted) return;

        // Apply Notifications
        setEmailDaily(!!notif.email_daily);
        setEmailHour(typeof notif.email_hour === "number" ? notif.email_hour : 12);
        setEmail24h(!!notif.email_24h);
        setPushDaily(!!notif.push_daily);
        setPushHour(typeof notif.push_hour === "number" ? notif.push_hour : 12);
        setPush24h(!!notif.push_24h);

        // Apply Settings
        setLanguage((settings.language as LangCode) ?? "en");
        setDateFormat(settings.date_format ?? "DD.MM.YYYY");
        setTemperatureUnit((settings.temperature_unit as "C" | "F" | "K") ?? "C");
        setMeasureUnit((settings.measure_unit as "metric" | "imperial") ?? "metric");
        setTileTransparency(typeof settings.tile_transparency === "number" ? settings.tile_transparency : 0.12);
        setBackground((settings.background as BackgroundKey) ?? "bg1");
        setFabPosition((settings.fab_position as FabPosition) ?? "right");
      } catch (e: any) {
        console.warn("Failed to load profile data", e);
        Alert.alert("Error", "Failed to load Profile preferences. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // ---------- Save handlers ----------
  const handleSaveNotifications = async () => {
    try {
      setSavingNotif(true);
      await updateProfileNotifications(
        {
          email_daily: emailDaily,
          email_hour: emailHour,
          email_24h: email24h,
          push_daily: pushDaily,
          push_hour: pushHour,
          push_24h: push24h,
        },
        { auth: true }
      );
      Alert.alert("Saved", "Notification preferences updated.");
    } catch (e: any) {
      console.warn("Failed to save notifications", e);
      Alert.alert("Error", "Could not save notification preferences.");
    } finally {
      setSavingNotif(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await updateProfileSettings(
        {
          language,
          date_format: dateFormat,
          temperature_unit: temperatureUnit,
          measure_unit: measureUnit,
          tile_transparency: tileTransparency,
          background,
          fab_position: fabPosition,
        },
        { auth: true }
      );
      Alert.alert("Saved", "Settings updated.");
    } catch (e: any) {
      console.warn("Failed to save settings", e);
      Alert.alert("Error", "Could not save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

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
          onSave={handleSaveNotifications}
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
          // NEW props for Background + FAB position
          background={background} setBackground={setBackground}
          bgOpen={bgOpen} setBgOpen={setBgOpen}
          fabPosition={fabPosition} setFabPosition={setFabPosition}
          fabOpen={fabOpen} setFabOpen={setFabOpen}
          onSave={handleSaveSettings}
        />

        <SupportCard
          onContact={() => setPrompt("contact")}
          onBug={() => setPrompt("bug")}
        />
      </ScrollView>

      {/* LOADING OVERLAY */}
      {loading && <CenteredSpinner overlay size={48} color="#FFFFFF" />}

      {/* Optional small overlays while saving (non-blocking). Keep page interactive. */}
      {savingNotif && <CenteredSpinner overlay size={36} color="#FFFFFF" />}
      {savingSettings && <CenteredSpinner overlay size={36} color="#FFFFFF" />}

      {/* PROMPTS / MODALS */}
      {prompt && (
        <>
          <Pressable style={pr.backdrop} onPress={() => setPrompt(null)} />
          <View style={pr.promptWrap}>
            <View style={pr.promptGlass}>
              <BlurView
                style={{ position: "absolute", inset: 0 } as any
                }
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
