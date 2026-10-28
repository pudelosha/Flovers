import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSharingPreview } from "../state/SharingPreviewProvider";
import type { PlantShare, SharingContact } from "../types/sharing.types";
import { SharingButton, sharingStyles as s } from "./SharingUI";
import ContactModalFrame from "./ContactModalFrame";
import { prompts as pr } from "../../profile/styles/profile.styles";

type Props = { contact: SharingContact | null; onClose: () => void };

export default function ContactDetailsModal({ contact, onClose }: Props) {
  const { t } = useTranslation();
  const { shares, updateContactName, openSharePlant } = useSharingPreview();
  const [name, setName] = useState("");
  const [nameInvalid, setNameInvalid] = useState(false);

  useEffect(() => {
    setName(contact?.name || "");
    setNameInvalid(false);
  }, [contact?.id, contact?.name]);

  const save = () => {
    if (!contact) return;
    if (!updateContactName(contact.id, name)) {
      setNameInvalid(true);
      return;
    }
    onClose();
  };

  const renderShares = (direction: PlantShare["direction"]) => {
    const items = shares.filter((share) => share.contactId === contact?.id && share.direction === direction);
    if (!items.length) {
      return <Text style={s.hint}>{direction === "outgoing"
        ? t("sharing.contacts.noSharedByYou", { defaultValue: "You have not shared any plants with this contact." })
        : t("sharing.contacts.noSharedWithYou", { defaultValue: "This contact has not shared any plants with you." })}</Text>;
    }
    return items.map((share) => (
      <View key={share.id} style={local.plant}>
        <Text style={s.text}>{share.plant.name}</Text>
        {!!share.plant.location && <Text style={s.hint}>{share.plant.location}</Text>}
        <Text style={s.hint}>{share.canCompleteTasks
          ? t("sharing.common.canCompleteTasks", { defaultValue: "Can complete tasks" })
          : t("sharing.common.viewOnly", { defaultValue: "View only" })}</Text>
        <Text style={s.hint}>{share.endsOn
          ? t("sharing.common.until", { defaultValue: "Until {{date}}", date: share.endsOn })
          : t("sharing.common.noEndDate", { defaultValue: "No end date" })}</Text>
      </View>
    ));
  };

  return (
    <ContactModalFrame
      visible={!!contact}
      title={t("sharing.contacts.editTitle", { defaultValue: "Edit contact" })}
      onClose={onClose}
    >
      {!!contact && (
        <>
          <Text style={[s.text, local.fieldLabel]}>{t("sharing.contacts.nameLabel", { defaultValue: "Contact name" })}</Text>
          <TextInput
            accessibilityLabel={t("sharing.contacts.nameLabel", { defaultValue: "Contact name" })}
            style={pr.input}
            value={name}
            maxLength={80}
            onChangeText={(value) => { setName(value); setNameInvalid(false); }}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <Text style={[s.hint, local.hint]}>{t("sharing.contacts.nameHint", { defaultValue: "Only you see this name. Their email and Flovers ID stay the same." })}</Text>
          {nameInvalid && <Text style={[s.error, local.hint]} accessibilityRole="alert">{t("sharing.contacts.nameRequired", { defaultValue: "Enter a contact name (up to 80 characters)." })}</Text>}
          <View style={local.section}>
            <Text style={s.text}>{t("sharing.contacts.identityLabel", { defaultValue: "Account details" })}</Text>
            {!!contact.email && <Text selectable style={s.hint}>{contact.email}</Text>}
            {!!contact.floversId && <Text selectable style={s.hint}>{contact.floversId}</Text>}
            <View style={s.divider} />
            <Text style={s.title}>{t("sharing.contacts.sharedByYou", { defaultValue: "Plants you share" })}</Text>
            {renderShares("outgoing")}
            <View style={s.space} />
            <Text style={s.title}>{t("sharing.contacts.sharedWithYou", { defaultValue: "Plants shared with you" })}</Text>
            {renderShares("incoming")}
            <View style={s.space} />
            <SharingButton
              label={t("sharing.contacts.sharePlant", { defaultValue: "Share plants" })}
              icon="share-variant-outline"
              onPress={() => { onClose(); openSharePlant(undefined, contact.id); }}
            />
          </View>
          <View style={pr.promptButtonsRow}>
            <Pressable accessibilityRole="button" style={pr.promptBtn} onPress={onClose}>
              <Text style={pr.promptBtnText}>{t("sharing.common.cancel", { defaultValue: "Cancel" })}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={[pr.promptBtn, pr.promptPrimary]} onPress={save}>
              <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>{t("sharing.contacts.save", { defaultValue: "Save" })}</Text>
            </Pressable>
          </View>
        </>
      )}
    </ContactModalFrame>
  );
}

const local = StyleSheet.create({
  fieldLabel: { marginHorizontal: 16, marginBottom: 8 },
  hint: { marginHorizontal: 16, marginBottom: 10 },
  section: { marginHorizontal: 16, marginTop: 8, marginBottom: 16, gap: 4 },
  plant: { gap: 4, paddingVertical: 10 },
});
