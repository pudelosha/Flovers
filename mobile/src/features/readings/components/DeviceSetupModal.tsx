import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// Reuse Reminders modal look & feel
import { s } from "../../reminders/styles/reminders.styles";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function DeviceSetupModal({ visible, onClose }: Props) {
  if (!visible) return null;

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={onClose} />
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
          <Text style={s.promptTitle}>Device setup</Text>
          <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingBottom: 8 }}>
            <Text style={s.confirmText}>
              This is a placeholder for device setup content. Here you’ll show:
              {"\n"}• Secret / hashed token
              {"\n"}• Example Arduino/ESP32 code snippet
              {"\n"}• Step-by-step configuration instructions
              {"\n"}• Links to docs
            </Text>

            <View style={{ marginTop: 16, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialCommunityIcons name="key-variant" size={18} color="#fff" />
                <Text style={s.dropdownValue}>Secret: ••••••••••••••</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MaterialCommunityIcons name="file-code-outline" size={18} color="#fff" />
                <Text style={s.dropdownValue}>Sample code: (coming soon)</Text>
              </View>
            </View>
          </ScrollView>

          <View style={s.promptButtonsRow}>
            <Pressable style={s.promptBtn} onPress={onClose}>
              <Text style={s.promptBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}
