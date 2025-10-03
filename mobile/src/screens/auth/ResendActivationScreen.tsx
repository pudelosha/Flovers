import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";

export default function ResendActivationScreen() {
  return (
    <View style={s.container}>
      <Text style={s.text}>Resend Activation (to be implemented)</Text>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { color: "#fff" },
});
