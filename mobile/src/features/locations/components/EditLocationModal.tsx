// src/features/locations/components/EditLocationModal.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
} from "react-native";
import { BlurView } from "@react-native-community/blur";

import { locStyles as s } from "../styles/locations.styles";

type Props = {
  visible: boolean;
  mode?: "create" | "edit";
  initialName?: string;
  onCancel: () => void;
  onSave: (name: string) => void;
};

export default function EditLocationModal({
  visible,
  mode = "edit",
  initialName = "",
  onCancel,
  onSave,
}: Props) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) {
      setName(initialName);
    }
  }, [visible, initialName]);

  if (!visible) return null;

  const canSave = !!name.trim();

  return (
    <>
      <Pressable
        style={s.promptBackdrop}
        onPress={() => {
          Keyboard.dismiss();
          onCancel();
        }}
      />
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
          <Text style={s.promptTitle}>
            {mode === "create" ? "Add location" : "Edit location"}
          </Text>

          <Text style={s.inputLabel}>Location name</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Living room, Kitchen shelf"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={name}
            onChangeText={setName}
          />

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
              style={[s.promptBtn, s.promptPrimary, !canSave && { opacity: 0.5 }]}
              disabled={!canSave}
              onPress={() => {
                Keyboard.dismiss();
                onSave(name.trim());
              }}
            >
              <Text style={s.promptPrimaryText}>
                {mode === "create" ? "Create" : "Save"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
