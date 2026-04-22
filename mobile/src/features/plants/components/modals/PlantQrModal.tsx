import React, { useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import QRCode from "react-native-qrcode-svg";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

import { s } from "../../styles/plants.styles";

type Props = {
  visible: boolean;
  plantName: string;
  qrValue: string;
  onClose: () => void;
  onPressSave: () => void;
  onPressEmail: () => void;
  onQrRef?: (ref: any | null) => void;
};

export default function PlantQrModal({
  visible,
  plantName,
  qrValue,
  onClose,
  onPressSave,
  onPressEmail,
  onQrRef,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const qrRef = useRef<any>(null);

  const tr = useCallback(
    (key: string, fallback?: string) => {
      void currentLanguage;
      const txt = t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const setQrInstance = useCallback(
    (ref: any | null) => {
      qrRef.current = ref;
      onQrRef?.(ref);
    },
    [onQrRef]
  );

  useEffect(() => {
    if (!visible) {
      setQrInstance(null);
    }
  }, [visible, setQrInstance]);

  if (!visible) return null;

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={onClose} />

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
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            } as any}
          />
        </View>

        <View style={[s.promptInner, { maxHeight: "86%" }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={s.promptTitle}>
              {tr("plantsModals.qr.title", "Plant QR code")}
            </Text>

            <Text style={[s.confirmText, { marginBottom: 10 }]}>
              {tr(
                "plantsModals.qr.p1",
                "Each plant has a unique QR code. Scanning it in the app opens this plant instantly."
              )}{" "}
              <Text style={{ fontWeight: "800" }}>({plantName})</Text>.
            </Text>

            <Text style={[s.confirmText, { marginBottom: 14 }]}>
              {tr(
                "plantsModals.qr.p2",
                "You can save or send the QR code, print it, and attach it to the pot for quick access later."
              )}
            </Text>

            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                marginTop: 4,
                marginBottom: 16,
              }}
            >
              <QRCode value={qrValue} size={220} getRef={setQrInstance} />
            </View>

            <View style={[s.promptButtonsRow, { justifyContent: "space-between" }]}>
              <Pressable
                style={[
                  s.promptBtn,
                  s.promptPrimary,
                  styles.actionBtn,
                  { marginRight: 8 },
                ]}
                android_ripple={{ color: "rgba(255,255,255,0.16)" }}
                onPress={onPressSave}
              >
                <MaterialCommunityIcons
                  name="content-save-outline"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={s.promptPrimaryText}>
                  {tr("plantsModals.qr.save", "Save")}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  s.promptBtn,
                  s.promptPrimary,
                  styles.actionBtn,
                  { marginLeft: 8 },
                ]}
                android_ripple={{ color: "rgba(255,255,255,0.16)" }}
                onPress={onPressEmail}
              >
                <MaterialCommunityIcons
                  name="email-outline"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={s.promptPrimaryText}>
                  {tr("plantsModals.qr.email", "Send")}
                </Text>
              </Pressable>
            </View>

            <View style={[s.promptButtonsRow, { justifyContent: "flex-end" }]}>
              <Pressable
                style={s.promptBtn}
                android_ripple={{ color: "rgba(255,255,255,0.16)" }}
                onPress={onClose}
              >
                <Text style={s.promptBtnText}>
                  {tr("plantsModals.common.close", "Close")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});