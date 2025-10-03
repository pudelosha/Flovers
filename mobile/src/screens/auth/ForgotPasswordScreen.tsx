import React, { useRef, useState } from "react";
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, Animated, TextInput as RNTextInput,
} from "react-native";
import { Text, TextInput, Button, Snackbar, Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/useAuth";

const INPUT_HEIGHT = 64;

const AnimatedFloatingLabel = ({
  label, value, onChangeText, onFocus, onBlur, onSubmitEditing,
  returnKeyType, autoComplete, keyboardType, autoCapitalize, right, inputRef, ...props
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;
  const animateLabel = (toValue: number) => Animated.timing(animatedLabel, { toValue, duration: 200, useNativeDriver: false }).start();
  const handleFocus = () => { setIsFocused(true); animateLabel(1); onFocus?.(); };
  const handleBlur = () => { setIsFocused(false); if (!value) animateLabel(0); onBlur?.(); };
  const handleChangeText = (text: string) => { if (!isFocused && text) animateLabel(1); onChangeText(text); };
  const labelTop = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [22, 8] });
  const labelFontSize = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [16, 12] });
  const labelColor = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: ["rgba(255,255,255,0.6)", "#FFFFFF"] });

  return (
    <View style={s.inputContainer}>
      <Animated.Text style={[s.floatingLabel, { top: labelTop, fontSize: labelFontSize, color: labelColor }]}>
        {label}
      </Animated.Text>
      <TextInput
        mode="flat" value={value} onChangeText={handleChangeText}
        onFocus={handleFocus} onBlur={handleBlur}
        onSubmitEditing={onSubmitEditing} returnKeyType={returnKeyType}
        autoComplete={autoComplete} keyboardType={keyboardType} autoCapitalize={autoCapitalize}
        right={right} ref={inputRef} style={s.flat} contentStyle={s.contentStyle}
        underlineColor="transparent" activeUnderlineColor="transparent"
        selectionColor="#FFFFFF" textColor="#FFFFFF" cursorColor="#FFFFFF" placeholder="" {...props}
      />
    </View>
  );
};

export default function ForgotPasswordScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { requestPasswordReset } = useAuth() as any;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; msg: string }>({ visible: false, msg: "" });

  const emailRef = useRef<RNTextInput | null>(null);

  async function onSubmit() {
    if (!email.trim()) {
      setToast({ visible: true, msg: "Please enter your email." });
      return;
    }
    setLoading(true);
    try {
      if (typeof requestPasswordReset === "function") await requestPasswordReset({ email });
      setToast({ visible: true, msg: "If an account exists for that email, we’ll send a reset link." });
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.body?.message || e.message : "Something went wrong. Try again.";
      setToast({ visible: true, msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        <Text variant="headlineMedium" style={s.title}>Forgot Password</Text>
        <Text style={s.subtitle}>Enter your email address and we&apos;ll send you a link to reset your password.</Text>

        <AnimatedFloatingLabel
          label="Email" value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address" autoComplete="email"
          returnKeyType="done" onSubmitEditing={onSubmit} inputRef={emailRef}
        />

        <Button mode="contained" onPress={onSubmit} loading={loading} disabled={loading} style={s.button}>
          Send reset link
        </Button>

        <Button onPress={() => navigation.navigate("Login")} accessibilityRole="link" compact style={s.linkButton}>
          <Text style={s.linkLabel}>Back to Login</Text>
        </Button>

        <Portal>
          <Snackbar visible={toast.visible} onDismiss={() => setToast({ visible: false, msg: "" })}
            duration={3000} style={s.snack} wrapperStyle={[s.snackWrapper, { bottom: insets.bottom + 10 }]}>
            {toast.msg}
          </Snackbar>
        </Portal>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { gap: 14, paddingHorizontal: 16 },
  title: { color: "#fff", textAlign: "center", marginBottom: 6, fontWeight: "800", marginTop: 20 },
  subtitle: { color: "rgba(255,255,255,0.85)", textAlign: "center", marginBottom: 4 },
  inputContainer: { position: "relative" },
  floatingLabel: { position: "absolute", left: 16, zIndex: 10, fontWeight: "500" },
  flat: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, height: INPUT_HEIGHT, paddingHorizontal: 12 },
  contentStyle: { paddingTop: 20, paddingBottom: 8 },
  button: { marginTop: 8 },
  linkButton: { alignSelf: "center" },
  linkLabel: { fontSize: 14, color: "#FFFFFF" },
  snackWrapper: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  snack: { backgroundColor: "#0a5161", borderRadius: 24 },
});
