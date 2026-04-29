import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  ScrollView,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { s } from "../../styles/home.styles";
import { useTranslation } from "react-i18next";
import ModalCloseButton from "../../../../shared/ui/ModalCloseButton";

type Props = {
  visible: boolean;
  note: string;
  onChangeNote: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;

  // allow single + bulk modes
  mode?: "single" | "bulk";
  count?: number;

  // NEW
  isOverdue?: boolean;
  intervalText?: string;
};

export default function CompleteTaskModal({
  visible,
  note,
  onChangeNote,
  onCancel,
  onConfirm,
  mode = "single",
  count,
  isOverdue = false,
  intervalText = "",
}: Props) {
  const { t } = useTranslation();

  if (!visible) return null;

  const isBulk = mode === "bulk";

  const closeModal = () => {
    Keyboard.dismiss();
    onCancel();
  };

  const confirm = () => {
    Keyboard.dismiss();
    onConfirm();
  };

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={closeModal} />

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

        <View
          style={[
            s.promptInner,
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
            <Text style={s.promptTitle}>
              {isBulk
                ? t("homeModals.completeBulk.title", { count: count ?? 0 })
                : t("homeModals.complete.title")}
            </Text>

            {isOverdue ? (
              <Text style={s.inputHint}>
                {t(
                  isBulk
                    ? "homeModals.completeBulk.overdueInfo"
                    : "homeModals.complete.overdueInfo",
                  { intervalText }
                )}
              </Text>
            ) : null}

            <Text style={s.inputLabel}>{t("homeModals.complete.noteLabel")}</Text>

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
              onSubmitEditing={confirm}
            />

            <View style={s.promptButtonsRow}>
              <Pressable style={s.promptBtn} onPress={closeModal}>
                <Text style={s.promptBtnText}>
                  {t("homeModals.common.cancel")}
                </Text>
              </Pressable>

              <Pressable style={[s.promptBtn, s.promptPrimary]} onPress={confirm}>
                <Text style={[s.promptBtnText, s.promptPrimaryText]}>
                  {isBulk
                    ? t("homeModals.completeBulk.confirm")
                    : t("homeModals.complete.confirm")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <ModalCloseButton
            onPress={closeModal}
            accessibilityLabel={t("homeModals.common.close", "Close")}
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