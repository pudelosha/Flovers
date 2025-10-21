import React, { useRef, useState } from "react";
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, Animated, TextInput as RNTextInput,
} from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { ApiError } from "../../../api/client";
import { useAuth } from "../../../app/providers/useAuth";
import TopSnackbar from "../../../shared/ui/TopSnackbar";

const INPUT_HEIGHT = 64;

const AnimatedFloatingLabel = ({
  label, value, onChangeText, onFocus, onBlur, onSubmitEditing,
  returnKeyType, autoComplete, keyboardType, autoCapitalize, right, inputRef, ...props
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;
  const animateLabel = (toValue: number) =>
    Animated.timing(animatedLabel, { toValue, duration: 200, useNativeDriver: false }).start();
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

export default function ResendActivationScreen({ navigation }: any) {
  const { resendActivation } = useAuth() as any;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; msg: string; variant?: "default" | "success" | "error" }>({
    visible: false,
    msg: "",
    variant: "default",
  });

  const emailRef = useRef<RNTextInput | null>(null);

  async function onSubmit() {
    if (!email.trim()) {
      setToast({ visible: true, msg: "Please enter your email.", variant: "error" });
      return;
    }
    setLoading(true);
    try {
      if (typeof resendActivation === "function") await resendActivation({ email });
      setToast({
        visible: true,
        msg: "If your account needs activation, an email is on the way.",
        variant: "success",
      });
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.body?.message || e.message : "Something went wrong. Try again.";
      setToast({ visible: true, msg, variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        <Text variant="headlineMedium" style={s.title}>Resend Activation</Text>
        <Text style={s.subtitle}>Enter your email and we&apos;ll send a new activation link.</Text>

        <AnimatedFloatingLabel
          label="Email" value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address" autoComplete="email"
          returnKeyType="done" onSubmitEditing={onSubmit} inputRef={emailRef}
        />

        <Button mode="contained" onPress={onSubmit} loading={loading} disabled={loading} style={s.button}>
          Send activation email
        </Button>

        <Button onPress={() => navigation.navigate("Login")} accessibilityRole="link" compact style={s.linkButton}>
          <Text style={s.linkLabel}>Back to Login</Text>
        </Button>

        {/* Shared top toast */}
        <TopSnackbar
          visible={toast.visible}
          message={toast.msg}
          variant={toast.variant}
          onDismiss={() => setToast({ visible: false, msg: "" })}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { gap: 14, paddingHorizontal: 16 },
  title: { color: "#fff", textAlign: "center", marginBottom: 6, fontWeight: "800", marginTop: 20 },
  subtitle: { color: "rgba(255,255,255,0.85)", textAlign: "center", marginBottom: 4 },

  // Animated input styles
  inputContainer: { position: "relative" },
  floatingLabel: { position: "absolute", left: 16, zIndex: 10, fontWeight: "500" },
  flat: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, height: INPUT_HEIGHT, paddingHorizontal: 12 },
  contentStyle: { paddingTop: 20, paddingBottom: 8 },

  // CTA + links
  button: { marginTop: 8 },
  linkButton: { alignSelf: "center" },
  linkLabel: { fontSize: 14, color: "#FFFFFF" },
});
