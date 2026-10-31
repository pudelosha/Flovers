import React, { useEffect } from "react";
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";
import ModalCloseButton from "../../../shared/ui/ModalCloseButton";
import { prompts as pr } from "../../profile/styles/profile.styles";

/** Contacts use the same centered glass prompt and controls as the Profile dialogs. */
export default function ContactModalFrame({ visible, title, onClose, children, sharingLayout = false, scrollEnabled = true }: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode;
  sharingLayout?: boolean; scrollEnabled?: boolean;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      Keyboard.dismiss();
      onClose();
      return true;
    });
    return () => handler.remove();
  }, [visible, onClose]);
  if (!visible) return null;
  const close = () => { Keyboard.dismiss(); onClose(); };
  return (
    <View style={s.overlay} accessibilityViewIsModal>
      <Pressable style={pr.backdrop} onPress={close} accessibilityRole="button"
        accessibilityLabel={t("sharing.common.close", { defaultValue: "Close" })} />
      <KeyboardAvoidingView pointerEvents="box-none" style={[pr.promptWrap, sharingLayout && s.sharingWrap]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View pointerEvents="none" style={[pr.promptGlass, sharingLayout && s.squareBottom]}>
          <BlurView style={StyleSheet.absoluteFill} blurType="light" blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]} />
        </View>
        <View style={[pr.promptInner, s.inner, sharingLayout && s.sharingInner, sharingLayout && s.squareBottom]}>
          <ScrollView style={{ flex: 1 }} scrollEnabled={scrollEnabled} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            contentContainerStyle={[s.content, sharingLayout && s.sharingContent]}>
            <Text style={pr.promptTitle}>{title}</Text>
            {children}
          </ScrollView>
          <ModalCloseButton onPress={close} accessibilityLabel={t("sharing.common.close", { defaultValue: "Close" })}
            style={{ top: 8, right: 8 }} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 6000, elevation: 6000 },
  inner: { height: "86%", maxHeight: "86%", position: "relative" },
  sharingWrap: { justifyContent: "flex-end" },
  // Retain the centered frame's 7% top gap, extending its bottom to the tab bar.
  sharingInner: { height: "93%", maxHeight: "93%" },
  content: { flexGrow: 1, justifyContent: "center", paddingTop: 44, paddingBottom: 120 },
  squareBottom: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  sharingContent: { justifyContent: "flex-start", paddingBottom: 20 },
});
