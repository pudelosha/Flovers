import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import ContactModalFrame from "../../../sharing/components/ContactModalFrame";
import { s } from "../../styles/task-history.styles";

export default function ConfirmDeleteJournalPhotoModal({ visible, busy, onClose, onConfirm }: {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ContactModalFrame visible={visible}
      title={t("taskHistory.photo.deleteTitle", { defaultValue: "Delete photo" })}
      onClose={onClose}>
      <Text style={{ color: "#FFFFFF", fontSize: 14, lineHeight: 21, marginHorizontal: 16, marginBottom: 20 }}>
        {t("taskHistory.photo.deleteConfirm", { defaultValue: "Delete this photo and its note from the journal? This cannot be undone." })}
      </Text>
      <View style={s.promptButtonsRow}>
        <Pressable style={s.promptBtn} disabled={busy} onPress={onClose}>
          <Text style={s.promptBtnText}>{t("taskHistoryModals.common.cancel", { defaultValue: "Cancel" })}</Text>
        </Pressable>
        <Pressable style={[s.promptBtn, s.promptDanger, busy && { opacity: 0.5 }]}
          disabled={busy} onPress={onConfirm}>
          <Text style={[s.promptBtnText, { color: "#FF9090" }]}>
            {t("taskHistory.photo.delete", { defaultValue: "Delete photo" })}
          </Text>
        </Pressable>
      </View>
    </ContactModalFrame>
  );
}
