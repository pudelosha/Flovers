import React from "react";
import { View, Text, Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import GlassCard from "./../components/GlassCard";
import { card, controls } from "../styles/profile.styles";
import { BUILD_INFO } from "../../../buildInfo";

export default function SupportCard({
  onContact,
  onBug,
}: {
  onContact: () => void;
  onBug: () => void;
}) {
  const { t } = useTranslation();

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
          {t("profile.support.releaseDateLabel")}: <Text style={controls.aboutStrong}>{BUILD_INFO.releaseDate}</Text>
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