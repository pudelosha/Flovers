import React, { useEffect } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import GlassHeader from "../../../shared/ui/GlassHeader";
import { HEADER_GRADIENT_TINT, HEADER_SOLID_FALLBACK } from "../../plants/constants/plants.constants";
import { controls } from "../../profile/styles/profile.styles";
import { useSharingPreview } from "../state/SharingPreviewProvider";

export function SharingPage({ title, children, showBack = true, extraBottomPadding = 0 }: {
  title: string; children: React.ReactNode; showBack?: boolean; extraBottomPadding?: number;
}) {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View style={s.page}>
      <GlassHeader title={title} gradientColors={HEADER_GRADIENT_TINT} solidFallback={HEADER_SOLID_FALLBACK}
        rightIconName="qrcode-scan" onPressRight={() => nav.navigate("Scanner")} showSeparator={false}>
        {showBack && <Pressable style={s.back} accessibilityRole="button"
          onPress={() => nav.canGoBack() ? nav.goBack() : nav.navigate("Profile")}>
          <MaterialCommunityIcons name="chevron-left" size={20} color="#FFFFFF" />
          <Text style={sharingStyles.text}>{t("sharing.common.back", { defaultValue: "Back" })}</Text>
        </Pressable>}
      </GlassHeader>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 120 + extraBottomPadding }]}>
        {children}
      </ScrollView>
    </View>
  );
}

export function SharingButton({ label, onPress, icon, variant = "primary", disabled = false, style }: {
  label: string; onPress: () => void; icon?: string; variant?: "primary" | "secondary" | "danger";
  disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={[controls.actionBtnFull, s.button, variant === "primary" && s.primary,
        variant === "danger" && controls.dangerFull, disabled && s.disabled, style]}>
      {icon && <MaterialCommunityIcons name={icon} size={18} color={variant === "danger" ? "#FF8D8D" : "#FFFFFF"} />}
      <Text style={[controls.actionBtnFullText, s.buttonText, variant === "danger" && s.dangerText]}>{label}</Text>
    </Pressable>
  );
}

export function PreviewNotice() {
  const { t } = useTranslation();
  const { resetPreview } = useSharingPreview();
  return (
    <View style={s.notice}>
      <View style={sharingStyles.row}>
        <MaterialCommunityIcons name="information-outline" size={18} color="#99D9D1" />
        <Text style={s.noticeTitle}>{t("sharing.preview.label", { defaultValue: "UI preview" })}</Text>
      </View>
      <Text style={sharingStyles.hint}>{t("sharing.preview.notice", { defaultValue: "Sample contacts and sharing. Nothing is sent or shared." })}</Text>
      <Pressable onPress={resetPreview} accessibilityRole="button" style={s.reset}>
        <Text style={s.resetText}>{t("sharing.preview.reset", { defaultValue: "Reset preview" })}</Text>
      </Pressable>
    </View>
  );
}

/** In-app sheets allow contact details to hand over directly to the sharing form. */
export function SharingSheet({ visible, title, onClose, children }: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!visible) return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => { onClose(); return true; });
    return () => handler.remove();
  }, [visible, onClose]);
  if (!visible) return null;
  return (
    <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button"
        accessibilityLabel={t("sharing.common.close", { defaultValue: "Close" })} />
      <View style={[s.sheet, { marginBottom: Math.max(insets.bottom, 12), marginTop: insets.top + 12 }]} accessibilityViewIsModal>
        <View style={s.sheetHeader}>
          <Text style={[sharingStyles.title, { flex: 1 }]}>{title}</Text>
          <Pressable style={s.close} onPress={onClose} accessibilityRole="button"
            accessibilityLabel={t("sharing.common.close", { defaultValue: "Close" })}>
            <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetBody}>
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

export const sharingStyles = StyleSheet.create({
  text: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  title: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  hint: { color: "rgba(255,255,255,0.78)", fontSize: 12, fontWeight: "500", lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  column: { flex: 1, gap: 4 },
  section: { marginTop: 8, gap: 10 },
  space: { height: 12 },
  input: { minHeight: 46, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.12)" },
  chip: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, overflow: "hidden", backgroundColor: "rgba(11,114,133,0.48)" },
  error: { color: "#FFB1B1", fontSize: 13, lineHeight: 18 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.14)", marginVertical: 12 },
});

const s = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 21, gap: 16 },
  back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingVertical: 6, paddingRight: 12 },
  button: { marginBottom: 0, justifyContent: "center" },
  buttonText: { color: "#FFFFFF", flexShrink: 1, textAlign: "center" },
  primary: { backgroundColor: "#0B7285" },
  disabled: { opacity: 0.45 },
  dangerText: { color: "#FF8D8D" },
  notice: { padding: 14, borderRadius: 18, gap: 6, backgroundColor: "rgba(11,114,133,0.16)" },
  noticeTitle: { color: "#99D9D1", fontWeight: "800", fontSize: 12 },
  reset: { alignSelf: "flex-start", paddingVertical: 6 },
  resetText: { color: "#99D9D1", fontWeight: "700", fontSize: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 5000, elevation: 5000, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { maxHeight: "88%", marginHorizontal: 12, borderRadius: 28, backgroundColor: "#153F35", overflow: "hidden" },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  close: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "rgba(255,255,255,0.10)" },
  sheetBody: { padding: 20, paddingTop: 8, gap: 12 },
});
