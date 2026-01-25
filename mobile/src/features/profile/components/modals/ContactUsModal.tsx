import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { Checkbox } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { sendSupportContact } from "../../../../api/services/profile.service";
import { prompts as pr } from "../../styles/profile.styles";

type Props = {
  visible: boolean;
  onClose: () => void;
  showToast: (msg: string, variant?: "default" | "success" | "error") => void;
};

export default function ContactUsModal({ visible, onClose, showToast }: Props) {
  const { t } = useTranslation();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [copyToMe, setCopyToMe] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSubject("");
    setMessage("");
    setCopyToMe(true);
    setSaving(false);
  }, [visible]);

  const handleSubmit = async () => {
    const s = subject.trim();
    const m = message.trim();

    if (!s) {
      showToast(t("profileModals.toasts.enterSubject"), "error");
      return;
    }
    if (!m) {
      showToast(t("profileModals.toasts.enterMessage"), "error");
      return;
    }

    try {
      setSaving(true);
      const res = await sendSupportContact({ subject: s, message: m, copy_to_user: copyToMe }, { auth: true });
      showToast(res?.message || t("profileModals.toasts.contactSent"), "success");
      onClose();
    } catch (e: any) {
      console.warn("Contact support failed", e);
      const unauthorized =
        (e?.response?.status ?? e?.status) === 401 ||
        String(e?.message ?? "").toLowerCase().includes("unauthorized");
      showToast(
        unauthorized ? t("profile.toasts.unauthorizedLoginAgain") : t("profileModals.toasts.couldNotSendContact"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <Pressable style={pr.backdrop} onPress={onClose} />
      <View style={pr.promptWrap}>
        <View style={pr.promptGlass}>
          <BlurView
            style={{ position: "absolute", inset: 0 } as any}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            } as any}
          />
        </View>

        <View style={pr.promptInner}>
          <Text style={pr.promptTitle}>{t("profileModals.prompts.contactUs.title")}</Text>

          <TextInput
            style={pr.input}
            placeholder={t("profileModals.prompts.contactUs.subjectPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={subject}
            onChangeText={setSubject}
          />

          <TextInput
            style={[pr.input, { height: 120, textAlignVertical: "top", paddingTop: 10 }]}
            placeholder={t("profileModals.prompts.contactUs.messagePlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.7)"
            multiline
            value={message}
            onChangeText={setMessage}
          />

          <Pressable
            onPress={() => setCopyToMe((v) => !v)}
            style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
          >
            <Checkbox
              status={copyToMe ? "checked" : "unchecked"}
              onPress={() => setCopyToMe((v) => !v)}
              color="#FFFFFF"
              uncheckedColor="#FFFFFF"
            />
            <Text style={{ color: "#FFFFFF" }}>{t("profileModals.support.copyToMe")}</Text>
          </Pressable>

          <View style={pr.promptButtonsRow}>
            <Pressable style={pr.promptBtn} onPress={onClose} disabled={saving}>
              <Text style={pr.promptBtnText}>{t("profile.common.cancel")}</Text>
            </Pressable>

            <Pressable
              style={[pr.promptBtn, pr.promptPrimary, saving ? { opacity: 0.7 } : null]}
              onPress={handleSubmit}
              disabled={saving}
            >
              <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                {t("profile.common.send")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
