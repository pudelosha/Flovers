import React, { useCallback, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

type Props = {
  qrCodeValue: string;
  onPressSave: () => void;
  onPressEmail: () => void;
  onQrRef?: (ref: any | null) => void;
};

export default function PlantQrTile({
  qrCodeValue,
  onPressSave,
  onPressEmail,
  onQrRef,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const qrRef = useRef<any>(null);

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
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

  if (!qrCodeValue) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{tr("plantDetails.qr.title", "QR Code")}</Text>

      <Text style={styles.desc}>
        {tr(
          "plantDetails.qr.desc.primary",
          "Each plant has its own unique QR code. Scanning it in the Scanner view opens this plant’s details instantly."
        )}
      </Text>

      <Text style={styles.desc}>
        {tr(
          "plantDetails.qr.desc.secondary",
          "You can save the QR code to your phone or email it to yourself, then print it and attach it to the pot for quick access later."
        )}
      </Text>

      <View style={styles.qrBox}>
        <QRCode value={qrCodeValue} size={220} getRef={setQrInstance} />
      </View>

      <View style={styles.btnRow}>
        <Pressable style={[styles.btn, styles.primaryBtn]} onPress={onPressSave}>
          <MaterialCommunityIcons
            name="download"
            size={18}
            color="#FFFFFF"
            style={styles.btnIcon}
          />
          <Text style={styles.btnText}>
            {tr("plantDetails.qr.saveBtn", "Save QR code")}
          </Text>
        </Pressable>

        <Pressable style={[styles.btn, styles.primaryBtn]} onPress={onPressEmail}>
          <MaterialCommunityIcons
            name="email-outline"
            size={18}
            color="#FFFFFF"
            style={styles.btnIcon}
          />
          <Text style={styles.btnText}>
            {tr("plantDetails.qr.emailBtn", "Email QR code")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
  },

  title: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 8,
  },

  desc: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "400",
    textAlign: "left",
    marginTop: 6,
    marginBottom: 8,
    lineHeight: 18,
  },

  qrBox: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  btnRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    alignSelf: "stretch",
  },

  btn: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },

  primaryBtn: {
    backgroundColor: "rgba(11,114,133,0.92)",
  },

  btnIcon: {
    marginRight: 6,
  },

  btnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
});