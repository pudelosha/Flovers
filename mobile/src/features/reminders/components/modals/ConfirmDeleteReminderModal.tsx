import React, { useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { s } from "../../styles/reminders.styles";

import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

type Props = {
  visible: boolean;
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteReminderModal({
  visible,
  name,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  if (!visible) return null;

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={onCancel} />
      <View style={s.promptWrap}>
        <View style={s.promptGlass}>
          <BlurView
            // @ts-ignore for RN shorthand
            style={{ position: "absolute", inset: 0 }}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            // @ts-ignore for RN shorthand
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>
            {tr("remindersModals.confirmDelete.title", "Delete reminder")}
          </Text>

          <Text style={s.confirmText}>
            {tr("remindersModals.confirmDelete.areYouSurePrefix", "Are you sure you want to delete")}{" "}
            <Text style={{ fontWeight: "800", color: "#fff" }}>{name}</Text>
            {tr("remindersModals.confirmDelete.areYouSureSuffix", "? This action cannot be undone.")}
          </Text>

          <View style={s.promptButtonsRow}>
            <Pressable style={s.promptBtn} onPress={onCancel}>
              <Text style={s.promptBtnText}>
                {tr("remindersModals.common.cancel", "Cancel")}
              </Text>
            </Pressable>

            <Pressable style={[s.promptBtn, s.promptDanger]} onPress={onConfirm}>
              <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>
                {tr("remindersModals.common.delete", "Delete")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
