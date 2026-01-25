import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";
import { changeMyEmail } from "../../../../api/services/profile.service";
import { prompts as pr } from "../../styles/profile.styles";

type Props = {
  visible: boolean;
  onClose: () => void;
  showToast: (msg: string, variant?: "default" | "success" | "error") => void;
};

export default function ChangeEmailModal({ visible, onClose, showToast }: Props) {
  const { t } = useTranslation();

  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNewEmail("");
    setCurrentPassword("");
    setSaving(false);
  }, [visible]);

  const handleSubmit = async () => {
    if (!newEmail.trim()) {
      showToast(t("profileModals.toasts.enterNewEmail"), "error");
      return;
    }
    if (!currentPassword) {
      showToast(t("profileModals.toasts.enterCurrentPassword"), "error");
      return;
    }

    try {
      setSaving(true);
      const res = await changeMyEmail(
        { new_email: newEmail.trim(), password: currentPassword },
        { auth: true }
      );
      showToast(res?.message || t("profileModals.toasts.emailUpdated"), "success");
      onClose();
    } catch (e: any) {
      console.warn("Change email failed", e);
      const unauthorized =
        (e?.response?.status ?? e?.status) === 401 ||
        String(e?.message ?? "").toLowerCase().includes("unauthorized");
      showToast(
        unauthorized ? t("profile.toasts.unauthorizedLoginAgain") : t("profileModals.toasts.couldNotChangeEmail"),
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
          <Text style={pr.promptTitle}>{t("profileModals.prompts.changeEmail.title")}</Text>

          <TextInput
            style={pr.input}
            placeholder={t("profileModals.prompts.changeEmail.newEmailPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={newEmail}
            onChangeText={setNewEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={pr.input}
            placeholder={t("profileModals.prompts.changeEmail.currentPasswordPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.7)"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />

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
                {t("profile.common.change")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
