import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import GlassCard from "../../profile/components/GlassCard";
import { card, controls } from "../../profile/styles/profile.styles";
import { useSharingPreview } from "../state/SharingPreviewProvider";

export default function SharingCard() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const { contacts, invitations } = useSharingPreview();
  const pending = invitations.filter((invitation) => invitation.direction === "incoming").length;
  return (
    <GlassCard>
      <View style={s.heading}>
        <Text style={[card.cardTitle, { marginBottom: 0 }]}>{t("sharing.profile.title", { defaultValue: "Sharing" })}</Text>
        <Text style={s.preview}>{t("sharing.preview.label", { defaultValue: "UI preview" })}</Text>
      </View>
      <Text style={s.summary}>{t("sharing.profile.contactCount", { defaultValue: "Contacts: {{count}}", count: contacts.length })}</Text>
      <Text style={s.pending}>{pending
        ? t("sharing.profile.pendingCount", { defaultValue: "Incoming requests: {{count}}", count: pending })
        : t("sharing.profile.noPending", { defaultValue: "No pending requests" })}</Text>
      <Pressable style={[controls.actionBtnFull, controls.actionPrimary]} onPress={() => nav.navigate("Contacts")} accessibilityRole="button">
        <MaterialCommunityIcons name="account-multiple-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, s.buttonText]}>{t("sharing.profile.contacts", { defaultValue: "Contacts" })}</Text>
        {pending > 0 && <View style={s.badge}><Text style={s.badgeText}>{pending}</Text></View>}
      </Pressable>
      <Pressable style={[controls.actionBtnFull, controls.actionPrimary, { marginBottom: 0 }]} onPress={() => nav.navigate("SharedPlants")} accessibilityRole="button">
        <MaterialCommunityIcons name="share-variant-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, s.buttonText]}>{t("sharing.profile.sharedPlants", { defaultValue: "Shared plants" })}</Text>
      </Pressable>
      <Text style={s.note}>{t("sharing.preview.notice", { defaultValue: "Sample contacts and sharing. Nothing is sent or shared." })}</Text>
    </GlassCard>
  );
}

const s = StyleSheet.create({
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 },
  preview: { color: "#99D9D1", fontSize: 10, fontWeight: "800" },
  summary: { color: "#FFFFFF", fontWeight: "700", marginBottom: 4 },
  pending: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginBottom: 14 },
  buttonText: { color: "#FFFFFF", flex: 1 },
  badge: { minWidth: 24, minHeight: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: "#0B7285", alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  note: { color: "rgba(255,255,255,0.64)", fontSize: 11, lineHeight: 16, marginTop: 12 },
});
