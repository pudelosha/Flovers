// src/screens/auth/LoginScreen.tsx
import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  Animated,
} from "react-native";
import { Text, TextInput, Button, Snackbar, Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/useAuth";
import { ApiError } from "../../api/client";

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
  const animatedLabel = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    animateLabel(1);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value) {
      animateLabel(0);
    }
    onBlur?.();
  };

  const animateLabel = (toValue: number) => {
    Animated.timing(animatedLabel, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleChangeText = (text: string) => {
    if (!isFocused && text) {
      animateLabel(1);
    }
    onChangeText(text);
  };

  // Interpolated values for animation
  const labelTop = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 8], // Moves from center to top
  });

  const labelFontSize = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12], // Shrinks from normal to small
  });

  const labelColor = animatedLabel.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.6)", "#FFFFFF"], // Changes from placeholder to white
  });

  return (
    <View style={s.inputContainer}>
      {/* Animated floating label */}
      <Animated.Text
        style={[
          s.floatingLabel,
          {
            top: labelTop,
            fontSize: labelFontSize,
            color: labelColor,
          },
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
        placeholder="" // We handle placeholder with our animated label
        {...props}
      />
    </View>
  );
};

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; msg: string }>({
    visible: false,
    msg: "",
  });

  const pwdRef = useRef<RNTextInput | null>(null);
  const emailRef = useRef<RNTextInput | null>(null);

  async function onSubmit() {
    setLoading(true);
    try {
      await login({ email, password });
    } catch (e: any) {
      const msg =
        e instanceof ApiError ? e.body?.message || e.message : "Invalid email or password.";
      setToast({ visible: true, msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        <Text variant="headlineMedium" style={s.title}>
          Login
        </Text>

        {/* Email with animated floating label */}
        <AnimatedFloatingLabel
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => pwdRef.current?.focus()}
          inputRef={emailRef}
        />

        {/* Password with animated floating label */}
        <AnimatedFloatingLabel
          label="Password"
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
              onPress={() => setShowPwd((v) => !v)}
              forceTextInputFocus={false}
              color="rgba(255,255,255,0.95)"
            />
          }
        />

        {/* Primary action */}
        <Button
          mode="contained"
          onPress={onSubmit}
          loading={loading}
          disabled={loading}
          style={s.button}
        >
          Sign in
        </Button>

        {/* Link buttons (smaller text) */}
        <Button
          onPress={() => navigation.navigate("ForgotPassword")}
          accessibilityRole="link"
          compact
          style={s.linkButton}
        >
          <Text style={s.linkLabel}>Forgot password?</Text>
        </Button>

        <Button
          onPress={() => navigation.navigate("ResendActivation")}
          accessibilityRole="link"
          compact
          style={[s.linkButton, s.linkTight]}
        >
          <Text style={s.linkLabel}>Didn&apos;t receive an activation email?</Text>
        </Button>

        <Button
          onPress={() => navigation.navigate("Register")}
          accessibilityRole="link"
          compact
          style={[s.linkButton, s.linkTight]}
        >
          <Text style={s.linkLabel}>
            Don&apos;t have an account?{" "}
            <Text style={[s.linkLabel, s.linkBold]}>Sign Up</Text>
          </Text>
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

  // Custom input container
  inputContainer: {
    position: "relative",
  },
  // Animated floating label
  floatingLabel: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    fontWeight: "500",
  },

  // FLAT input: rounded, filled background, no underline
  flat: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    height: INPUT_HEIGHT,
    paddingHorizontal: 12,
  },
  // Adjusted content style to accommodate animated label
  contentStyle: {
    paddingTop: 20,
    paddingBottom: 8,
  },

  button: {
    marginTop: 8,
  },

  // Link buttons (text-mode look, smaller font)
  linkButton: {
    alignSelf: "center",
  },
  linkTight: {
    marginTop: -4,
  },
  linkLabel: {
    fontSize: 14, // a bit smaller than default
    color: "#FFFFFF",
  },
  linkBold: {
    fontWeight: "700",
  },

  // toast
  snackWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  snack: {
    backgroundColor: "#0a5161",
    borderRadius: 24,
  },
});
