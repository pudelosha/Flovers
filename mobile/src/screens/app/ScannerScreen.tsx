import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ScannerScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Scanner</Text>
      <Text style={s.text}>
        Camera/QR reader will live here. After scanning, we’ll navigate to a Plant page.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", marginBottom: 8 },
  text: { fontSize: 16, color: "rgba(255,255,255,0.95)" },
});
