import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TextInput as RNTextInput,
} from "react-native";
import { Text, TextInput, Button, Snackbar, Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useAuth } from "../../../app/providers/useAuth";
import { ApiError } from "../../../api/client";

const INPUT_HEIGHT = 64;

/** Animated floating label (same look as other auth screens) */
const AnimatedFloatingLabel = ({
  label,
  value,
  onChangeText,
  onFocus,
  onBlur,
  onSubmitEditing,
  returnKeyType,
  autoComplete,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  right,
  inputRef,
  ...props
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  const animateLabel = (toValue: number) => {
    Animated.timing(animatedLabel, { toValue, duration: 200, useNativeDriver: false }).start();
  };

  const handleFocus = () => { setIsFocused(true); animateLabel(1); onFocus?.(); };
  const handleBlur = () => { setIsFocused(false); if (!value) animateLabel(0); onBlur?.(); };
  const handleChangeText = (text: string) => { if (!isFocused && text) animateLabel(1); onChangeText(text); };

  const labelTop = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [22, 8] });
  const labelFontSize = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [16, 12] });
  const labelColor = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.6)", "#FFFFFF"],
  });

  return (
    <View style={s.inputContainer}>
      <Animated.Text style={[s.floatingLabel, { top: labelTop, fontSize: labelFontSize, color: labelColor }]}>
        {label}
      </Animated.Text>
      <TextInput
        mode="flat"
        value={value}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        autoComplete={autoComplete}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        right={right}
        ref={inputRef}
        style={s.flat}
        contentStyle={s.contentStyle}
        underlineColor="transparent"
        activeUnderlineColor="transparent"
        selectionColor="#FFFFFF"
        textColor="#FFFFFF"
        cursorColor="#FFFFFF"
        placeholder=""
        {...props}
      />
    </View>
  );
};

type ResetParams = { token?: string; uid?: string; email?: string; url?: string };
type AuthStackParamList = { ResetPassword: ResetParams };

function parseQuery(url: string): Record<string, string> {
  try {
    const q = url.split("?")[1] || "";
    const out: Record<string, string> = {};
    q.split("&").filter(Boolean).forEach((pair) => {
      const [k, v] = pair.split("=");
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || "");
    });
    return out;
  } catch {
    return {};
  }
}

export default function ResetPasswordScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<AuthStackParamList, "ResetPassword">>();
  const { resetPassword } = useAuth() as any; // rename to your actual method, e.g. confirmPasswordReset

  const params = route.params || {};
  const derived = useMemo(() => {
    const { token, uid, email, url } = params;
    if (token || uid) return { token, uid, email };
    if (url) {
      const qs = parseQuery(url);
      return {
        token: qs.token ?? qs.key ?? qs.code,
        uid: qs.uid ?? qs.u,
        email: qs.email,
      };
    }
    return { token: undefined, uid: undefined, email: undefined };
  }, [params]);

  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; msg: string }>({ visible: false, msg: "" });

  const pwdRef = useRef<RNTextInput | null>(null);
  const pwd2Ref = useRef<RNTextInput | null>(null);

  const passwordValid = pwd.length >= 6;
  const passwordsMatch = pwd && pwd === pwd2;
  const formValid = passwordValid && passwordsMatch && !!derived.token && !!derived.uid;

  async function onSubmit() {
    if (!formValid) {
      let msg = "Please complete the form.";
      if (!derived.token || !derived.uid) msg = "Invalid or missing reset link.";
      else if (!passwordValid) msg = "Password should be at least 6 characters.";
      else if (!passwordsMatch) msg = "Passwords do not match.";
      setToast({ visible: true, msg });
      return;
    }

    setLoading(true);
    try {
      if (typeof resetPassword === "function") {
        await resetPassword({ token: derived.token, uid: derived.uid, password: pwd });
      } else {
        // Temporary fake success to let you test the flow without backend
        await new Promise((r) => setTimeout(r, 500));
      }
      setToast({ visible: true, msg: "Password changed. Please log in." });
      navigation.navigate("Login");
    } catch (e: any) {
      const msg =
        e instanceof ApiError
          ? e.body?.message || e.message
          : "Could not reset password. The link may be invalid or expired.";
      setToast({ visible: true, msg });
    } finally {
      setLoading(false);
    }
  }

  // If no token/uid in params, show a quick guidance toast after mount
  useEffect(() => {
    if (!derived.token || !derived.uid) {
      setToast({
        visible: true,
        msg: "Open this page via the reset link from your email.",
      });
    }
  }, [derived]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        <Text variant="headlineMedium" style={s.title}>
          Reset Password
        </Text>

        <AnimatedFloatingLabel
          label="New Password"
          value={pwd}
          onChangeText={setPwd}
          secureTextEntry={!showPwd}
          autoComplete="new-password"
          returnKeyType="next"
          onSubmitEditing={() => pwd2Ref.current?.focus()}
          inputRef={pwdRef}
          right={
            <TextInput.Icon
              icon={showPwd ? "eye-off" : "eye"}
              onPress={() => setShowPwd((v) => !v)}
              forceTextInputFocus={false}
              color="rgba(255,255,255,0.95)"
            />
          }
        />

        <AnimatedFloatingLabel
          label="Confirm Password"
          value={pwd2}
          onChangeText={setPwd2}
          secureTextEntry={!showPwd2}
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          inputRef={pwd2Ref}
          right={
            <TextInput.Icon
              icon={showPwd2 ? "eye-off" : "eye"}
              onPress={() => setShowPwd2((v) => !v)}
              forceTextInputFocus={false}
              color="rgba(255,255,255,0.95)"
            />
          }
        />

        <Button
          mode="contained"
          onPress={onSubmit}
          loading={loading}
          disabled={loading || !formValid}
          style={s.button}
        >
          Change password
        </Button>

        <Button onPress={() => navigation.navigate("Login")} accessibilityRole="link" compact style={s.linkButton}>
          <Text style={s.linkLabel}>Back to Login</Text>
        </Button>

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
  container: { gap: 14, paddingHorizontal: 16 },
  title: { color: "#fff", textAlign: "center", marginBottom: 6, fontWeight: "800", marginTop: 20 },

  // Animated input styles
  inputContainer: { position: "relative" },
  floatingLabel: { position: "absolute", left: 16, zIndex: 10, fontWeight: "500" },
  flat: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    height: INPUT_HEIGHT,
    paddingHorizontal: 12,
  },
  contentStyle: { paddingTop: 20, paddingBottom: 8 },

  button: { marginTop: 8 },
  linkButton: { alignSelf: "center" },
  linkLabel: { fontSize: 14, color: "#FFFFFF" },

  // toast
  snackWrapper: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  snack: { backgroundColor: "#0a5161", borderRadius: 24 },
});
