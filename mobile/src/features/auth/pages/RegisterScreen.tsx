import React, { useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TextInput as RNTextInput,
  Linking,
} from "react-native";
import { Text, TextInput, Button, Checkbox, TouchableRipple } from "react-native-paper";
import { useAuth } from "../../../app/providers/useAuth";
import { ApiError } from "../../../api/client";
import TopSnackbar from "../../../shared/ui/TopSnackbar";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

const INPUT_HEIGHT = 64;

// GitHub Pages base (repo name included)
const WEB_BASE = "https://pudelosha.github.io/Flovers";

function normalizeLang(lang) {
  if (!lang) return "en";
  const lc = String(lang).toLowerCase();
  return lc.startsWith("pl") ? "pl" : "en";
}

// For Terms specifically, this guarantees:
// https://pudelosha.github.io/Flovers/en/terms (or /pl/terms)
function buildTermsUrl(lang) {
  const safeLang = normalizeLang(lang);
  return `${WEB_BASE}/${safeLang}/terms`;
}

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
        style={[
          s.floatingLabel,
          { top: labelTop, fontSize: labelFontSize, color: labelColor },
        ]}
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

  // Force re-render on language change
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

export default function RegisterScreen({ navigation }: any) {
  const { register } = useAuth() as any;
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage(); // Use LanguageProvider

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

  // Safe translation function
  const getTranslation = useCallback(
    (key: string): string => {
      try {
        const _lang = currentLanguage; // keep dependency
        const translation = t(key);
        return translation || key.split(".").pop() || key;
      } catch (error) {
        console.warn("Translation error for key:", key, error);
        return key.split(".").pop() || key;
      }
    },
    [t, currentLanguage]
  );

  // Open Terms page in browser with language from LanguageProvider
  // Correction: remove canOpenURL to avoid false negatives for https on some setups.
  const openTerms = useCallback(async () => {
    const url = buildTermsUrl(currentLanguage);

    // Optional debug (remove later)
    console.log("Opening Terms URL:", url);

    try {
      await Linking.openURL(url);
    } catch (e) {
      setToast({
        visible: true,
        msg: getTranslation("register.errors.cannotOpenLink"),
      });
    }
  }, [currentLanguage, getTranslation]);

  // Debug: Log when component renders with current language
  React.useEffect(() => {
    console.log("RegisterScreen rendering with language:", currentLanguage);
  }, [currentLanguage]);

  async function onSubmit() {
    if (!formValid) {
      let msg = getTranslation("register.errors.incompleteForm");
      if (!emailValid) msg = getTranslation("register.errors.invalidEmail");
      else if (!passwordValid) msg = getTranslation("register.errors.shortPassword");
      else if (!passwordsMatch) msg = getTranslation("register.errors.passwordsMismatch");
      else if (!agree) msg = getTranslation("register.errors.termsRequired");
      setToast({ visible: true, msg });
      return;
    }

    setLoading(true);
    try {
      if (typeof register === "function") {
        await register({ email, password: pwd, lang: currentLanguage });
        navigation.replace("RegisterSuccess", { email });
        return;
      }

      setEmail("");
      setPwd("");
      setPwd2("");
      setAgree(false);

      navigation.replace("RegisterSuccess", { email });
    } catch (e: any) {
      if (e instanceof ApiError) {
        const emailErr = e.body?.errors?.email;
        if (emailErr && Array.isArray(emailErr) && emailErr.length) {
          setToast({
            visible: true,
            msg: getTranslation("register.errors.emailTaken"),
          });
          return;
        }
        const msg =
          e.body?.message ||
          e.message ||
          getTranslation("register.errors.registrationFailed");
        setToast({ visible: true, msg });
        return;
      }

      setToast({
        visible: true,
        msg: getTranslation("register.errors.registrationFailed"),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        <TranslatedText tKey="register.title" variant="headlineMedium" style={s.title} />

        <AnimatedFloatingLabel
          label={getTranslation("register.email")}
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
          label={getTranslation("register.password")}
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
          label={getTranslation("register.confirmPassword")}
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
              {getTranslation("register.termsAgreement")}{" "}
              <Text
                style={[s.agreeText, s.linkBold, s.linkUnderline]}
                onPress={openTerms}
              >
                {getTranslation("register.termsLink")}
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
          {getTranslation("register.signUpButton")}
        </Button>

        <Button
          onPress={() => navigation.navigate("Login")}
          accessibilityRole="link"
          compact
          style={s.linkButton}
        >
          <Text style={s.linkLabel}>
            {getTranslation("register.haveAccount")}{" "}
            <Text style={[s.linkLabel, s.linkBold]}>
              {getTranslation("register.loginLink")}
            </Text>
          </Text>
        </Button>

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

  agreeRipple: {
    alignSelf: "stretch",
    borderRadius: 12,
  },
  agreeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingVertical: 5,
    minHeight: 50,
  },
  checkbox: {
    marginRight: 10,
  },
  agreeText: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
    flex: 1,
    flexShrink: 1,
    flexWrap: "wrap",
  },

  linkButton: { alignSelf: "center" },
  linkLabel: { fontSize: 14, color: "#FFFFFF" },
  linkBold: { fontWeight: "700" },
  linkUnderline: { textDecorationLine: "underline" },
});
