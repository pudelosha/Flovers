import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { useTranslation } from "react-i18next";

export default function RegisterSuccessScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const email = route?.params?.email;

  return (
    <View style={s.container}>
      <Text variant="headlineMedium" style={s.title}>
        {t("registerSuccess.title")}
      </Text>

      <Text style={s.body}>
        {t("registerSuccess.body1")}
      </Text>

      <Text style={s.body}>
        {t("registerSuccess.body2")}
      </Text>

      {!!email && (
        <Text style={s.email}>
          {email}
        </Text>
      )}

      <Button
        mode="contained"
        onPress={() => navigation.replace("Login")}
        style={s.button}
      >
        {t("registerSuccess.returnToLogin")}
      </Button>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 14, paddingHorizontal: 16 },
  title: {
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
    fontWeight: "800",
    marginTop: 20,
  },
  body: {
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    lineHeight: 20,
  },
  email: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    marginTop: 6,
  },
  button: { marginTop: 8 },
});
