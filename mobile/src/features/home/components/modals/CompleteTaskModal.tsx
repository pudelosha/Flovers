// C:\Projekty\Python\Flovers\mobile\src\features\home\components\CompleteTaskModal.tsx
import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { s } from "../../styles/home.styles";

type Props = {
  visible: boolean;
  note: string;
  onChangeNote: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function CompleteTaskModal({
  visible,
  note,
  onChangeNote,
  onCancel,
  onConfirm,
}: Props) {
  if (!visible) return null;

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
          <Text style={s.promptTitle}>Mark task as complete</Text>

          {/* Note input */}
          <Text style={s.inputLabel}>Note (optional)</Text>
          <TextInput
            style={[
              s.input,
              {
                minHeight: 96,
                textAlignVertical: "top",
              },
            ]}
            multiline
            placeholder="You can add a short note about what you did, observations, etc."
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
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[s.promptBtn, s.promptPrimary]}
              onPress={() => {
                Keyboard.dismiss();
                onConfirm();
              }}
            >
              <Text style={[s.promptBtnText, s.promptPrimaryText]}>
                Mark as complete
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
