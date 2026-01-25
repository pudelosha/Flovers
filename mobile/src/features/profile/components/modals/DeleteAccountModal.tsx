import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";
import { prompts as pr } from "../../styles/profile.styles";

type Props = {
  visible: boolean;
  onClose: () => void;
  showToast: (msg: string, variant?: "default" | "success" | "error") => void;
};

export default function DeleteAccountModal({ visible, onClose, showToast }: Props) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPassword("");
    setSaving(false);
  }, [visible]);

  const handleDelete = async () => {
    if (!password) {
      showToast(t("profileModals.toasts.enterCurrentPassword"), "error");
      return;
    }

    // Backend endpoint not provided in your service yet.
    // Keeping behavior explicit and safe:
    showToast(t("profileModals.toasts.deleteNotImplemented"), "error");
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
          <Text style={pr.promptTitle}>{t("profileModals.prompts.deleteAccount.title")}</Text>
          <Text style={pr.warningText}>{t("profileModals.prompts.deleteAccount.warning")}</Text>

          <TextInput
            style={pr.input}
            placeholder={t("profileModals.prompts.deleteAccount.passwordPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.7)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <View style={pr.promptButtonsRow}>
            <Pressable style={pr.promptBtn} onPress={onClose} disabled={saving}>
              <Text style={pr.promptBtnText}>{t("profile.common.cancel")}</Text>
            </Pressable>

            <Pressable
              style={[pr.promptBtn, pr.promptDanger, saving ? { opacity: 0.7 } : null]}
              onPress={handleDelete}
              disabled={saving}
            >
              <Text style={[pr.promptBtnText, pr.promptDangerText]}>
                {t("profile.common.delete")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
