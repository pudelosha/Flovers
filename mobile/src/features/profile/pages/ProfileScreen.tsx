import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";

import GlassHeader from "../../../shared/ui/GlassHeader";
import { useAuth } from "../../../app/providers/useAuth";

import { header as h, layout as ly, prompts as pr } from "../styles/profile.styles";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/profile.constants";
import type { TabKey, PromptKey, LangCode } from "../types/profile.types";

import AccountCard from "../components/AccountCard";
import NotificationsCard from "../components/NotificationsCard";
import SettingsCard from "../components/SettingsCard";

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

  const [tab, setTab] = useState<TabKey>("account");
  const [prompt, setPrompt] = useState<PromptKey>(null);

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

  const tabs = useMemo(
    () => [
      { key: "account" as const, label: "account", icon: "account-circle-outline" },
      { key: "notifications" as const, label: "notifications", icon: "bell-outline" },
      { key: "settings" as const, label: "settings", icon: "cog-outline" },
    ],
    []
  );

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER via shared GlassHeader */}
      <GlassHeader
        title="Profile"
        gradientColors={HEADER_GRADIENT_TINT}
        fallbackColor={HEADER_SOLID_FALLBACK}
        topPaddingExtra={10}
      >
        {/* Submenu exactly like before, now passed as children */}
        <View style={h.subRow}>
          <View style={h.subColLeft}>
            <Pressable style={h.subBtn} onPress={() => setTab("account")} hitSlop={8}>
              <View style={h.subBtnInner}>
                <Text style={[h.subBtnText, tab === "account" && h.subActive]}>account</Text>
                <MaterialCommunityIcons name="account-circle-outline" size={14} color="#FFFFFF" style={h.subIcon} />
              </View>
            </Pressable>
          </View>
          <View style={h.subColCenter}>
            <Pressable style={h.subBtn} onPress={() => setTab("notifications")} hitSlop={8}>
              <View style={h.subBtnInner}>
                <Text style={[h.subBtnText, tab === "notifications" && h.subActive]}>notifications</Text>
                <MaterialCommunityIcons name="bell-outline" size={14} color="#FFFFFF" style={h.subIcon} />
              </View>
            </Pressable>
          </View>
          <View style={h.subColRight}>
            <Pressable style={h.subBtn} onPress={() => setTab("settings")} hitSlop={8}>
              <View style={h.subBtnInner}>
                <Text style={[h.subBtnText, tab === "settings" && h.subActive]}>settings</Text>
                <MaterialCommunityIcons name="cog-outline" size={14} color="#FFFFFF" style={h.subIcon} />
              </View>
            </Pressable>
          </View>
        </View>
      </GlassHeader>

      {/* CONTENT */}
      <ScrollView contentContainerStyle={[ly.content, { paddingBottom: insets.bottom + 80 }]}>
        {tab === "account" && (
          <AccountCard
            email={user?.email}
            createdText={formatDate((user as any)?.date_joined)}
            onPrompt={setPrompt}
            onLogout={logout}
          />
        )}

        {tab === "notifications" && (
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
        )}

        {tab === "settings" && (
          <SettingsCard
            language={language} setLanguage={setLanguage}
            langOpen={langOpen} setLangOpen={setLangOpen}
            dateFormat={dateFormat} setDateFormat={setDateFormat}
            dateOpen={dateOpen} setDateOpen={setDateOpen}
            tileTransparency={tileTransparency} setTileTransparency={setTileTransparency}
            onBug={() => setPrompt("bug")}
            onSave={() => { /* TODO: persist settings later */ }}
          />
        )}
      </ScrollView>

      {/* PROMPTS (layout only) */}
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
          </View>
        </>
      )}
    </View>
  );
}
