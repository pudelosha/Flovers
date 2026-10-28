import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import GlassCard from "../../profile/components/GlassCard";
import { card, controls } from "../../profile/styles/profile.styles";
import { useContacts } from "../state/ContactsProvider";
import CenteredSpinner from "../../../shared/ui/CenteredSpinner";

export default function SharingCard() {
  const { t } = useTranslation();
  const nav = useNavigation<any>();
  const { snapshot, loading, error, refresh } = useContacts();
  const focused = useIsFocused();
  useEffect(() => { if (focused) void refresh(); }, [focused, refresh]);
  const pending = snapshot?.counts.incoming ?? 0;
  return (
    <GlassCard>
      <View style={s.heading}>
        <Text style={[card.cardTitle, { marginBottom: 0 }]}>{t("sharing.profile.title", { defaultValue: "Sharing" })}</Text>
      </View>
      {!snapshot && loading ? <View style={{ height: 70 }}><CenteredSpinner size={28} /></View> : <>
      {!!snapshot && <>
      <Text style={s.summary}>{t("sharing.profile.contactCount", { defaultValue: "Contacts: {{count}}", count: snapshot.counts.contacts })}</Text>
      <Text style={s.pending}>{pending
        ? t("sharing.profile.pendingCount", { defaultValue: "Incoming requests: {{count}}", count: pending })
        : t("sharing.profile.noPending", { defaultValue: "No pending requests" })}</Text>
      </>}
      {!!error && <Pressable accessibilityRole="button" onPress={() => { void refresh(); }}>
        <Text style={s.pending}>{t("sharing.contacts.loadFailed", { defaultValue: "Could not load contacts." })} {t("sharing.contacts.retry", { defaultValue: "Try again" })}</Text>
      </Pressable>}
      </>}
      <Pressable style={[controls.actionBtnFull, controls.actionPrimary]} onPress={() => nav.navigate("Contacts")} accessibilityRole="button">
        <MaterialCommunityIcons name="account-multiple-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, s.buttonText]}>{t("sharing.profile.contacts", { defaultValue: "Contacts" })}</Text>
        {pending > 0 && <View style={s.badge}><Text style={s.badgeText}>{pending}</Text></View>}
      </Pressable>
      <Pressable style={[controls.actionBtnFull, controls.actionPrimary, { marginBottom: 0 }]} onPress={() => nav.navigate("SharedPlants")} accessibilityRole="button">
        <MaterialCommunityIcons name="share-variant-outline" size={18} color="#FFFFFF" />
        <Text style={[controls.actionBtnFullText, s.buttonText]}>{t("sharing.profile.sharedPlants", { defaultValue: "Shared plants" })}</Text>
      </Pressable>
      <Text style={s.note}>{t("sharing.profile.sharingPreviewNote", { defaultValue: "Plant sharing is still a preview. Contacts and invitations are live." })}</Text>
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
