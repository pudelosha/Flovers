import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

export default function ForgotPasswordScreen() {
  return (
    <View style={s.container}>
      <Text style={s.text}>Forgot Password (to be implemented)</Text>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { color: "#fff" },
});
