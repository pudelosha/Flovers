import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function PlantDetailsScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Plant Details</Text>
      <Text style={s.text}>This page will show detailed info about the plant.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 8 },
  text: { fontSize: 16, color: "rgba(255,255,255,0.95)" },
});
