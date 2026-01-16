import React from "react";
import { View, Text, Pressable, TextInput, Keyboard } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { s } from "../../styles/home.styles";
import { useTranslation } from "react-i18next";

type Props = {
  visible: boolean;
  note: string;
  onChangeNote: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;

  // NEW: allow single + bulk modes
  mode?: "single" | "bulk";
  count?: number;
};

export default function CompleteTaskModal({
  visible,
  note,
  onChangeNote,
  onCancel,
  onConfirm,
  mode = "single",
  count,
}: Props) {
  const { t } = useTranslation();

  if (!visible) return null;

  const isBulk = mode === "bulk";

  return (
    <>
      {/* Backdrop */}
      <Pressable
        style={s.promptBackdrop}
        onPress={() => {
          Keyboard.dismiss();
          onCancel();
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
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>
            {isBulk
              ? t("homeModals.completeBulk.title", { count: count ?? 0 })
              : t("homeModals.complete.title")}
          </Text>

          {/* Note input */}
          <Text style={s.inputLabel}>{t("homeModals.complete.noteLabel")}</Text>

          {/* helper text */}
          <Text style={s.inputHint}>
            {isBulk
              ? t("homeModals.completeBulk.noteHint")
              : t("homeModals.complete.noteHint")}
          </Text>

          <TextInput
            style={[
              s.input,
              {
                minHeight: 96,
                textAlignVertical: "top",
              },
            ]}
            multiline
            placeholder={t("homeModals.complete.notePlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={note}
            onChangeText={onChangeNote}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => {
              Keyboard.dismiss();
              onConfirm();
            }}
          />

          {/* Buttons */}
          <View style={s.promptButtonsRow}>
            <Pressable
              style={s.promptBtn}
              onPress={() => {
                Keyboard.dismiss();
                onCancel();
              }}
            >
              <Text style={s.promptBtnText}>{t("homeModals.common.cancel")}</Text>
            </Pressable>

            <Pressable
              style={[s.promptBtn, s.promptPrimary]}
              onPress={() => {
                Keyboard.dismiss();
                onConfirm();
              }}
            >
              <Text style={[s.promptBtnText, s.promptPrimaryText]}>
                {isBulk
                  ? t("homeModals.completeBulk.confirm")
                  : t("homeModals.complete.confirm")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
