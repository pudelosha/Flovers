// src/features/locations/components/ConfirmDeleteLocationModal.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";

import { locStyles as s } from "../../styles/locations.styles";

type Props = {
  visible: boolean;
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteLocationModal({
  visible,
  name,
  onCancel,
  onConfirm,
}: Props) {
  if (!visible) return null;

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={onCancel} />
      <View style={s.promptWrap}>
        <View style={s.promptGlass}>
          <BlurView
            style={{ position: "absolute", inset: 0 } as any}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={
              {
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.35)",
              } as any
            }
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>Delete location</Text>
          <Text style={s.confirmText}>
            Are you sure you want to delete{" "}
            <Text style={{ fontWeight: "800", color: "#fff" }}>{name}</Text>?
            This action cannot be undone.
          </Text>
          <View style={s.promptButtonsRow}>
            <Pressable style={s.promptBtn} onPress={onCancel}>
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[s.promptBtn, s.promptDanger]}
              onPress={onConfirm}
            >
              <Text
                style={[
                  s.promptBtnText,
                  { color: "#FF6B6B", fontWeight: "800" },
                ]}
              >
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
