// C:\Projekty\Python\Flovers\mobile\src\features\plants\components\modals\PlantQrModal.tsx
import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
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
};

export default function PlantQrModal({
  visible,
  plantName,
  qrValue,
  onClose,
  onPressSave,
  onPressEmail,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string) => {
      void currentLanguage;
      const txt = t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

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

            <Text style={[s.confirmText, { marginBottom: 12 }]}>
              {tr(
                "plantsModals.qr.p1",
                "Each plant has a unique QR code that encodes its identifier."
              )}{" "}
              {tr(
                "plantsModals.qr.p2",
                "When you scan this code with the in-app scanner, you’ll be redirected straight to the details screen of this plant"
              )}{" "}
              <Text style={{ fontWeight: "800" }}>({plantName})</Text>.
              {"\n\n"}
              {tr("plantsModals.qr.youCan", "You can:")}
              {"\n"}•{" "}
              {tr(
                "plantsModals.qr.b1",
                "save the QR image to your phone or email it, then print it for labeling,"
              )}
              {"\n"}•{" "}
              {tr(
                "plantsModals.qr.b2",
                "attach the printed label directly to the pot so the code is always easy to access,"
              )}
              {"\n"}•{" "}
              {tr(
                "plantsModals.qr.b3",
                "let anyone in your household scan the label to quickly open this plant in the app."
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
              <QRCode value={qrValue} size={220} />
            </View>

            <View style={[s.promptButtonsRow, { justifyContent: "space-between" }]}>
              <Pressable
                style={[
                  s.promptBtn,
                  {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                  },
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
                <Text style={s.promptBtnText}>
                  {tr("plantsModals.qr.save", "Save QR code")}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  s.promptBtn,
                  {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                  },
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
                <Text style={s.promptBtnText}>
                  {tr("plantsModals.qr.email", "Email QR code")}
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
