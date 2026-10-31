import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../../app/providers/SettingsProvider";
import { useContacts } from "../state/ContactsProvider";
import { CONTACT_ERROR_MESSAGES } from "../types/contacts.types";
import ContactModalFrame from "./ContactModalFrame";
import Dropdown from "../../profile/components/Dropdown";
import { LANG_OPTIONS } from "../../profile/constants/profile.constants";
import { prompts as pr, controls } from "../../profile/styles/profile.styles";
import { sharingStyles as s } from "./SharingUI";

type Props = { visible: boolean; onClose: () => void };
export default function InviteByEmailModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { inviteByEmail, pending } = useContacts();
  const [email, setEmail] = useState("");
  const [language, setLanguage] = useState(settings.language);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const busy = pending !== null;
  useEffect(() => {
    revision.current += 1;
    if (visible) { setEmail(""); setLanguage(settings.language); setOpen(false); setError(null); }
  }, [visible]);
  const submit = async () => {
    if (busy) return;
    const request = revision.current;
    const result = await inviteByEmail(email, language);
    if (request !== revision.current) return;
    if (result.ok) { onClose(); return; }
    if (result.reason !== "busy" && result.reason !== "staleSession") {
      setError(t(`sharing.errors.${result.reason}`, { defaultValue: CONTACT_ERROR_MESSAGES[result.reason] }));
    }
  };
  const selected = LANG_OPTIONS.find(item => item.code === language);
  return <ContactModalFrame visible={visible} title={t("sharing.emailInvite.title")} onClose={onClose} centerContent={!open}>
    <Text style={[s.hint, { marginHorizontal: 16, marginBottom: 16 }]}>{t("sharing.emailInvite.description")}</Text>
    <Text style={[controls.sectionTitle, { marginTop: 0, marginHorizontal: 16 }]}>{t("sharing.emailInvite.email")}</Text>
    <TextInput style={pr.input} value={email} onChangeText={value => { setEmail(value); setError(null); }}
      accessibilityLabel={t("sharing.emailInvite.email")} keyboardType="email-address" autoCapitalize="none"
      autoCorrect={false} editable={!busy} placeholder="name@example.com" placeholderTextColor="rgba(255,255,255,0.5)" />
    <Text style={[controls.sectionTitle, { marginHorizontal: 16 }]}>{t("sharing.emailInvite.language")}</Text>
    <View style={{ marginHorizontal: 16 }}>
    <Dropdown open={open} valueText={`${selected?.flag ?? ""} ${selected?.label ?? ""}`}
      onToggle={() => { if (!busy) setOpen(value => !value); }}
      items={LANG_OPTIONS.map(item => ({ key: item.code, text: `${item.flag} ${item.label}`, selected: item.code === language,
        onPress: () => { if (!busy) { setLanguage(item.code); setOpen(false); } } }))} />
    </View>
    {!!error && <Text accessibilityRole="alert" style={[s.error, { marginHorizontal: 16 }]}>{error}</Text>}
    <View style={pr.promptButtonsRow}>
      <Pressable accessibilityRole="button" style={[pr.promptBtn, { flex: 1, minWidth: 0, alignItems: "center" }]} onPress={onClose}><Text style={[pr.promptBtnText, { textAlign: "center" }]}>{t("sharing.common.cancel")}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={!email.trim() || busy} onPress={submit}
        style={[pr.promptBtn, pr.promptPrimary, { flex: 1, minWidth: 0, alignItems: "center" }, (!email.trim() || busy) && { opacity: 0.45 }]}>
        <Text style={[pr.promptBtnText, pr.promptPrimaryText, { textAlign: "center" }]}>{t("sharing.invite.action")}</Text>
      </Pressable>
    </View>
  </ContactModalFrame>;
}
