import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useAuth } from "../../auth/useAuth";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  return (
    <View style={s.container}>
      <Text style={s.title}>Profile</Text>
      <Text style={s.text}>{user?.email}</Text>

      <Pressable style={s.btn} onPress={logout}>
        <Text style={s.btnText}>Log out</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 8 },
  text: { fontSize: 16, color: "rgba(255,255,255,0.95)", marginBottom: 16 },
  btn: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  btnText: { color: "#fff", fontWeight: "700" },
});
