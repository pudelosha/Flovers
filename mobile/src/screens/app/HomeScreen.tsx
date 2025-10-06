import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "../../auth/useAuth";

export default function HomeScreen() {
  const { user } = useAuth();
  return (
    <View style={s.container}>
      <Text style={s.title}>Hello {user?.first_name || ""}</Text>
      <Text style={s.text}>Welcome to Flovers 🌿</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", marginBottom: 8 },
  text: { fontSize: 16, color: "rgba(255,255,255,0.95)" },
});
