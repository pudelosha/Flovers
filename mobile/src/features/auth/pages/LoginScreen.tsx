import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  Animated,
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
  label, value, onChangeText, onFocus, onBlur, onSubmitEditing,
  returnKeyType, autoComplete, keyboardType, autoCapitalize, secureTextEntry,
  right, inputRef, ...props
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
        autoComplete={autoComplete} keyboardType={keyboardType}
        autoCapitalize={autoCapitalize} secureTextEntry={secureTextEntry}
        right={right} ref={inputRef} style={s.flat} contentStyle={s.contentStyle}
        underlineColor="transparent" activeUnderlineColor="transparent"
        selectionColor="#FFFFFF" textColor="#FFFFFF" cursorColor="#FFFFFF" placeholder="" {...props}
      />
    </View>
  );
};

// Create a wrapper component that ensures translations are ready
const TranslatedText = ({ tKey, children, style }: { tKey: string, children?: any, style?: any }) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  
  // Use currentLanguage to force re-render when language changes
  // This ensures the text updates immediately
  React.useMemo(() => {}, [currentLanguage]);
  
  try {
    const text = t(tKey);
    return <Text style={style}>{text}</Text>;
  } catch (error) {
    // Fallback to key if translation fails
    return <Text style={style}>{tKey.split('.').pop()}</Text>;
  }
};

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();

  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false); 
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; msg: string; variant?: "default" | "success" | "error" }>({
    visible: false,
    msg: "",
    variant: "default",
  });

  const pwdRef = useRef<RNTextInput | null>(null); 
  const emailRef = useRef<RNTextInput | null>(null);

  // Safe translation function that uses both hooks
  const getTranslation = React.useCallback((key: string): string => {
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

  async function onSubmit() {
    setLoading(true);
    try {
      await login({ email, password });
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.body?.message || e.message : getTranslation('login.errors.invalidCredentials');
      setToast({ visible: true, msg, variant: "error" });
    } finally { 
      setLoading(false); 
    }
  }

  // Debug: Log when component renders with current language
  React.useEffect(() => {
    console.log('LoginScreen rendering with language:', currentLanguage);
  }, [currentLanguage]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        {/* Use the safe translation wrapper for the title */}
        <TranslatedText tKey="login.title" style={s.title} />

        <AnimatedFloatingLabel
          label={getTranslation('login.email')}
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
          label={getTranslation('login.password')}
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
              onPress={() => setShowPwd(v => !v)}
              forceTextInputFocus={false}
              color="rgba(255,255,255,0.95)"
            />
          }
        />

        <Button
          mode="contained"
          onPress={onSubmit}
          loading={loading}
          disabled={loading}
          style={s.button}
        >
          {getTranslation('login.signIn')}
        </Button>

        <Button
          onPress={() => navigation.navigate("ForgotPassword")}
          accessibilityRole="link"
          compact
          style={s.linkButton}
        >
          <Text style={s.linkLabel}>{getTranslation('login.forgotPassword')}</Text>
        </Button>

        <Button
          onPress={() => navigation.navigate("ResendActivation")}
          accessibilityRole="link"
          compact
          style={[s.linkButton, s.linkTight]}
        >
          <Text style={s.linkLabel}>{getTranslation('login.resendActivation')}</Text>
        </Button>

        <Button
          onPress={() => navigation.navigate("Register")}
          accessibilityRole="link"
          compact
          style={[s.linkButton, s.linkTight]}
        >
          <Text style={s.linkLabel}>
            {getTranslation('login.noAccount')}{" "}
            <Text style={[s.linkLabel, s.linkBold]}>
              {getTranslation('login.signUp')}
            </Text>
          </Text>
        </Button>

        {/* Top toast (shared UI) */}
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
    fontSize: 24 // Added explicit font size
  },
  inputContainer: { position: "relative" },
  floatingLabel: { position: "absolute", left: 16, zIndex: 10, fontWeight: "500" },
  flat: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, height: INPUT_HEIGHT, paddingHorizontal: 12 },
  contentStyle: { paddingTop: 20, paddingBottom: 8 },
  button: { marginTop: 8 },
  linkButton: { alignSelf: "center" },
  linkTight: { marginTop: -4 },
  linkLabel: { fontSize: 14, color: "#FFFFFF" },
  linkBold: { fontWeight: "700" },
});