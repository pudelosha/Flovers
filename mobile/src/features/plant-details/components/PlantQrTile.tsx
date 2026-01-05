import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

type Props = {
  qrCodeValue: string;
  onPressSave: () => void;
  onPressEmail: () => void;
};

export default function PlantQrTile({ qrCodeValue, onPressSave, onPressEmail }: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  if (!qrCodeValue) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{tr("plantDetails.qr.title", "QR Code")}</Text>

      <Text style={styles.desc}>
        {tr(
          "plantDetails.qr.desc.part1",
          "Each plant has its own unique QR code. When you scan this code in the"
        )}{" "}
        <Text style={styles.bold}>{tr("plantDetails.qr.scanner", "Scanner")}</Text>{" "}
        {tr(
          "plantDetails.qr.desc.part2",
          "view, the app opens this plant's details instantly."
        )}
        {"\n\n"}
        {tr("plantDetails.qr.desc.part3a", "You can")}{" "}
        <Text style={styles.bold}>{tr("plantDetails.qr.saveWord", "save")}</Text>{" "}
        {tr("plantDetails.qr.desc.part3b", "the QR image on your phone or")}{" "}
        <Text style={styles.bold}>{tr("plantDetails.qr.emailWord", "email")}</Text>{" "}
        {tr(
          "plantDetails.qr.desc.part3c",
          "it to yourself, then print it and attach it to the plant pot. Next time you want to check on this plant, just scan the tag instead of searching manually."
        )}
      </Text>

      <View style={styles.qrBox}>
        <QRCode value={qrCodeValue} size={220} getRef={(c) => ((global as any).__qrRef = c)} />
      </View>

      <View style={styles.btnRow}>
        <Pressable style={styles.btn} onPress={onPressSave}>
          <MaterialCommunityIcons name="download" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.btnText}>{tr("plantDetails.qr.saveBtn", "Save QR code")}</Text>
        </Pressable>

        <Pressable style={styles.btn} onPress={onPressEmail}>
          <MaterialCommunityIcons name="email-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.btnText}>{tr("plantDetails.qr.emailBtn", "Email QR code")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "stretch" },
  title: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, marginBottom: 8 },
  desc: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  bold: { color: "#FFFFFF", fontWeight: "800" },
  qrBox: { alignItems: "center", justifyContent: "center", marginBottom: 16 },
  btnRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  btnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
});
