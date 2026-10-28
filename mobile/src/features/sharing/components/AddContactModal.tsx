import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSharingPreview } from "../state/SharingPreviewProvider";
import ContactModalFrame from "./ContactModalFrame";
import { sharingStyles as s } from "./SharingUI";
import { prompts as pr } from "../../profile/styles/profile.styles";

type Props = { visible: boolean; onClose: () => void };

export default function AddContactModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { inviteContact } = useSharingPreview();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setIdentifier("");
      setError(null);
    }
  }, [visible]);

  const submit = () => {
    const result = inviteContact(identifier.trim());
    if (!result.ok) {
      const messages = {
        invalid: t("sharing.invite.invalid", { defaultValue: "Enter a valid email address or Flovers ID." }),
        self: t("sharing.invite.self", { defaultValue: "You cannot invite yourself." }),
        alreadyContact: t("sharing.invite.alreadyContact", { defaultValue: "This person is already in your contacts." }),
        alreadyPending: t("sharing.invite.alreadyPending", { defaultValue: "An invitation for this person is already pending." }),
      };
      setError(messages[result.reason]);
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
        returnKeyType="done"
        onSubmitEditing={() => { if (identifier.trim()) submit(); }}
      />
      <Text style={[s.hint, local.hint]}>
        {t("sharing.invite.hint", { defaultValue: "Try an email address or a Flovers ID. No invitation will be sent from this preview." })}
      </Text>
      {!!error && <Text style={[s.error, local.hint]} accessibilityRole="alert">{error}</Text>}
      <View style={pr.promptButtonsRow}>
        <Pressable accessibilityRole="button" style={pr.promptBtn} onPress={onClose}>
          <Text style={pr.promptBtnText}>{t("sharing.common.cancel", { defaultValue: "Cancel" })}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={!identifier.trim()}
          style={[pr.promptBtn, pr.promptPrimary, !identifier.trim() && local.disabled]} onPress={submit}>
          <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>{t("sharing.invite.action", { defaultValue: "Add invitation" })}</Text>
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
