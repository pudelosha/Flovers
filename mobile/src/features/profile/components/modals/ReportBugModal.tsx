// src/features/profile/components/modals/ReportBugModal.tsx
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { Checkbox } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { sendSupportBug } from "../../../../api/services/profile.service";
import { prompts as pr } from "../../styles/profile.styles";
import { ApiError } from "../../../../api/client";

type Props = {
  visible: boolean;
  onClose: () => void;
  showToast: (msg: string, variant?: "default" | "success" | "error") => void;
};

function isTimedOut(e: any) {
  if (e instanceof ApiError && e.status === 408) return true;

  const name = String(e?.name ?? "");
  const msg = String(e?.message ?? "").toLowerCase();
  return name === "AbortError" || msg.includes("abort") || msg.includes("aborted") || msg.includes("timeout");
}

function isUnauthorized(e: any) {
  const status = (e instanceof ApiError ? e.status : (e?.response?.status ?? e?.status)) as number | undefined;
  const msg = String(e?.message ?? "").toLowerCase();
  return status === 401 || msg.includes("unauthorized") || msg.includes("unauthorised");
}

export default function ReportBugModal({ visible, onClose, showToast }: Props) {
  const { t } = useTranslation();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [copyToMe, setCopyToMe] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSubject("");
    setDescription("");
    setCopyToMe(true);
    setSaving(false);
  }, [visible]);

  const handleSubmit = async () => {
    if (saving) return;

    const s = subject.trim();
    const d = description.trim();

    if (!s) {
      showToast(t("profileModals.toasts.enterSubject"), "error");
      return;
    }
    if (!d) {
      showToast(t("profileModals.toasts.enterDescription"), "error");
      return;
    }

    try {
      setSaving(true);

      const res = await sendSupportBug(
        { subject: s, description: d, copy_to_user: copyToMe },
        { auth: true }
      );

      showToast(res?.message || t("profileModals.toasts.bugSent"), "success");
      onClose();
    } catch (e: any) {
      console.warn("Bug report failed", e);

      if (isUnauthorized(e)) {
        showToast(t("profile.toasts.unauthorizedLoginAgain"), "error");
      } else if (isTimedOut(e)) {
        showToast(t("profileModals.toasts.requestTimedOut"), "error");
      } else {
        showToast(t("profileModals.toasts.couldNotSendBug"), "error");
      }
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
          <Text style={pr.promptTitle}>{t("profileModals.prompts.reportBug.title")}</Text>

          <TextInput
            style={pr.input}
            placeholder={t("profileModals.prompts.reportBug.subjectPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={subject}
            onChangeText={setSubject}
            editable={!saving}
          />

          <TextInput
            style={[pr.input, { height: 120, textAlignVertical: "top", paddingTop: 10 }]}
            placeholder={t("profileModals.prompts.reportBug.descriptionPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.7)"
            multiline
            value={description}
            onChangeText={setDescription}
            editable={!saving}
          />

          {/* Checkbox row - single toggle source (wrapper only) */}
          <Pressable
            onPress={() => setCopyToMe((v) => !v)}
            style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
            disabled={saving}
          >
            <Checkbox
              status={copyToMe ? "checked" : "unchecked"}
              onPress={undefined} // prevent double toggle (Pressable handles it)
              color="#FFFFFF"
              uncheckedColor="#FFFFFF"
            />
            <Text style={{ color: "#FFFFFF" }}>{t("profileModals.support.copyToMe")}</Text>
          </Pressable>

          <View style={pr.promptButtonsRow}>
            {/* Cancel should NEVER be disabled */}
            <Pressable style={pr.promptBtn} onPress={onClose}>
              <Text style={pr.promptBtnText}>{t("profile.common.cancel")}</Text>
            </Pressable>

            <Pressable
              style={[pr.promptBtn, pr.promptPrimary, saving ? { opacity: 0.7 } : null]}
              onPress={handleSubmit}
              disabled={saving}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {saving ? <ActivityIndicator /> : null}
                <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                  {saving ? t("profileModals.common.sending") : t("profile.common.send")}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
