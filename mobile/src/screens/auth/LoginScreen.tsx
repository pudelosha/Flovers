// LoginScreen.tsx
// Purpose:
// - Simple sign-in form (email + password)
// - Calls auth.login(); on success the navigator switches to the protected stack
// - Shows helpful error messages on failures

import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { useAuth } from "../../auth/useAuth";
import { ApiError } from "../../api/client";

export default function LoginScreen({ navigation }: any) {
  // 1) Access the login action from our AuthContext (via custom hook)
  const { login } = useAuth();

  // 2) Local form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // disables button & shows "Signing in..."

  // 3) Submit handler: tries to log in, handles errors, updates loading state
  async function onSubmit() {
    setLoading(true);
    try {
      await login({ email, password }); // if successful, token is stored and nav switches stacks
    } catch (e) {
      // Normalize API errors into friendly messages
      if (e instanceof ApiError) {
        Alert.alert("Login failed", e.body?.message || e.message);
      } else {
        Alert.alert("Login failed", "Check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  }

  // 4) UI: simple form + link to Register screen
  return (
    <View style={{ padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Welcome back</Text>

      {/* Email input (no auto-capitalization, email keyboard) */}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={s.input}
      />

      {/* Password input (hidden text) */}
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={s.input}
      />

      {/* Submit button: disabled while logging in */}
      <Button
        title={loading ? "Signing in..." : "Sign in"}
        onPress={onSubmit}
        disabled={loading}
      />

      {/* Link to Register screen */}
      <Text style={{ marginTop: 16 }}>
        Need an account?{" "}
        <Text style={{ color: "blue" }} onPress={() => navigation.navigate("Register")}>
          Register
        </Text>
      </Text>
    </View>
  );
}

// 5) Minimal styling for inputs (rounded borders, padding)
const s = {
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
  },
};
