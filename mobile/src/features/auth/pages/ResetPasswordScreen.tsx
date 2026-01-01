import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TextInput as RNTextInput,
} from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useAuth } from "../../../app/providers/useAuth";
import { ApiError } from "../../../api/client";
import TopSnackbar from "../../../shared/ui/TopSnackbar";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider"; // Add LanguageProvider import

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
      <Animated.Text style={[s.floatingLabel, { top: labelTop, fontSize: labelFontSize, color: labelColor }]}>{label}</Animated.Text>
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

// Create a wrapper component that ensures translations are ready
const TranslatedText = ({ tKey, children, style, variant }: { 
  tKey: string, 
  children?: any, 
  style?: any,
  variant?: "headlineMedium" | "bodyMedium" | "bodySmall" 
}) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  
  // Use currentLanguage to force re-render when language changes
  React.useMemo(() => {}, [currentLanguage]);
  
  try {
    const text = t(tKey);
    if (variant) {
      return <Text variant={variant} style={style}>{text}</Text>;
    }
    return <Text style={style}>{text}</Text>;
  } catch (error) {
    // Fallback to key if translation fails
    const fallbackText = tKey.split('.').pop() || tKey;
    if (variant) {
      return <Text variant={variant} style={style}>{fallbackText}</Text>;
    }
    return <Text style={style}>{fallbackText}</Text>;
  }
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
  const route = useRoute<RouteProp<AuthStackParamList, "ResetPassword">>();
  const { resetPassword } = useAuth() as any;
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage(); // Use LanguageProvider

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
  const [toast, setToast] = useState<{ visible: boolean; msg: string; variant?: "default" | "success" | "error" }>({
    visible: false,
    msg: "",
    variant: "default",
  });

  const pwdRef = useRef<RNTextInput | null>(null);
  const pwd2Ref = useRef<RNTextInput | null>(null);

  const passwordValid = pwd.length >= 6;
  const passwordsMatch = pwd && pwd === pwd2;
  const formValid = passwordValid && passwordsMatch && !!derived.token && !!derived.uid;

  // Safe translation function that uses both hooks
  const getTranslation = useCallback((key: string, fallback?: string): string => {
    try {
      // Force dependency on currentLanguage to ensure updates
      const lang = currentLanguage;
      const translation = t(key);
      return translation || fallback || key.split('.').pop() || key;
    } catch (error) {
      console.warn('Translation error for key:', key, error);
      return fallback || key.split('.').pop() || key;
    }
  }, [t, currentLanguage]);

  // Debug: Log when component renders with current language
  React.useEffect(() => {
    console.log('ResetPasswordScreen rendering with language:', currentLanguage);
  }, [currentLanguage]);

  async function onSubmit() {
    if (!formValid) {
      let msg = getTranslation("resetPassword.error", "Please fix the errors below");
      if (!derived.token || !derived.uid) msg = getTranslation("resetPassword.invalidLink", "Invalid or expired reset link");
      else if (!passwordValid) msg = getTranslation("resetPassword.passwordTooShort", "Password must be at least 6 characters");
      else if (!passwordsMatch) msg = getTranslation("resetPassword.passwordsDoNotMatch", "Passwords do not match");
      setToast({ visible: true, msg, variant: "error" });
      return;
    }

    setLoading(true);
    try {
      if (typeof resetPassword === "function") {
        await resetPassword({ token: derived.token, uid: derived.uid, password: pwd });
      } else {
        await new Promise((r) => setTimeout(r, 500));
      }
      setToast({ visible: true, msg: getTranslation("resetPassword.success", "Password reset successfully"), variant: "success" });
      navigation.navigate("Login");
    } catch (e: any) {
      const msg =
        e instanceof ApiError
          ? e.body?.message || e.message
          : getTranslation("resetPassword.error", "Something went wrong. Please try again.");
      setToast({ visible: true, msg, variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!derived.token || !derived.uid) {
      setToast({
        visible: true,
        msg: getTranslation("resetPassword.invalidLink", "Invalid or expired reset link"),
        variant: "default",
      });
    }
  }, [derived, getTranslation]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        {/* Use the safe translation wrapper for the title */}
        <TranslatedText 
          tKey="resetPassword.resetPassword" 
          variant="headlineMedium"
          style={s.title} 
        />

        <AnimatedFloatingLabel
          label={getTranslation("resetPassword.newPassword", "New Password")}
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
          label={getTranslation("resetPassword.confirmPassword", "Confirm Password")}
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
          {getTranslation("resetPassword.changePassword", "Change Password")}
        </Button>

        <Button onPress={() => navigation.navigate("Login")} accessibilityRole="link" compact style={s.linkButton}>
          <Text style={s.linkLabel}>{getTranslation("resetPassword.backToLogin", "Back to Login")}</Text>
        </Button>

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
  inputContainer: { position: "relative" },
  floatingLabel: { position: "absolute", left: 16, zIndex: 10, fontWeight: "500" },
  flat: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, height: INPUT_HEIGHT, paddingHorizontal: 12 },
  contentStyle: { paddingTop: 20, paddingBottom: 8 },
  button: { marginTop: 8 },
  linkButton: { alignSelf: "center" },
  linkLabel: { fontSize: 14, color: "#FFFFFF" },
});