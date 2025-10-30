import React from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { s } from "../../reminders/styles/reminders.styles";

type Mode = "add" | "edit";

type Props = {
  visible: boolean;
  mode: Mode;
  readingId?: string | null;
  readingName?: string;
  onCancel: () => void;
  onSave: (payload: { mode: Mode; readingId?: string | null }) => void;
};

export default function UpsertReadingDeviceModal({
  visible,
  mode,
  readingId,
  readingName,
  onCancel,
  onSave,
}: Props) {
  if (!visible) return null;

  const title = mode === "add" ? "Link device" : "Edit device";
  const subtitle =
    mode === "edit" && readingName
      ? `Editing configuration for “${readingName}”`
      : mode === "add"
      ? "Create a new link between a plant and an ESP32 device."
      : undefined;

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={onCancel} />
      <View style={s.promptWrap}>
        <View style={s.promptGlass}>
          <BlurView
            // @ts-ignore RN shorthand
            style={{ position: "absolute", inset: 0 }}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            // @ts-ignore RN shorthand
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>{title}</Text>
          {subtitle ? <Text style={s.confirmText}>{subtitle}</Text> : null}

          {/* Placeholder content area – we'll flesh this out later */}
          <View
            style={{
              marginTop: 12,
              padding: 16,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          >
            <Text style={s.dropdownValue}>
              Base form placeholder (fields will go here).
            </Text>
            <Text style={[s.dropdownValue, { opacity: 0.8, marginTop: 6 }]}>
              mode: <Text style={{ fontWeight: "800", color: "#fff" }}>{mode}</Text>
              {readingId ? `  •  readingId: ${readingId}` : ""}
            </Text>
          </View>

          <View style={s.promptButtonsRow}>
            <Pressable style={s.promptBtn} onPress={onCancel}>
              <Text style={s.promptBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[s.promptBtn, s.promptPrimary]}
              onPress={() => onSave({ mode, readingId })}
            >
              <Text style={s.promptPrimaryText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
