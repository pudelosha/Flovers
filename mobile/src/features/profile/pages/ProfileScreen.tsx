// src/features/profile/pages/ProfileScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Animated, Easing } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import GlassHeader from "../../../shared/ui/GlassHeader";
import { useAuth } from "../../../app/providers/useAuth";
import { useSettings } from "../../../app/providers/SettingsProvider"; // 👈 NEW

import { layout as ly, prompts as pr } from "../styles/profile.styles";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/profile.constants";
import type {
  PromptKey,
  LangCode,
  FabPosition,
  BackgroundKey,
  TileMotive,
} from "../types/profile.types";

import AccountCard from "../components/AccountCard";
import NotificationsCard from "../components/NotificationsCard";
import SettingsCard from "../components/SettingsCard";
import SupportCard from "../components/SupportCard";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";
import TopSnackbar from "../../../shared/ui/TopSnackbar";

import {
  fetchProfileNotifications,
  updateProfileNotifications,
  updateProfileSettings,
  changeMyPassword,
  changeMyEmail,
} from "../../../api/services/profile.service";

function formatDate(d?: string | Date | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

// Shared helper: detect 401 / unauthorized like other screens
function isUnauthorizedError(e: any): boolean {
  const status = (e?.response?.status ?? e?.status) as number | undefined;
  const msg = String(e?.message ?? "").toLowerCase();
  return (
    status === 401 ||
    msg.includes("401") ||
    msg.includes("unauthorized") ||
    msg.includes("unauthorised")
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();

  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { settings, loading: settingsLoading, applyServerSettings } = useSettings(); // 👈 NEW

  // ✅ Keep Profile always scrolled to top when coming back
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  // PROMPTS
  const [prompt, setPrompt] = useState<PromptKey | "contact" | null>(null);

  // ---------- Loading state for initial fetch ----------
  // This now covers NOTIFICATIONS fetch; settings are handled by SettingsProvider.
  const [loading, setLoading] = useState<boolean>(true);
  // Optional save states
  const [savingNotif, setSavingNotif] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [savingChangeEmail, setSavingChangeEmail] = useState<boolean>(false);
  const [savingChangePassword, setSavingChangePassword] = useState<boolean>(false);

  // ---------- Toast (aligned with other screens) ----------
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] = useState<"default" | "success" | "error">("default");

  const showToast = (
    msg: string,
    variant: "default" | "success" | "error" = "default"
  ) => {
    setToastMsg(msg);
    setToastVariant(variant);
    setToastVisible(true);
  };
  const hideToast = () => setToastVisible(false);

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

  // ---------- Settings state (local form, synced with global settings) ----------
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

  // NEW: Tile motive (light/dark tiles)
  const [tileMotive, setTileMotive] = useState<TileMotive>("light");
  const [tileMotiveOpen, setTileMotiveOpen] = useState(false);

  // NEW: FAB position (right default)
  const [fabPosition, setFabPosition] = useState<FabPosition>("right");
  const [fabOpen, setFabOpen] = useState(false);

  // To avoid overwriting edits, initialize form from global settings once.
  const [formInitialized, setFormInitialized] = useState(false); // 👈 NEW

  // ---------- Prompt input state (change email/password) ----------
  const [newEmail, setNewEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const resetEmailPrompt = () => {
    setNewEmail("");
    setEmailCurrentPassword("");
  };
  const resetPasswordPrompt = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  // ---------- Initial fetch: NOTIFICATIONS only ----------
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const notif = await fetchProfileNotifications({ auth: true });

        if (!isMounted) return;

        // Apply Notifications
        setEmailDaily(!!notif.email_daily);
        setEmailHour(typeof notif.email_hour === "number" ? notif.email_hour : 12);
        setEmail24h(!!notif.email_24h);
        setPushDaily(!!notif.push_daily);
        setPushHour(typeof notif.push_hour === "number" ? notif.push_hour : 12);
        setPush24h(!!notif.push_24h);
      } catch (e: any) {
        console.warn("Failed to load profile notifications", e);
        if (isUnauthorizedError(e)) {
          showToast(t("profile.toasts.unauthorized"), "error");
        } else {
          showToast(t("profile.toasts.failedToLoadPreferences"), "error");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [t]);

  // ---------- Initialize local settings form from global settings ----------
  useEffect(() => {
    if (formInitialized) return;
    if (settingsLoading) return;

    // Copy values from global settings once
    setLanguage(settings.language);
    setDateFormat(settings.dateFormat);
    setTemperatureUnit(settings.temperatureUnit);
    setMeasureUnit(settings.measureUnit);
    setTileTransparency(settings.tileTransparency);
    setBackground(settings.background);
    setFabPosition(settings.fabPosition);
    setTileMotive(settings.tileMotive);

    setFormInitialized(true);
  }, [formInitialized, settings, settingsLoading]);

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
      showToast(t("profile.toasts.notificationsUpdated"), "success");
    } catch (e: any) {
      console.warn("Failed to save notifications", e);
      if (isUnauthorizedError(e)) {
        showToast(t("profile.toasts.unauthorized"), "error");
      } else {
        showToast(t("profile.toasts.couldNotSaveNotifications"), "error");
      }
    } finally {
      setSavingNotif(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const res = await updateProfileSettings(
        {
          language,
          date_format: dateFormat,
          temperature_unit: temperatureUnit,
          measure_unit: measureUnit,
          tile_transparency: tileTransparency,
          background,
          fab_position: fabPosition,
          tile_motive: tileMotive,
        },
        { auth: true }
      );
      // 👇 NEW: sync global settings with what backend returned
      applyServerSettings(res);
      showToast(t("profile.toasts.settingsUpdated"), "success");
    } catch (e: any) {
      console.warn("Failed to save settings", e);
      if (isUnauthorizedError(e)) {
        showToast(t("profile.toasts.unauthorized"), "error");
      } else {
        showToast(t("profile.toasts.couldNotSaveSettings"), "error");
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      showToast(t("profile.toasts.enterNewEmail"), "error");
      return;
    }
    if (!emailCurrentPassword) {
      showToast(t("profile.toasts.enterCurrentPassword"), "error");
      return;
    }
    try {
      setSavingChangeEmail(true);
      const res = await changeMyEmail(
        { new_email: newEmail.trim(), password: emailCurrentPassword },
        { auth: true }
      );
      showToast(res?.message || t("profile.toasts.emailUpdated"), "success");
      resetEmailPrompt();
      setPrompt(null);
    } catch (e: any) {
      console.warn("Change email failed", e);
      if (isUnauthorizedError(e)) {
        showToast(t("profile.toasts.unauthorizedLoginAgain"), "error");
      } else {
        showToast(t("profile.toasts.couldNotChangeEmail"), "error");
      }
    } finally {
      setSavingChangeEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      showToast(t("profile.toasts.enterCurrentPassword"), "error");
      return;
    }
    if (!newPassword) {
      showToast(t("profile.toasts.enterNewPassword"), "error");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast(t("profile.toasts.passwordsDoNotMatch"), "error");
      return;
    }
    try {
      setSavingChangePassword(true);
      const res = await changeMyPassword(
        { current_password: currentPassword, new_password: newPassword },
        { auth: true }
      );
      showToast(res?.message || t("profile.toasts.passwordUpdated"), "success");
      resetPasswordPrompt();
      setPrompt(null);
    } catch (e: any) {
      console.warn("Change password failed", e);
      if (isUnauthorizedError(e)) {
        showToast(t("profile.toasts.unauthorizedLoginAgain"), "error");
      } else {
        showToast(t("profile.toasts.couldNotChangePassword"), "error");
      }
    } finally {
      setSavingChangePassword(false);
    }
  };

  // ---------- ✨ ENTER/EXIT CONTENT ANIMATION (like Login/Scanner) ----------
  const entry = useRef(new Animated.Value(0)).current;
  const contentOpacity = entry;
  const contentTranslateY = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const contentScale = entry.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  useFocusEffect(
    useCallback(() => {
      // ✅ ensure top of the page whenever returning to Profile
      scrollToTop();

      // animate in on focus
      Animated.timing(entry, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      // animate out on blur
      return () => {
        Animated.timing(entry, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start();
      };
    }, [entry, scrollToTop])
  );

  const showLoadingOverlay = loading || settingsLoading || !formInitialized; // 👈 NEW

  return (
    <View style={{ flex: 1 }}>
      {/* HEADER (no submenu, no right icon) */}
      <GlassHeader
        title={t("profile.header.title")}
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

      {/* CONTENT: all “subpages” combined (animated wrapper) */}
      <Animated.View
        style={{
          flex: 1,
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }, { scale: contentScale }],
        }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[ly.content, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <AccountCard
            email={user?.email}
            createdText={formatDate((user as any)?.date_joined)}
            onPrompt={setPrompt}
            onLogout={logout}
          />

          <NotificationsCard
            emailDaily={emailDaily}
            setEmailDaily={setEmailDaily}
            emailHour={emailHour}
            setEmailHour={setEmailHour}
            email24h={email24h}
            setEmail24h={setEmail24h}
            pushDaily={pushDaily}
            setPushDaily={setPushDaily}
            pushHour={pushHour}
            setPushHour={setPushHour}
            push24h={push24h}
            setPush24h={setPush24h}
            formatHour={formatHour}
            incHour={incHour}
            decHour={decHour}
            onSave={handleSaveNotifications}
          />

          <SettingsCard
            language={language}
            setLanguage={setLanguage}
            langOpen={langOpen}
            setLangOpen={setLangOpen}
            dateFormat={dateFormat}
            setDateFormat={setDateFormat}
            dateOpen={dateOpen}
            setDateOpen={setDateOpen}
            // NEW
            temperatureUnit={temperatureUnit}
            setTemperatureUnit={setTemperatureUnit}
            tempOpen={tempOpen}
            setTempOpen={setTempOpen}
            measureUnit={measureUnit}
            setMeasureUnit={setMeasureUnit}
            measureOpen={measureOpen}
            setMeasureOpen={setMeasureOpen}
            tileTransparency={tileTransparency}
            setTileTransparency={setTileTransparency}
            // NEW props for Background + Tile motive + FAB position
            background={background}
            setBackground={setBackground}
            bgOpen={bgOpen}
            setBgOpen={setBgOpen}
            tileMotive={tileMotive}
            setTileMotive={setTileMotive}
            tileMotiveOpen={tileMotiveOpen}
            setTileMotiveOpen={setTileMotiveOpen}
            fabPosition={fabPosition}
            setFabPosition={setFabPosition}
            fabOpen={fabOpen}
            setFabOpen={setFabOpen}
            onSave={handleSaveSettings}
          />

          <SupportCard onContact={() => setPrompt("contact")} onBug={() => setPrompt("bug")} />
        </ScrollView>
      </Animated.View>

      {/* LOADING OVERLAY */}
      {showLoadingOverlay && <CenteredSpinner overlay size={48} color="#FFFFFF" />}

      {/* Optional small overlays while saving (non-blocking). Keep page interactive. */}
      {savingNotif && <CenteredSpinner overlay size={36} color="#FFFFFF" />}
      {savingSettings && <CenteredSpinner overlay size={36} color="#FFFFFF" />}
      {savingChangeEmail && <CenteredSpinner overlay size={36} color="#FFFFFF" />}
      {savingChangePassword && <CenteredSpinner overlay size={36} color="#FFFFFF" />}

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
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0,0.35)",
                } as any}
              />
            </View>

            {prompt === "email" && (
              <View style={pr.promptInner}>
                <Text style={pr.promptTitle}>{t("profile.prompts.changeEmail.title")}</Text>
                <TextInput
                  style={pr.input}
                  placeholder={t("profile.prompts.changeEmail.newEmailPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={pr.input}
                  placeholder={t("profile.prompts.changeEmail.currentPasswordPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                  value={emailCurrentPassword}
                  onChangeText={setEmailCurrentPassword}
                />
                <View style={pr.promptButtonsRow}>
                  <Pressable
                    style={pr.promptBtn}
                    onPress={() => {
                      resetEmailPrompt();
                      setPrompt(null);
                    }}
                  >
                    <Text style={pr.promptBtnText}>{t("profile.common.cancel")}</Text>
                  </Pressable>
                  <Pressable style={[pr.promptBtn, pr.promptPrimary]} onPress={handleChangeEmail}>
                    <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                      {t("profile.common.change")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {prompt === "password" && (
              <View style={pr.promptInner}>
                <Text style={pr.promptTitle}>{t("profile.prompts.changePassword.title")}</Text>
                <TextInput
                  style={pr.input}
                  placeholder={t("profile.prompts.changePassword.currentPasswordPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TextInput
                  style={pr.input}
                  placeholder={t("profile.prompts.changePassword.newPasswordPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TextInput
                  style={pr.input}
                  placeholder={t("profile.prompts.changePassword.confirmNewPasswordPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                />
                <View style={pr.promptButtonsRow}>
                  <Pressable
                    style={pr.promptBtn}
                    onPress={() => {
                      resetPasswordPrompt();
                      setPrompt(null);
                    }}
                  >
                    <Text style={pr.promptBtnText}>{t("profile.common.cancel")}</Text>
                  </Pressable>
                  <Pressable style={[pr.promptBtn, pr.promptPrimary]} onPress={handleChangePassword}>
                    <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                      {t("profile.prompts.changePassword.update")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {prompt === "delete" && (
              <View style={pr.promptInner}>
                <Text style={pr.promptTitle}>{t("profile.prompts.deleteAccount.title")}</Text>
                <Text style={pr.warningText}>{t("profile.prompts.deleteAccount.warning")}</Text>
                <TextInput
                  style={pr.input}
                  placeholder={t("profile.prompts.deleteAccount.passwordPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  secureTextEntry
                />
                <View style={pr.promptButtonsRow}>
                  <Pressable style={pr.promptBtn} onPress={() => setPrompt(null)}>
                    <Text style={pr.promptBtnText}>{t("profile.common.cancel")}</Text>
                  </Pressable>
                  <Pressable style={[pr.promptBtn, pr.promptDanger]}>
                    <Text style={[pr.promptBtnText, pr.promptDangerText]}>
                      {t("profile.common.delete")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {prompt === "bug" && (
              <View style={pr.promptInner}>
                <Text style={pr.promptTitle}>{t("profile.prompts.reportBug.title")}</Text>
                <TextInput
                  style={pr.input}
                  placeholder={t("profile.prompts.reportBug.subjectPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                />
                <TextInput
                  style={[pr.input, { height: 120, textAlignVertical: "top", paddingTop: 10 }]}
                  placeholder={t("profile.prompts.reportBug.descriptionPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  multiline
                />
                <View style={pr.promptButtonsRow}>
                  <Pressable style={pr.promptBtn} onPress={() => setPrompt(null)}>
                    <Text style={pr.promptBtnText}>{t("profile.common.cancel")}</Text>
                  </Pressable>
                  <Pressable style={[pr.promptBtn, pr.promptPrimary]}>
                    <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                      {t("profile.common.send")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {prompt === "contact" && (
              <View style={pr.promptInner}>
                <Text style={pr.promptTitle}>{t("profile.prompts.contactUs.title")}</Text>
                <TextInput
                  style={pr.input}
                  placeholder={t("profile.prompts.contactUs.subjectPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                />
                <TextInput
                  style={[pr.input, { height: 120, textAlignVertical: "top", paddingTop: 10 }]}
                  placeholder={t("profile.prompts.contactUs.messagePlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  multiline
                />
                <View style={pr.promptButtonsRow}>
                  <Pressable style={pr.promptBtn} onPress={() => setPrompt(null)}>
                    <Text style={pr.promptBtnText}>{t("profile.common.cancel")}</Text>
                  </Pressable>
                  <Pressable style={[pr.promptBtn, pr.promptPrimary]}>
                    <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                      {t("profile.common.send")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </>
      )}

      {/* Shared top toast */}
      <TopSnackbar
        visible={toastVisible}
        message={toastMsg}
        variant={toastVariant}
        onDismiss={hideToast}
      />
    </View>
  );
}
