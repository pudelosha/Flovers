import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";
import { prompts as pr } from "../../styles/profile.styles";
import ModalCloseButton from "../../../../shared/ui/ModalCloseButton";
import { deleteMyAccount } from "../../../../api/services/profile.service";
import { ApiError, getAuthSessionId } from "../../../../api/client";
import { useAuth } from "../../../../app/providers/useAuth";
import { deletePlantPhotoById } from "../../../../shared/utils/photoStorage";

type Props = {
  visible: boolean;
  onClose: () => void;
  showToast: (msg: string, variant?: "default" | "success" | "error") => void;
};

export default function DeleteAccountModal({ visible, onClose, showToast }: Props) {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const operation = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setPassword("");
    setSaving(false);
    busy.current = false;
    operation.current += 1;
    return () => { operation.current += 1; };
  }, [visible]);

  const close = () => { if (!busy.current) onClose(); };

  const handleDelete = async () => {
    if (busy.current) return;
    if (!password) {
      showToast(t("profileModals.toasts.enterCurrentPassword"), "error");
      return;
    }

    const current = ++operation.current;
    const session = getAuthSessionId();
    busy.current = true;
    setSaving(true);
    try {
      const plantIds = await deleteMyAccount(password);
      // These globally unique IDs belong only to the deleted account. Do not
      // clear other accounts' photos or unrelated device storage.
      const cleanup = Promise.allSettled(plantIds.map((plantId) => deletePlantPhotoById(plantId)));
      if (session === getAuthSessionId()) {
        onClose();
        await logout();
      }
      await cleanup;
    } catch (error) {
      if (current !== operation.current || session !== getAuthSessionId()) return;
      const code = error instanceof ApiError ? error.body?.code : undefined;
      const key = code === "incorrect_password" ? "incorrectPassword"
        : code === "deletion_blocked" ? "deleteAccountBlocked" : "couldNotDeleteAccount";
      showToast(t(`profileModals.toasts.${key}`), "error");
    } finally {
      busy.current = false;
      if (current === operation.current) setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <Pressable style={pr.backdrop} onPress={close} />

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

        <View
          style={[
            pr.promptInner,
            {
              height: "86%",
              maxHeight: "86%",
              position: "relative",
            },
          ]}
        >
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingTop: 44,
              paddingBottom: 120,
            }}
          >
            <Text style={pr.promptTitle}>
              {t("profileModals.prompts.deleteAccount.title")}
            </Text>

            <Text style={pr.warningText}>
              {t("profileModals.prompts.deleteAccount.warning")}
            </Text>

            <TextInput
              style={pr.input}
              placeholder={t("profileModals.prompts.deleteAccount.passwordPlaceholder")}
              placeholderTextColor="rgba(255,255,255,0.7)"
              secureTextEntry
              editable={!saving}
              value={password}
              onChangeText={setPassword}
            />

            <View style={pr.promptButtonsRow}>
              <Pressable style={pr.promptBtn} onPress={close} disabled={saving}>
                <Text style={pr.promptBtnText}>{t("profile.common.cancel")}</Text>
              </Pressable>

              <Pressable
                style={[pr.promptBtn, pr.promptDanger, saving ? { opacity: 0.7 } : null]}
                onPress={handleDelete}
                disabled={saving}
              >
                <Text style={[pr.promptBtnText, pr.promptDangerText]}>
                  {saving ? t("profileModals.common.deleting") : t("profile.common.delete")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <ModalCloseButton
            onPress={close}
            accessibilityLabel={t("profile.common.close", "Close")}
            style={{
              top: 8,
              right: 8,
            }}
          />
        </View>
      </View>
    </>
  );
}
