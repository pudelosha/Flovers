import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import GlassCard from "./../components/GlassCard";
import { card, controls } from "../styles/profile.styles";
import { BUILD_INFO } from "../../../buildInfo";
import { useSettings } from "../../../app/providers/SettingsProvider";

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function formatDateBySettings(value?: string | Date | null, settings?: any) {
  if (!value) return "—";

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yyyy = String(d.getFullYear());

  const fmt = settings?.dateFormat;

  if (fmt === "mdy" || fmt === "MM/DD/YYYY" || fmt === "MM-DD-YYYY") {
    const sep = fmt === "MM-DD-YYYY" ? "-" : "/";
    return `${mm}${sep}${dd}${sep}${yyyy}`;
  }

  if (fmt === "ymd" || fmt === "YYYY-MM-DD" || fmt === "YYYY/MM/DD") {
    const sep = fmt === "YYYY/MM/DD" ? "/" : "-";
    return `${yyyy}${sep}${mm}${sep}${dd}`;
  }

  if (fmt === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  if (fmt === "DD-MM-YYYY") return `${dd}-${mm}-${yyyy}`;

  return `${dd}.${mm}.${yyyy}`;
}

export default function SupportCard({
  onContact,
  onBug,
}: {
  onContact: () => void;
  onBug: () => void;
}) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const releaseDateText = useMemo(
    () => formatDateBySettings(BUILD_INFO.releaseDate, settings),
    [settings]
  );

  return (
    <GlassCard>
      <Text style={card.cardTitle}>{t("profile.support.title")}</Text>

      {/* Contact Us */}
      <Pressable style={[controls.actionBtnFull, controls.actionPrimary]} onPress={onContact}>
        <MaterialCommunityIcons name="email-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, { color: "#FFFFFF" }]}>
          {t("profile.support.contactUs")}
        </Text>
      </Pressable>

      {/* Report a bug */}
      <Pressable style={[controls.actionBtnFull, controls.secondaryFull]} onPress={onBug}>
        <MaterialCommunityIcons name="bug-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, { color: "#FFFFFF" }]}>
          {t("profile.support.reportBug")}
        </Text>
      </Pressable>

      {/* About (moved from Settings) */}
      <View style={controls.sectionDivider} />
      <View style={controls.aboutBox}>
        <Text style={controls.aboutTitle}>{t("profile.support.aboutTitle")}</Text>
        <Text style={controls.aboutLine}>
          {t("profile.support.versionLabel")}: <Text style={controls.aboutStrong}>{BUILD_INFO.version}</Text>
        </Text>
        <Text style={controls.aboutLine}>
          {t("profile.support.releaseDateLabel")}: <Text style={controls.aboutStrong}>{releaseDateText}</Text>
        </Text>
        <Text style={controls.aboutLine}>
          Tag: <Text style={controls.aboutStrong}>{BUILD_INFO.releaseTag}</Text>
        </Text>
        <Text style={controls.aboutLine}>
          {t("profile.support.contactLabel")}: <Text style={controls.aboutStrong}>hello@flovers.app</Text>
        </Text>
      </View>
    </GlassCard>
  );
}