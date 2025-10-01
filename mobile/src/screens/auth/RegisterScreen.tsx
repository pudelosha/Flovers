// RegisterScreen.tsx
// Purpose:
// - Simple sign-up form (first/last name optional, email + password required)
// - Calls auth.register() to create an inactive account and send activation email
// - Provides "Resend activation email" convenience action
// - Link to Login screen

import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, TouchableOpacity } from "react-native";
import { useAuth } from "../../auth/useAuth";

export default function RegisterScreen({ navigation }: any) {
  // 1) Get register() and resendActivation() from our auth context
  const { register, resendActivation } = useAuth();

  // 2) Local form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [loading, setLoading] = useState(false); // disables button, shows "Please wait…"

  // 3) Submit: basic client-side validation, call register API, show server message
  async function onSubmit() {
    if (!email || !password) {
      Alert.alert("Missing fields", "Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const resp = await register({ email, password, first_name: first, last_name: last });
      Alert.alert("Success", resp?.message || "Account created. Check your email to activate.");
      // Optional: navigate to Login automatically after success:
      // navigation.navigate("Login");
    } catch (e: any) {
      // e may be ApiError from client; show backend message if present
      Alert.alert("Error", e?.body?.message || e?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  // 4) Resend activation email for the entered address (useful if user lost it)
  async function onResend() {
    if (!email) {
      Alert.alert("Enter your email first", "Type your email to resend activation.");
      return;
    }
    try {
      const resp = await resendActivation(email);
      Alert.alert("Info", resp.message || "If the account exists and is inactive, we sent you an email.");
    } catch (e: any) {
      Alert.alert("Error", e?.body?.message || "Could not resend activation.");
    }
  }

  // 5) UI: form inputs, submit button, resend link, and a link to Login
  return (
    <View style={{ padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Create your account</Text>

      {/* Optional profile fields */}
      <TextInput
        placeholder="First name"
        value={first}
        onChangeText={setFirst}
        style={s.input}
      />
      <TextInput
        placeholder="Last name"
        value={last}
        onChangeText={setLast}
        style={s.input}
      />

      {/* Required fields */}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={s.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={s.input}
      />

      {/* Submit */}
      <Button
        title={loading ? "Please wait..." : "Register"}
        onPress={onSubmit}
        disabled={loading}
      />

      {/* Resend activation helper */}
      <TouchableOpacity onPress={onResend} style={{ marginTop: 8 }}>
        <Text style={{ color: "blue" }}>Resend activation email</Text>
      </TouchableOpacity>

      {/* Link to Login */}
      <View style={{ marginTop: 16 }}>
        <Text>
          Already have an account?{" "}
          <Text style={{ color: "blue" }} onPress={() => navigation.navigate("Login")}>
            Sign in
          </Text>
        </Text>
      </View>
    </View>
  );
}

// 6) Minimal styling for inputs
const s = {
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
  },
};
