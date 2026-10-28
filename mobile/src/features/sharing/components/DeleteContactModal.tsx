import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { SharingContact } from "../types/sharing.types";
import { useContacts } from "../state/ContactsProvider";
import { CONTACT_ERROR_MESSAGES } from "../types/contacts.types";
import ContactModalFrame from "./ContactModalFrame";
import { prompts as pr } from "../../profile/styles/profile.styles";
import { sharingStyles as s } from "./SharingUI";

export default function DeleteContactModal({ contact, onClose }: {
  contact: SharingContact | null; onClose: () => void;
}) {
  const { t } = useTranslation();
  const { removeContact, pending } = useContacts();
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  useEffect(() => { revision.current += 1; setError(null); }, [contact?.id]);
  const remove = async () => {
    if (!contact || pending) return;
    const request = revision.current;
    const result = await removeContact(contact.id);
    if (request !== revision.current) return;
    if (result.ok) onClose();
    else if (result.reason !== "busy" && result.reason !== "staleSession") {
      setError(t(`sharing.errors.${result.reason}`, { defaultValue: CONTACT_ERROR_MESSAGES[result.reason] }));
    }
  };
  return (
    <ContactModalFrame visible={!!contact} title={t("sharing.contacts.deleteTitle", { defaultValue: "Delete contact?" })} onClose={onClose}>
      {!!contact && (
        <>
          <Text style={[s.text, local.body]}>{t("sharing.contacts.deleteRealHint", {
            defaultValue: "Remove {{name}} from your contacts? You will both be removed from each other's contact lists.",
            name: contact.name,
          })}</Text>
          {!!error && <Text accessibilityRole="alert" style={[s.error, local.body]}>{error}</Text>}
          <View style={pr.promptButtonsRow}>
            <Pressable accessibilityRole="button" style={pr.promptBtn} onPress={onClose}>
              <Text style={pr.promptBtnText}>{t("sharing.common.cancel", { defaultValue: "Cancel" })}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={!!pending} style={[pr.promptBtn, pr.promptDanger, !!pending && { opacity: 0.5 }]}
              onPress={remove}>
              <Text style={[pr.promptBtnText, pr.promptDangerText]}>{t("sharing.contacts.delete", { defaultValue: "Delete" })}</Text>
            </Pressable>
          </View>
        </>
      )}
    </ContactModalFrame>
  );
}

const local = StyleSheet.create({ body: { marginHorizontal: 16, marginBottom: 16, lineHeight: 21 } });
