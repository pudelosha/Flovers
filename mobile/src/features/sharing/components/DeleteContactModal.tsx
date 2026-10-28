import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { SharingContact } from "../types/sharing.types";
import { useSharingPreview } from "../state/SharingPreviewProvider";
import ContactModalFrame from "./ContactModalFrame";
import { prompts as pr } from "../../profile/styles/profile.styles";
import { sharingStyles as s } from "./SharingUI";

export default function DeleteContactModal({ contact, onClose }: {
  contact: SharingContact | null; onClose: () => void;
}) {
  const { t } = useTranslation();
  const { removeContact } = useSharingPreview();
  return (
    <ContactModalFrame visible={!!contact} title={t("sharing.contacts.deleteTitle", { defaultValue: "Delete contact?" })} onClose={onClose}>
      {!!contact && (
        <>
          <Text style={[s.text, local.body]}>{t("sharing.contacts.deleteHint", {
            defaultValue: "Delete {{name}} from your contacts? This also ends plant sharing between you in this preview.",
            name: contact.name,
          })}</Text>
          <View style={pr.promptButtonsRow}>
            <Pressable accessibilityRole="button" style={pr.promptBtn} onPress={onClose}>
              <Text style={pr.promptBtnText}>{t("sharing.common.cancel", { defaultValue: "Cancel" })}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={[pr.promptBtn, pr.promptDanger]}
              onPress={() => { removeContact(contact.id); onClose(); }}>
              <Text style={[pr.promptBtnText, pr.promptDangerText]}>{t("sharing.contacts.delete", { defaultValue: "Delete" })}</Text>
            </Pressable>
          </View>
        </>
      )}
    </ContactModalFrame>
  );
}

const local = StyleSheet.create({ body: { marginHorizontal: 16, marginBottom: 16, lineHeight: 21 } });
