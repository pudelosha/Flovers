import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "../../../shared/theme/native";
import { useTranslation } from "react-i18next";
import { useContacts } from "../state/ContactsProvider";
import { useSharingPreview } from "../state/SharingPreviewProvider";
import { CONTACT_ERROR_MESSAGES } from "../types/contacts.types";
import type { PlantShare, SharingContact } from "../types/sharing.types";
import { SharingButton, sharingStyles as s } from "./SharingUI";
import ContactModalFrame from "./ContactModalFrame";
import { prompts as pr } from "../../profile/styles/profile.styles";

type Props = { contact: SharingContact | null; onClose: () => void };

export default function ContactDetailsModal({ contact, onClose }: Props) {
  const { t } = useTranslation();
  const { updateContactName, pending } = useContacts();
  const { shares, loaded, loading, error: sharingError, refresh, openSharePlant } = useSharingPreview();
  const [name, setName] = useState("");
  const [nameInvalid, setNameInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const initialContact = useRef(contact);
  initialContact.current = contact;
  const contactId = contact?.id;
  const [readyContactId, setReadyContactId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const formLoading = !!contactId && (readyContactId !== contactId || retrying);

  useEffect(() => {
    revision.current += 1;
    // Seed a new editor; background contact updates must not replace unsaved text.
    setName(initialContact.current?.name || "");
    setNameInvalid(false);
    setError(null);
  }, [contactId]);
  useEffect(() => {
    let active = true;
    setReadyContactId(null);
    setRetrying(false);
    if (contactId) {
      const settle = () => { if (active) setReadyContactId(contactId); };
      void refresh().then(settle, settle);
    }
    return () => { active = false; };
  }, [contactId, refresh]);

  const retry = async () => {
    const request = revision.current;
    setRetrying(true);
    try { await refresh(); }
    finally { if (request === revision.current) setRetrying(false); }
  };

  const renderShares = (direction: PlantShare["direction"]) => {
    const items = shares.filter((share) => share.contactId === contact?.id && share.direction === direction);
    if (!items.length) return <Text style={s.hint}>{direction === "outgoing"
      ? t("sharing.contacts.noSharedByYou", { defaultValue: "You have not shared any plants with this contact." })
      : t("sharing.contacts.noSharedWithYou", { defaultValue: "This contact has not shared any plants with you." })}</Text>;
    return items.map((share) => <View key={share.id} style={local.plant}>
      <Text style={s.text}>{share.plant.name}</Text>
      {!!share.plant.location && <Text style={s.hint}>{share.plant.location}</Text>}
      <Text style={s.hint}>{share.canCompleteTasks
        ? t("sharing.common.canCompleteTasks", { defaultValue: "Can complete tasks" })
        : t("sharing.common.viewOnly", { defaultValue: "View only" })}</Text>
      <Text style={s.hint}>{share.endsOn ? t("sharing.common.until", { defaultValue: "Until {{date}}", date: share.endsOn })
        : t("sharing.common.noEndDate", { defaultValue: "No end date" })}</Text>
      {share.isExpired && <Text style={s.hint}>{t("sharing.common.expired", { defaultValue: "Expired" })}</Text>}
    </View>);
  };

  const save = async () => {
    if (!contact || pending) return;
    if (!name.trim() || name.trim().length > 80) {
      setNameInvalid(true);
      return;
    }
    const request = revision.current;
    const result = await updateContactName(contact.id, name);
    if (request !== revision.current) return;
    if (result.ok) onClose();
    else if (result.reason !== "busy" && result.reason !== "staleSession") {
      setError(t(`sharing.errors.${result.reason}`, { defaultValue: CONTACT_ERROR_MESSAGES[result.reason] }));
    }
  };

  return (
    <ContactModalFrame
      visible={!!contact}
      title={t("sharing.contacts.editTitle", { defaultValue: "Edit contact" })}
      onClose={onClose}
      centerContent
      loading={formLoading}
      loadingTestID="edit-contact-loading"
    >
      {!!contact && !formLoading && (
        <>
          <Text style={[s.text, local.fieldLabel]}>{t("sharing.contacts.nameLabel", { defaultValue: "Contact name" })}</Text>
          <TextInput
            accessibilityLabel={t("sharing.contacts.nameLabel", { defaultValue: "Contact name" })}
            style={pr.input}
            value={name}
            maxLength={80}
            editable={!pending}
            onChangeText={(value) => { setName(value); setNameInvalid(false); }}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <Text style={[s.hint, local.hint]}>{t("sharing.contacts.nameHint", { defaultValue: "Only you see this name. Their email and Flovers ID stay the same." })}</Text>
          {nameInvalid && <Text style={[s.error, local.hint]} accessibilityRole="alert">{t("sharing.contacts.nameRequired", { defaultValue: "Enter a contact name (up to 80 characters)." })}</Text>}
          {!!error && <Text style={[s.error, local.hint]} accessibilityRole="alert">{error}</Text>}
          <View style={local.section}>
            <Text style={s.text}>{t("sharing.contacts.identityLabel", { defaultValue: "Account details" })}</Text>
            {!!contact.email && <Text selectable style={s.hint}>{contact.email}</Text>}
            {!!contact.floversId && <Text selectable style={s.hint}>{contact.floversId}</Text>}
            <View style={s.divider} />
            {!!sharingError && <>
              <Text accessibilityRole="alert" style={s.error}>{t("sharing.accessErrors.unavailable", { defaultValue: "Could not load or update sharing. Please try again." })}</Text>
              <SharingButton label={t("sharing.form.retry", { defaultValue: "Try again" })} variant="secondary" disabled={loading} onPress={() => { void retry(); }} />
            </>}
            {loaded && <>
              <Text style={s.title}>{t("sharing.contacts.sharedByYou", { defaultValue: "Plants you share" })}</Text>
              {renderShares("outgoing")}
              <View style={s.space} />
              <Text style={s.title}>{t("sharing.contacts.sharedWithYou", { defaultValue: "Plants shared with you" })}</Text>
              {renderShares("incoming")}
            </>}
            <SharingButton label={t("sharing.contacts.sharePlant", { defaultValue: "Share plants" })}
              icon="share-variant-outline" disabled={!loaded || !!sharingError || loading}
              onPress={() => { onClose(); openSharePlant(undefined, contact.id); }} />
          </View>
          <View style={[pr.promptButtonsRow, local.actions]}>
            <Pressable accessibilityRole="button" style={pr.promptBtn} onPress={onClose}>
              <Text style={pr.promptBtnText}>{t("sharing.common.cancel", { defaultValue: "Cancel" })}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={!!pending} style={[pr.promptBtn, pr.promptPrimary, !!pending && { opacity: 0.5 }]} onPress={save}>
              <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>{t("sharing.contacts.save", { defaultValue: "Save" })}</Text>
            </Pressable>
          </View>
        </>
      )}
    </ContactModalFrame>
  );
}

const local = StyleSheet.create({
  actions: { marginTop: 16, flexWrap: "wrap" },
  fieldLabel: { marginHorizontal: 16, marginBottom: 8 },
  hint: { marginHorizontal: 16, marginBottom: 10 },
  section: { marginHorizontal: 16, marginTop: 8, marginBottom: 16, gap: 4 },
  plant: { gap: 4, paddingVertical: 10 },
});
