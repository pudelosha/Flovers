import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";

export default function RegisterSuccessScreen({ navigation, route }: any) {
  const { t } = useTranslation();
  const email = route?.params?.email;

  return (
    <View style={s.container}>
      <Text variant="headlineMedium" style={s.title}>
        {t("registerSuccess.title")}
      </Text>

      <Text style={s.body}>{t("registerSuccess.body1")}</Text>

      <Text style={s.body}>{t("registerSuccess.body2")}</Text>

      {!!email && <Text style={s.email}>{email}</Text>}

      {/* FIX: use Pressable so long translations can wrap instead of clipping */}
      <Pressable
        onPress={() => navigation.replace("Login")}
        accessibilityRole="button"
        style={({ pressed }) => [s.primaryPressable, pressed && s.primaryPressed]}
      >
        <Text style={s.primaryLabel} numberOfLines={2} ellipsizeMode="tail">
          {t("registerSuccess.returnToLogin")}
        </Text>
      </Pressable>
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

  primaryPressable: {
    marginTop: 8,
    alignSelf: "stretch",
    borderRadius: 20,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6750A4", // close to Paper default primary in MD3 themes
  },
  primaryPressed: {
    opacity: 0.85,
  },
  primaryLabel: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "600",
    flexShrink: 1,
  },
});
