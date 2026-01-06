import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import GlassCard from "./../components/GlassCard";
import { card, controls } from "../styles/profile.styles";
import { HourStepper } from "./../components/Stepper";

export default function NotificationsCard({
  emailDaily, setEmailDaily, emailHour, setEmailHour, email24h, setEmail24h,
  pushDaily, setPushDaily, pushHour, setPushHour, push24h, setPush24h,
  formatHour, incHour, decHour,
  onSave,
}: {
  emailDaily: boolean; setEmailDaily: (v: boolean | ((v: boolean) => boolean)) => void;
  emailHour: number; setEmailHour: (v: number | ((v: number) => number)) => void;
  email24h: boolean; setEmail24h: (v: boolean | ((v: boolean) => boolean)) => void;
  pushDaily: boolean; setPushDaily: (v: boolean | ((v: boolean) => boolean)) => void;
  pushHour: number; setPushHour: (v: number | ((v: number) => number)) => void;
  push24h: boolean; setPush24h: (v: boolean | ((v: boolean) => boolean)) => void;
  formatHour: (h: number) => string;
  incHour: (h: number) => number;
  decHour: (h: number) => number;
  onSave: () => void;
}) {
  const { t } = useTranslation();

  return (
    <GlassCard>
      <Text style={card.cardTitle}>{t("profile.notifications.title")}</Text>

      {/* EMAIL SECTION */}
      <Text style={[controls.sectionTitle, controls.sectionTitleFirst]}>
        {t("profile.notifications.emailSection")}
      </Text>

      <Pressable
        style={controls.toggleRow}
        onPress={() => setEmailDaily((v: boolean) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: emailDaily }}
      >
        <MaterialCommunityIcons
          name={emailDaily ? "checkbox-marked-outline" : "checkbox-blank-outline"}
          size={20}
          color="#FFFFFF"
          style={controls.toggleIcon}
        />
        <View style={{ flex: 1 }}>
          <Text style={controls.toggleLabel}>{t("profile.notifications.emailDailyLabel")}</Text>
          <Text style={controls.toggleHint}>{t("profile.notifications.emailDailyHint")}</Text>
        </View>
      </Pressable>

      {emailDaily && (
        <HourStepper
          label={t("profile.notifications.sendAt")}
          value={formatHour(emailHour)}
          onDec={() => setEmailHour((h: number) => decHour(h))}
          onInc={() => setEmailHour((h: number) => incHour(h))}
        />
      )}

      <Pressable
        style={controls.toggleRow}
        onPress={() => setEmail24h((v: boolean) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: email24h }}
      >
        <MaterialCommunityIcons
          name={email24h ? "checkbox-marked-outline" : "checkbox-blank-outline"}
          size={20}
          color="#FFFFFF"
          style={controls.toggleIcon}
        />
        <View style={{ flex: 1 }}>
          <Text style={controls.toggleLabel}>{t("profile.notifications.email24hLabel")}</Text>
          <Text style={controls.toggleHint}>{t("profile.notifications.email24hHint")}</Text>
        </View>
      </Pressable>

      <View style={controls.sectionDivider} />

      {/* MOBILE */}
      <Text style={controls.sectionTitle}>{t("profile.notifications.mobileSection")}</Text>

      <Pressable
        style={controls.toggleRow}
        onPress={() => setPushDaily((v: boolean) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: pushDaily }}
      >
        <MaterialCommunityIcons
          name={pushDaily ? "checkbox-marked-outline" : "checkbox-blank-outline"}
          size={20}
          color="#FFFFFF"
          style={controls.toggleIcon}
        />
        <View style={{ flex: 1 }}>
          <Text style={controls.toggleLabel}>{t("profile.notifications.pushDailyLabel")}</Text>
          <Text style={controls.toggleHint}>{t("profile.notifications.pushDailyHint")}</Text>
        </View>
      </Pressable>

      {pushDaily && (
        <HourStepper
          label={t("profile.notifications.notifyAt")}
          value={formatHour(pushHour)}
          onDec={() => setPushHour((h: number) => decHour(h))}
          onInc={() => setPushHour((h: number) => incHour(h))}
        />
      )}

      <Pressable
        style={controls.toggleRow}
        onPress={() => setPush24h((v: boolean) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: push24h }}
      >
        <MaterialCommunityIcons
          name={push24h ? "checkbox-marked-outline" : "checkbox-blank-outline"}
          size={20}
          color="#FFFFFF"
          style={controls.toggleIcon}
        />
        <View style={{ flex: 1 }}>
          <Text style={controls.toggleLabel}>{t("profile.notifications.push24hLabel")}</Text>
          <Text style={controls.toggleHint}>{t("profile.notifications.push24hHint")}</Text>
        </View>
      </Pressable>

      <Pressable style={controls.saveBtn} onPress={onSave}>
        <MaterialCommunityIcons name="content-save" size={18} color="#FFFFFF" />
        <Text style={controls.saveBtnText}>{t("profile.common.save")}</Text>
      </Pressable>
    </GlassCard>
  );
}
