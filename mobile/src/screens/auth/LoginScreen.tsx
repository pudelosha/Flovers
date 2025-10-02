import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, Snackbar, Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // ⬅️ added
import { useAuth } from "../../auth/useAuth";
import { ApiError } from "../../api/client";

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets(); // ⬅️ added

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [focus, setFocus] = useState<"email" | "password" | null>(null);
  const [loading, setLoading] = useState(false);

  // snackbar (toast) state
  const [toast, setToast] = useState<{ visible: boolean; msg: string }>({
    visible: false,
    msg: "",
  });

  async function onSubmit() {
    setLoading(true);
    try {
      await login({ email, password });
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.body?.message || e.message : "Invalid email or password.";
      setToast({ visible: true, msg });
    } finally {
      setLoading(false);
    }
  }

  // Paper v5: we can override colors per-field
  const paperTheme = {
    colors: {
      // caret & focused outline & focused label
      primary: "#FFFFFF",
      // base/idle outline
      outline: "rgba(255,255,255,0.35)",
      // label & text color
      onSurface: "rgba(255,255,255,0.95)",
      surface: "transparent",
      background: "transparent",
    },
  } as const;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>

        <Text variant="headlineMedium" style={s.title}>Login</Text>

        {/* Email */}
        <View style={s.inputBox}>
          <TextInput
            mode="outlined"
            label="Email"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocus("email")}
            onBlur={() => setFocus(focus === "email" ? null : focus)}
            autoCapitalize="none"
            keyboardType="email-address"
            textColor="#fff"
            selectionColor="#fff"
            activeOutlineColor="#fff"              // focused border → white
            outlineColor="rgba(255,255,255,0.35)"  // idle border
            style={s.input}
            outlineStyle={s.outline}
            theme={paperTheme}
          />
        </View>

        {/* Password */}
        <View style={s.inputBox}>
          <TextInput
            mode="outlined"
            label="Password"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocus("password")}
            onBlur={() => setFocus(focus === "password" ? null : focus)}
            secureTextEntry
            textColor="#fff"
            selectionColor="#fff"
            activeOutlineColor="#fff"
            outlineColor="rgba(255,255,255,0.35)"
            style={s.input}
            outlineStyle={s.outline}
            theme={paperTheme}
          />
        </View>

        <Button
          mode="contained"
          onPress={onSubmit}
          loading={loading}
          disabled={loading}
          style={s.cta}
          contentStyle={{ height: 52 }}
        >
          Sign in
        </Button>

        <Button mode="text" textColor="rgba(255,255,255,0.9)" onPress={() => {}}>
          Forgot password?
        </Button>

        <Text style={s.footer}>
          Don&apos;t have an account?{" "}
          <Text style={s.link} onPress={() => navigation.navigate("Register")}>
            Sign up
          </Text>
        </Text>

        {/* Bottom toast for errors (centered, above nav bar, Sign-in color) */}
        <Portal>
          <Snackbar
            visible={toast.visible}
            onDismiss={() => setToast({ visible: false, msg: "" })}
            duration={3000}
            style={s.snack}
            wrapperStyle={[s.snackWrapper, { bottom: insets.bottom + 10 }]}
          >
            {toast.msg}
          </Snackbar>
        </Portal>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { gap: 14 },
  title: { color: "#fff", textAlign: "center", marginBottom: 6, fontWeight: "800" },

  // Give room ABOVE each field so the floating label can sit comfortably
  inputBox: { marginTop: 10 },

  input: { backgroundColor: "transparent" },
  outline: {
    borderRadius: 14,
    borderWidth: 1,
    // light frosted fill so the field stays readable on the blur
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  cta: { marginTop: 4, borderRadius: 28, backgroundColor: "#0a5161" },
  footer: { color: "rgba(255,255,255,0.9)", textAlign: "center", marginTop: 6 },
  link: { color: "#ffffff", textDecorationLine: "underline" },

  // Snackbar styles
  snackWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center", // center horizontally
  },
  snack: {
    backgroundColor: "#0a5161", // match Sign in button
    borderRadius: 24,
  },
});
