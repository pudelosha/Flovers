import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useContacts } from "../state/ContactsProvider";
import { CONTACT_ERROR_MESSAGES } from "../types/contacts.types";
import ContactModalFrame from "./ContactModalFrame";
import { sharingStyles as s } from "./SharingUI";
import { prompts as pr } from "../../profile/styles/profile.styles";

type Props = { visible: boolean; onClose: () => void };

export default function AddContactModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { inviteContact, pending } = useContacts();
  const busy = pending !== null;
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);

  useEffect(() => {
    revision.current += 1;
    if (visible) {
      setIdentifier("");
      setError(null);
    }
  }, [visible]);

  const submit = async () => {
    if (busy) return;
    const request = revision.current;
    const result = await inviteContact(identifier.trim());
    if (request !== revision.current) return;
    if (!result.ok) {
      if (result.reason === "staleSession" || result.reason === "busy") return;
      setError(t(`sharing.errors.${result.reason}`, { defaultValue: CONTACT_ERROR_MESSAGES[result.reason] }));
      return;
    }
    onClose();
  };

  return (
    <ContactModalFrame
      visible={visible}
      title={t("sharing.invite.title", { defaultValue: "Add contact" })}
      onClose={onClose}
    >
      <Text style={[s.text, local.fieldLabel]}>{t("sharing.invite.label", { defaultValue: "Email or Flovers ID" })}</Text>
      <TextInput
        style={pr.input}
        value={identifier}
        onChangeText={(value) => { setIdentifier(value); setError(null); }}
        placeholder={t("sharing.invite.placeholder", { defaultValue: "name@example.com or FL-…" })}
        placeholderTextColor="rgba(255,255,255,0.5)"
        accessibilityLabel={t("sharing.invite.label", { defaultValue: "Email or Flovers ID" })}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
        returnKeyType="done"
        onSubmitEditing={() => { if (identifier.trim()) submit(); }}
      />
      <Text style={[s.hint, local.hint]}>
        {t("sharing.invite.realHint", { defaultValue: "Invite an existing Flovers account. Invitations appear in the app; no email is sent." })}
      </Text>
      {!!error && <Text style={[s.error, local.hint]} accessibilityRole="alert">{error}</Text>}
      <View style={pr.promptButtonsRow}>
        <Pressable accessibilityRole="button" style={pr.promptBtn} onPress={onClose}>
          <Text style={pr.promptBtnText}>{t("sharing.common.cancel", { defaultValue: "Cancel" })}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={!identifier.trim() || busy}
          style={[pr.promptBtn, pr.promptPrimary, (!identifier.trim() || busy) && local.disabled]} onPress={submit}>
          <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>{t("sharing.invite.action", { defaultValue: "Send invitation" })}</Text>
        </Pressable>
      </View>
    </ContactModalFrame>
  );
}

const local = StyleSheet.create({
  fieldLabel: { marginHorizontal: 16, marginBottom: 8 },
  hint: { marginHorizontal: 16, marginBottom: 10 },
  disabled: { opacity: 0.45 },
});
