import React, { useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TextInput as RNTextInput,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  Checkbox,
  TouchableRipple,
} from "react-native-paper";
import { useAuth } from "../../../app/providers/useAuth";
import { ApiError } from "../../../api/client";
import TopSnackbar from "../../../shared/ui/TopSnackbar";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

const INPUT_HEIGHT = 64;

/** Reusable animated floating label input (same UX as other screens) */
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
    Animated.timing(animatedLabel, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

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

  const labelTop = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 8],
  });

  const labelFontSize = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

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
  // This ensures the text updates immediately
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

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth() as any;
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage(); // Use LanguageProvider

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [agree, setAgree] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; msg: string }>({
    visible: false,
    msg: "",
  });

  const emailRef = useRef<RNTextInput | null>(null);
  const pwdRef = useRef<RNTextInput | null>(null);
  const pwd2Ref = useRef<RNTextInput | null>(null);

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const passwordValid = pwd.length >= 6;
  const passwordsMatch = pwd && pwd === pwd2;
  const formValid = emailValid && passwordValid && passwordsMatch && agree;

  // Safe translation function that uses both hooks
  const getTranslation = useCallback((key: string): string => {
    try {
      // Force dependency on currentLanguage to ensure updates
      const lang = currentLanguage;
      const translation = t(key);
      return translation || key.split('.').pop() || key;
    } catch (error) {
      console.warn('Translation error for key:', key, error);
      return key.split('.').pop() || key;
    }
  }, [t, currentLanguage]);

  // Debug: Log when component renders with current language
  React.useEffect(() => {
    console.log('RegisterScreen rendering with language:', currentLanguage);
  }, [currentLanguage]);

  async function onSubmit() {
    if (!formValid) {
      let msg = getTranslation('register.errors.incompleteForm');
      if (!emailValid) msg = getTranslation('register.errors.invalidEmail');
      else if (!passwordValid) msg = getTranslation('register.errors.shortPassword');
      else if (!passwordsMatch) msg = getTranslation('register.errors.passwordsMismatch');
      else if (!agree) msg = getTranslation('register.errors.termsRequired');
      setToast({ visible: true, msg });
      return;
    }

    setLoading(true);
    try {
      if (typeof register === "function") {
        await register({ email, password: pwd });
      }
      setToast({ visible: true, msg: getTranslation('register.success.accountCreated') });
    } catch (e: any) {
      const msg =
        e instanceof ApiError
          ? e.body?.message || e.message
          : getTranslation('register.errors.registrationFailed');
      setToast({ visible: true, msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        {/* Use the safe translation wrapper for the title */}
        <TranslatedText 
          tKey="register.title" 
          variant="headlineMedium"
          style={s.title} 
        />

        <AnimatedFloatingLabel
          label={getTranslation('register.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => pwdRef.current?.focus()}
          inputRef={emailRef}
        />

        <AnimatedFloatingLabel
          label={getTranslation('register.password')}
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
          label={getTranslation('register.confirmPassword')}
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

        {/* Full-width pressable row with checkbox + wrapping text */}
        <TouchableRipple
          onPress={() => setAgree((v) => !v)}
          accessibilityRole="button"
          style={s.agreeRipple}
          borderless={false}
          rippleColor="rgba(255,255,255,0.15)"
        >
          <View style={s.agreeRow}>
            <Checkbox
              status={agree ? "checked" : "unchecked"}
              onPress={() => setAgree((v) => !v)}
              color="#FFFFFF"
              uncheckedColor="#FFFFFF"
              style={s.checkbox}
            />
            <Text style={s.agreeText}>
              {getTranslation('register.termsAgreement')}{" "}
              <Text
                style={[s.agreeText, s.linkBold, s.linkUnderline]}
                onPress={() => {
                  // navigation.navigate("Terms") or Linking.openURL("https://example.com/terms")
                }}
              >
                {getTranslation('register.termsLink')}
              </Text>
            </Text>
          </View>
        </TouchableRipple>

        <Button
          mode="contained"
          onPress={onSubmit}
          loading={loading}
          disabled={loading || !formValid}
          style={s.button}
        >
          {getTranslation('register.signUpButton')}
        </Button>

        {/* Already have an account? Login */}
        <Button
          onPress={() => navigation.navigate("Login")}
          accessibilityRole="link"
          compact
          style={s.linkButton}
        >
          <Text style={s.linkLabel}>
            {getTranslation('register.haveAccount')}{" "}
            <Text style={[s.linkLabel, s.linkBold]}>
              {getTranslation('register.loginLink')}
            </Text>
          </Text>
        </Button>

        {/* Shared top toast */}
        <TopSnackbar
          visible={toast.visible}
          message={toast.msg}
          onDismiss={() => setToast({ visible: false, msg: "" })}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 14,
    paddingHorizontal: 16,
  },
  title: {
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
    fontWeight: "800",
    marginTop: 20,
  },

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

  // CTA
  button: { marginTop: 8 },

  // Agree row (full width, no clipping, wraps nicely)
  agreeRipple: {
    alignSelf: "stretch",
    borderRadius: 12,
  },
  agreeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0, // more space left/right
    paddingVertical: 5,   // taller for checkbox
    minHeight: 50,
  },
  checkbox: {
    marginRight: 10,
  },
  agreeText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
    flex: 1,        // take the remaining width
    flexShrink: 1,  // allow wrapping
    flexWrap: "wrap",
  },

  // link-style buttons/labels
  linkButton: { alignSelf: "center" },
  linkLabel: { fontSize: 14, color: "#FFFFFF" },
  linkBold: { fontWeight: "700" },
  linkUnderline: { textDecorationLine: "underline" },
});