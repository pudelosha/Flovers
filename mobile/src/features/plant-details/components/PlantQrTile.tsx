import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type Props = {
  qrCodeValue: string;
  onPressSave: () => void;
  onPressEmail: () => void;
};

export default function PlantQrTile({
  qrCodeValue,
  onPressSave,
  onPressEmail,
}: Props) {
  if (!qrCodeValue) return null;

  return (
    <View style={styles.wrap}>
      {/* Header aligned left (like other tiles) */}
      <Text style={styles.title}>QR Code</Text>

      {/* Longer description / instructions */}
      <Text style={styles.desc}>
        Each plant has its own unique QR code. When you scan this code in the{" "}
        <Text style={styles.bold}>Scanner</Text> view, the app opens this
        plant&apos;s details instantly.
        {"\n\n"}
        You can{" "}
        <Text style={styles.bold}>save</Text> the QR image on your phone or{" "}
        <Text style={styles.bold}>email</Text> it to yourself, then print it and
        attach it to the plant pot. Next time you want to check on this plant,
        just scan the tag instead of searching manually.
      </Text>

      {/* QR centered */}
      <View style={styles.qrBox}>
        <QRCode
          value={qrCodeValue}
          size={220}
          getRef={(c) => ((global as any).__qrRef = c)}
        />
      </View>

      {/* Buttons row */}
      <View style={styles.btnRow}>
        <Pressable style={styles.btn} onPress={onPressSave}>
          <MaterialCommunityIcons
            name="download"
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.btnText}>Save QR code</Text>
        </Pressable>

        <Pressable style={styles.btn} onPress={onPressEmail}>
          <MaterialCommunityIcons
            name="email-outline"
            size={18}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.btnText}>Email QR code</Text>
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
    fontSize: 16,
    marginBottom: 8,
  },
  desc: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  bold: {
    color: "#FFFFFF",
    fontWeight: "800",
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
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
});
