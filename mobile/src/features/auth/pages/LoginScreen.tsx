import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  Animated,
  Pressable,
} from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { useAuth } from "../../../app/providers/useAuth";
import { ApiError } from "../../../api/client";
import TopSnackbar from "../../../shared/ui/TopSnackbar";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

const INPUT_HEIGHT = 64;

// Custom Animated Floating Label Component
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
}: {
  tKey: string;
  children?: any;
  style?: any;
}) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useMemo(() => {}, [currentLanguage]);

  try {
    const text = t(tKey);
    return <Text style={style}>{text}</Text>;
  } catch (error) {
    return <Text style={style}>{tKey.split(".").pop()}</Text>;
  }
};

/**
 * Alternative fix:
 * Paper <Button compact> tends to constrain its label to a single line / clipped layout.
 * Replace link-like Buttons with Pressable + Text so React Native can wrap naturally.
 */
const LinkText = ({
  text,
  onPress,
  style,
  numberOfLines = 2,
}: {
  text: string;
  onPress: () => void;
  style?: any;
  numberOfLines?: number;
}) => {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => [s.linkPressable, pressed && s.linkPressed, style]}>
      <Text style={s.linkLabel} numberOfLines={numberOfLines} ellipsizeMode="tail">
        {text}
      </Text>
    </Pressable>
  );
};

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
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

  const pwdRef = useRef<RNTextInput | null>(null);
  const emailRef = useRef<RNTextInput | null>(null);

  const getTranslation = React.useCallback(
    (key: string): string => {
      try {
        void currentLanguage;
        const translation = t(key);
        return translation || key.split(".").pop() || key;
      } catch (error) {
        console.warn("Translation error for key:", key, error);
        return key.split(".").pop() || key;
      }
    },
    [t, currentLanguage]
  );

  async function onSubmit() {
    setLoading(true);
    try {
      await login({ email, password });
    } catch (e: any) {
      const isApi = e instanceof ApiError;
      const status = (isApi ? (e as any)?.status : undefined) ?? (e as any)?.response?.status;

      const msg =
        status === 400
          ? getTranslation("login.errors.invalidCredentials")
          : getTranslation("login.errors.generic");

      setToast({ visible: true, msg, variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    console.log("LoginScreen rendering with language:", currentLanguage);
  }, [currentLanguage]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        <TranslatedText tKey="login.title" style={s.title} />

        <AnimatedFloatingLabel
          label={getTranslation("login.email")}
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
          label={getTranslation("login.password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPwd}
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          inputRef={pwdRef}
          right={
            <TextInput.Icon
              icon={showPwd ? "eye-off" : "eye"}
              onPress={() => setShowPwd((v: boolean) => !v)}
              forceTextInputFocus={false}
              color="rgba(255,255,255,0.95)"
            />
          }
        />

        <Button mode="contained" onPress={onSubmit} loading={loading} disabled={loading} style={s.button}>
          {getTranslation("login.signIn")}
        </Button>

        {/* Link-like actions: use Pressable + Text so long translations wrap to 2 lines */}
        <LinkText
          text={getTranslation("login.forgotPassword")}
          onPress={() => navigation.navigate("ForgotPassword")}
          style={s.linkTight}
        />

        <LinkText
          text={getTranslation("login.resendActivation")}
          onPress={() => navigation.navigate("ResendActivation")}
          style={s.linkTight}
        />

        {/* Mixed styling (bold part) -> keep as Pressable with nested Text, still wraps */}
        <Pressable
          onPress={() => navigation.navigate("Register")}
          accessibilityRole="link"
          style={({ pressed }) => [s.linkPressable, pressed && s.linkPressed, s.linkTight]}
        >
          <Text style={s.linkLabel} numberOfLines={2} ellipsizeMode="tail">
            {getTranslation("login.noAccount")}{" "}
            <Text style={[s.linkLabel, s.linkBold]}>{getTranslation("login.signUp")}</Text>
          </Text>
        </Pressable>

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

  title: {
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
    fontWeight: "800",
    marginTop: 20,
    fontSize: 24,
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

  linkLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    flexShrink: 1,
  },
  linkBold: { fontWeight: "700" },
});
