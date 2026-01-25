import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";
import { changeMyPassword } from "../../../../api/services/profile.service";
import { prompts as pr } from "../../styles/profile.styles";

type Props = {
  visible: boolean;
  onClose: () => void;
  showToast: (msg: string, variant?: "default" | "success" | "error") => void;
};

export default function ChangePasswordModal({ visible, onClose, showToast }: Props) {
  const { t } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setSaving(false);
  }, [visible]);

  const handleSubmit = async () => {
    if (!currentPassword) {
      showToast(t("profileModals.toasts.enterCurrentPassword"), "error");
      return;
    }
    if (!newPassword) {
      showToast(t("profileModals.toasts.enterNewPassword"), "error");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast(t("profileModals.toasts.passwordsDoNotMatch"), "error");
      return;
    }

    try {
      setSaving(true);
      const res = await changeMyPassword(
        { current_password: currentPassword, new_password: newPassword },
        { auth: true }
      );
      showToast(res?.message || t("profileModals.toasts.passwordUpdated"), "success");
      onClose();
    } catch (e: any) {
      console.warn("Change password failed", e);
      const unauthorized =
        (e?.response?.status ?? e?.status) === 401 ||
        String(e?.message ?? "").toLowerCase().includes("unauthorized");
      showToast(
        unauthorized ? t("profile.toasts.unauthorizedLoginAgain") : t("profileModals.toasts.couldNotChangePassword"),
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
          <Text style={pr.promptTitle}>{t("profileModals.prompts.changePassword.title")}</Text>

          <TextInput
            style={pr.input}
            placeholder={t("profileModals.prompts.changePassword.currentPasswordPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.7)"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <TextInput
            style={pr.input}
            placeholder={t("profileModals.prompts.changePassword.newPasswordPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.7)"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            style={pr.input}
            placeholder={t("profileModals.prompts.changePassword.confirmNewPasswordPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.7)"
            secureTextEntry
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
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
                {t("profileModals.prompts.changePassword.update")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
