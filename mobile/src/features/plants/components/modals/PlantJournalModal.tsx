import React from "react";
import { View, Text, Pressable, Keyboard } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";

import { s } from "../../styles/plants.styles";

type Props = {
  visible: boolean;
  plantName?: string;
  onClose: () => void;
};

export default function PlantJournalModal({ visible, plantName, onClose }: Props) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <Pressable
        style={s.promptBackdrop}
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
      />

      {/* Centered glass card */}
      <View style={s.promptWrap}>
        <View style={s.promptGlass}>
          <BlurView
            // @ts-ignore
            style={{ position: "absolute", inset: 0 }}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            // @ts-ignore
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>
            {t("plants.menu.journal", "Show Plant Journal")}
          </Text>

          <Text style={s.promptText}>
            {plantName ? `${plantName}\n\n` : ""}
            {t(
              "plants.journal.dummy",
              "This is a demo modal. Later we’ll show the plant’s journal entries here (completed tasks with notes) in a compact list."
            )}
          </Text>

          <View style={s.promptButtonsRow}>
            <Pressable
              style={[s.promptBtn, s.promptPrimary]}
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
            >
              <Text style={[s.promptBtnText, s.promptPrimaryText]}>
                {t("plantsModals.common.close", "Close")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
