import React, { useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TextInput as RNTextInput,
  Pressable,
} from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { ApiError } from "../../../api/client";
import { useAuth } from "../../../app/providers/useAuth";
import TopSnackbar from "../../../shared/ui/TopSnackbar";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

const INPUT_HEIGHT = 64;

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
  right,
  inputRef,
  ...props
}: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  const animateLabel = (toValue: number) =>
    Animated.timing(animatedLabel, { toValue, duration: 200, useNativeDriver: false }).start();

  const handleFocus = () => {
    setIsFocused(true);
    animateLabel(1);
    onFocus?.();
  };
  const handleBlur = () => {
    setIsFocused(false);
    if (!value) animateLabel(0);
    onBlur?.();
  };
  const handleChangeText = (text: string) => {
    if (!isFocused && text) animateLabel(1);
    onChangeText(text);
  };

  const labelTop = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [22, 8] });
  const labelFontSize = animatedLabel.interpolate({ inputRange: [0, 1], outputRange: [16, 12] });
  const labelColor = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.6)", "#FFFFFF"],
  });

  return (
    <View style={s.inputContainer}>
      <Animated.Text
        style={[s.floatingLabel, { top: labelTop, fontSize: labelFontSize, color: labelColor }]}
      >
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
const TranslatedText = ({
  tKey,
  children,
  style,
  variant,
}: {
  tKey: string;
  children?: any;
  style?: any;
  variant?: "headlineMedium" | "bodyMedium" | "bodySmall";
}) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  // Use currentLanguage to force re-render when language changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useMemo(() => {}, [currentLanguage]);

  try {
    const text = t(tKey);
    if (variant) {
      return (
        <Text variant={variant} style={style}>
          {text}
        </Text>
      );
    }
    return <Text style={style}>{text}</Text>;
  } catch (error) {
    const fallbackText = tKey.split(".").pop() || tKey;
    if (variant) {
      return (
        <Text variant={variant} style={style}>
          {fallbackText}
        </Text>
      );
    }
    return <Text style={style}>{fallbackText}</Text>;
  }
};

/**
 * Fix for long translated link text:
 * Paper <Button compact> often clips instead of wrapping.
 * Use Pressable + Text so it can wrap to 2 lines.
 */
const LinkText = ({
  onPress,
  text,
  style,
  numberOfLines = 2,
}: {
  onPress: () => void;
  text: string;
  style?: any;
  numberOfLines?: number;
}) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => [s.linkPressable, pressed && s.linkPressed, style]}
    >
      <Text style={s.linkLabel} numberOfLines={numberOfLines} ellipsizeMode="tail">
        {text}
      </Text>
    </Pressable>
  );
};

export default function ForgotPasswordScreen({ navigation }: any) {
  const { requestPasswordReset } = useAuth() as any;
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    msg: string;
    variant?: "default" | "success" | "error";
  }>({
    visible: false,
    msg: "",
    variant: "default",
  });

  const emailRef = useRef<RNTextInput | null>(null);

  // Safe translation function that uses both hooks
  const getTranslation = useCallback(
    (key: string, fallback?: string): string => {
      try {
        void currentLanguage; // keep dependency
        const translation = t(key);
        return translation || fallback || key.split(".").pop() || key;
      } catch (error) {
        console.warn("Translation error for key:", key, error);
        return fallback || key.split(".").pop() || key;
      }
    },
    [t, currentLanguage]
  );

  React.useEffect(() => {
    console.log("ForgotPasswordScreen rendering with language:", currentLanguage);
  }, [currentLanguage]);

  async function onSubmit() {
    if (!email.trim()) {
      setToast({
        visible: true,
        msg: getTranslation("forgotPassword.errors.emailRequired", "Email is required"),
        variant: "error",
      });
      return;
    }
    setLoading(true);
    try {
      if (typeof requestPasswordReset === "function") await requestPasswordReset({ email });
      setToast({
        visible: true,
        msg: getTranslation(
          "forgotPassword.success.emailSent",
          "Password reset email sent. Please check your inbox."
        ),
        variant: "success",
      });
    } catch (e: any) {
      const msg =
        e instanceof ApiError
          ? e.body?.message || e.message
          : getTranslation("forgotPassword.errors.generic", "Something went wrong. Please try again.");
      setToast({ visible: true, msg, variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        <TranslatedText tKey="forgotPassword.title" variant="headlineMedium" style={s.title} />

        <TranslatedText tKey="forgotPassword.subtitle" style={s.subtitle} />

        <AnimatedFloatingLabel
          label={getTranslation("forgotPassword.email", "Email")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          inputRef={emailRef}
        />

        <Button mode="contained" onPress={onSubmit} loading={loading} disabled={loading} style={s.button}>
          {getTranslation("forgotPassword.sendButton", "Send Reset Email")}
        </Button>

        {/* FIXED: link-like action rendered with Pressable so it wraps */}
        <LinkText
          onPress={() => navigation.navigate("Login")}
          text={getTranslation("forgotPassword.backToLogin", "Back to Login")}
          style={s.linkTight}
        />

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

  linkPressable: {
    alignSelf: "center",
    maxWidth: "100%",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  linkPressed: {
    opacity: 0.75,
  },
  linkTight: { marginTop: -4 },

  linkLabel: { fontSize: 14, color: "#FFFFFF", textAlign: "center", flexShrink: 1 },
});
