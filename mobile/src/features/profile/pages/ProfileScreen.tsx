import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, ScrollView, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import GlassHeader from "../../../shared/ui/GlassHeader";
import { useAuth } from "../../../app/providers/useAuth";
import { useSettings } from "../../../app/providers/SettingsProvider";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import { layout as ly } from "../styles/profile.styles";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../constants/profile.constants";
import type { PromptKey } from "../types/profile.types";

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
} from "../../../api/services/profile.service";

// Modals
import ChangeEmailModal from "../components/modals/ChangeEmailModal";
import ChangePasswordModal from "../components/modals/ChangePasswordModal";
import DeleteAccountModal from "../components/modals/DeleteAccountModal";
import ContactUsModal from "../components/modals/ContactUsModal";
import ReportBugModal from "../components/modals/ReportBugModal";

function formatDate(d?: string | Date | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

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
  const { settings, loading: settingsLoading, applyServerSettings } = useSettings();
  const { changeLanguage: changeAppLanguage, currentLanguage } = useLanguage();

  const scrollRef = useRef<ScrollView | null>(null);
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  // PROMPTS (modal selector)
  const [prompt, setPrompt] = useState<PromptKey | "contact" | "bug" | null>(null);

  // Loading state (notifications only)
  const [loading, setLoading] = useState<boolean>(true);

  // Saving states
  const [savingNotif, setSavingNotif] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVariant, setToastVariant] = useState<"default" | "success" | "error">("default");

  const showToast = (msg: string, variant: "default" | "success" | "error" = "default") => {
    setToastMsg(msg);
    setToastVariant(variant);
    setToastVisible(true);
  };
  const hideToast = () => setToastVisible(false);

  // Notifications
  const [emailDaily, setEmailDaily] = useState(true);
  const [emailHour, setEmailHour] = useState(12);
  const [email24h, setEmail24h] = useState(false);
  const [pushDaily, setPushDaily] = useState(true);
  const [pushHour, setPushHour] = useState(12);
  const [push24h, setPush24h] = useState(false);

  const formatHour = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const incHour = (h: number) => (h + 1) % 24;
  const decHour = (h: number) => (h + 23) % 24;

  // Local settings form (init once from global)
  const [formInitialized, setFormInitialized] = useState(false);

  const [language, setLanguage] = useState(settings.language);
  const [langOpen, setLangOpen] = useState(false);

  const [dateFormat, setDateFormat] = useState(settings.dateFormat);
  const [dateOpen, setDateOpen] = useState(false);

  const [temperatureUnit, setTemperatureUnit] = useState(settings.temperatureUnit);
  const [measureUnit, setMeasureUnit] = useState(settings.measureUnit);
  const [tempOpen, setTempOpen] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);

  const [tileTransparency, setTileTransparency] = useState(settings.tileTransparency);

  const [background, setBackground] = useState(settings.background);
  const [bgOpen, setBgOpen] = useState(false);

  const [tileMotive, setTileMotive] = useState(settings.tileMotive);
  const [tileMotiveOpen, setTileMotiveOpen] = useState(false);

  const [fabPosition, setFabPosition] = useState(settings.fabPosition);
  const [fabOpen, setFabOpen] = useState(false);

  // Initial fetch: notifications
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const notif = await fetchProfileNotifications({ auth: true });
        if (!isMounted) return;

        setEmailDaily(!!notif.email_daily);
        setEmailHour(typeof notif.email_hour === "number" ? notif.email_hour : 12);
        setEmail24h(!!notif.email_24h);
        setPushDaily(!!notif.push_daily);
        setPushHour(typeof notif.push_hour === "number" ? notif.push_hour : 12);
        setPush24h(!!notif.push_24h);
      } catch (e: any) {
        console.warn("Failed to load profile notifications", e);
        if (isUnauthorizedError(e)) showToast(t("profile.toasts.unauthorized"), "error");
        else showToast(t("profile.toasts.failedToLoadPreferences"), "error");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [t]);

  // Init local settings from global settings once
  useEffect(() => {
    if (formInitialized) return;
    if (settingsLoading) return;

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
      if (isUnauthorizedError(e)) showToast(t("profile.toasts.unauthorized"), "error");
      else showToast(t("profile.toasts.couldNotSaveNotifications"), "error");
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

      applyServerSettings(res);

      if (language && language !== currentLanguage) {
        await changeAppLanguage(language);
      }

      showToast(t("profile.toasts.settingsUpdated"), "success");
    } catch (e: any) {
      console.warn("Failed to save settings", e);
      if (isUnauthorizedError(e)) showToast(t("profile.toasts.unauthorized"), "error");
      else showToast(t("profile.toasts.couldNotSaveSettings"), "error");
    } finally {
      setSavingSettings(false);
    }
  };

  // enter/exit animation
  const entry = useRef(new Animated.Value(0)).current;
  const contentOpacity = entry;
  const contentTranslateY = entry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const contentScale = entry.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  useFocusEffect(
    useCallback(() => {
      scrollToTop();

      Animated.timing(entry, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

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

  const showLoadingOverlay = loading || settingsLoading || !formInitialized;

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title={t("profile.header.title")}
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
      />

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

      {showLoadingOverlay && <CenteredSpinner overlay size={48} color="#FFFFFF" />}
      {savingNotif && <CenteredSpinner overlay size={36} color="#FFFFFF" />}
      {savingSettings && <CenteredSpinner overlay size={36} color="#FFFFFF" />}

      {/* MODALS */}
      <ChangeEmailModal
        visible={prompt === "email"}
        onClose={() => setPrompt(null)}
        showToast={showToast}
      />
      <ChangePasswordModal
        visible={prompt === "password"}
        onClose={() => setPrompt(null)}
        showToast={showToast}
      />
      <DeleteAccountModal
        visible={prompt === "delete"}
        onClose={() => setPrompt(null)}
        showToast={showToast}
      />
      <ContactUsModal
        visible={prompt === "contact"}
        onClose={() => setPrompt(null)}
        showToast={showToast}
      />
      <ReportBugModal
        visible={prompt === "bug"}
        onClose={() => setPrompt(null)}
        showToast={showToast}
      />

      <TopSnackbar
        visible={toastVisible}
        message={toastMsg}
        variant={toastVariant}
        onDismiss={hideToast}
      />
    </View>
  );
}
