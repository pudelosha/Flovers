import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Modal, Platform } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

import { locStyles as s } from "../../styles/locations.styles";

type Props = {
  visible: boolean;
  name: string;
  plantCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteLocationModal({
  visible,
  name,
  plantCount,
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

  const blocked = plantCount > 0;

  const countLabel = useMemo(() => {
    const c = plantCount;

    if (currentLanguage === "pl") {
      const mod10 = c % 10;
      const mod100 = c % 100;
      if (c === 1) return "1 roślina";
      if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
        return `${c} rośliny`;
      }
      return `${c} roślin`;
    }

    if (c === 1) return "1 plant";
    return `${c} plants`;
  }, [plantCount, currentLanguage]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent={Platform.OS === "android"}
    >
      {/* Backdrop */}
      <Pressable style={s.promptBackdrop} onPress={onCancel} />

      {/* Centered card */}
      <View style={s.promptWrap}>
        <View style={s.promptGlass}>
          <BlurView
            style={styles.absoluteFill}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={[styles.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]}
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>
            {tr("locationsModals.confirmDelete.title", "Delete location")}
          </Text>

          <Text style={s.confirmText}>
            {tr("locationsModals.confirmDelete.messagePrefix", "Are you sure you want to delete")}{" "}
            <Text style={{ fontWeight: "800", color: "#fff" }}>{name}</Text>
            {tr("locationsModals.confirmDelete.messageSuffix", "? This action cannot be undone.")}
          </Text>

          {blocked && (
            <View style={s.blockedSection}>
              <Text style={s.blockedTitle}>
                {tr("locationsModals.confirmDelete.blockedTitle", "Can’t delete this location")}
              </Text>
              <Text style={s.blockedText}>
                {tr(
                  "locationsModals.confirmDelete.blockedMessage",
                  "This location has {{countLabel}} assigned. Delete or move those plants first, then try again.",
                  { countLabel }
                )}
              </Text>
            </View>
          )}

          <View style={s.promptButtonsRow}>
            <Pressable style={s.promptBtn} onPress={onCancel}>
              <Text style={s.promptBtnText}>
                {tr("locationsModals.common.cancel", "Cancel")}
              </Text>
            </Pressable>

            <Pressable
              style={[s.promptBtn, s.promptDanger, blocked && { opacity: 0.45 }]}
              onPress={onConfirm}
              disabled={blocked}
            >
              <Text style={[s.promptBtnText, { color: "#FF6B6B", fontWeight: "800" }]}>
                {tr("locationsModals.common.delete", "Delete")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  absoluteFill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
