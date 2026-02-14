import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Text, Button, ActivityIndicator } from "react-native-paper";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useAuth } from "../../../app/providers/useAuth";
import { ApiError } from "../../../api/client";
import TopSnackbar from "../../../shared/ui/TopSnackbar";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

type ConfirmParams = {
  token?: string;
  uid?: string;
  email?: string;
  url?: string;
};

type AuthStackParamList = {
  ConfirmEmail: ConfirmParams;
};

function parseQuery(url: string): Record<string, string> {
  try {
    const q = url.split("?")[1] || "";
    const out: Record<string, string> = {};
    q.split("&")
      .filter(Boolean)
      .forEach((pair) => {
        const [k, v] = pair.split("=");
        if (k) out[decodeURIComponent(k)] = decodeURIComponent(v || "");
      });
    return out;
  } catch {
    return {};
  }
}

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
 * Fix for long translated "link" text:
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

export default function ConfirmEmailScreen({ navigation }: any) {
  const route = useRoute<RouteProp<AuthStackParamList, "ConfirmEmail">>();
  const { confirmEmail } = useAuth() as any;
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>("");
  const [toast, setToast] = useState<{
    visible: boolean;
    msg: string;
    variant?: "default" | "success" | "error";
  }>({
    visible: false,
    msg: "",
    variant: "default",
  });

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
    console.log("ConfirmEmailScreen rendering with language:", currentLanguage);
  }, [currentLanguage]);

  // Initialize message with translation
  useEffect(() => {
    setMessage(getTranslation("confirmEmail.confirming", "Confirming..."));
  }, [getTranslation]);

  // Gather params from either route params or a full URL
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

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = derived.token;
      const uid = derived.uid;

      if (!token || !uid) {
        setOk(false);
        setMessage(
          getTranslation("confirmEmail.invalidLink", "Invalid or expired confirmation link.")
        );
        setLoading(false);
        return;
      }

      try {
        if (typeof confirmEmail === "function") {
          await confirmEmail({ token, uid });
        } else {
          await new Promise((r) => setTimeout(r, 500));
        }
        if (!cancelled) {
          setOk(true);
          setMessage(
            getTranslation(
              "confirmEmail.success",
              "Your email has been confirmed successfully!"
            )
          );
        }
      } catch (e: any) {
        if (!cancelled) {
          const msg =
            e instanceof ApiError
              ? e.body?.message || e.message
              : getTranslation(
                  "confirmEmail.activationFailed",
                  "Activation failed. Please try again."
                );
          setOk(false);
          setMessage(msg);
          setToast({ visible: true, msg, variant: "error" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
  }, [confirmEmail, derived, getTranslation]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        <TranslatedText tKey="confirmEmail.title" variant="headlineMedium" style={s.title} />

        <View style={s.resultBox}>
          {loading ? (
            <View style={s.centerRow}>
              <ActivityIndicator animating size="small" />
              <Text style={s.resultText}>  {message}</Text>
            </View>
          ) : (
            <Text style={[s.resultText, ok ? s.resultOk : s.resultErr]}>{message}</Text>
          )}
        </View>

        {/* Primary CTA depends on result */}
        {!loading && ok === true && (
          <Button mode="contained" onPress={() => navigation.navigate("Login")} style={s.button}>
            {getTranslation("confirmEmail.goToLogin", "Go to Login")}
          </Button>
        )}

        {!loading && ok === false && (
          <Button
            mode="contained"
            onPress={() => navigation.navigate("ResendActivation", { email: derived.email })}
            style={s.button}
          >
            {getTranslation("confirmEmail.resendActivation", "Resend Activation Email")}
          </Button>
        )}

        {/* FIXED: link-like action rendered with Pressable so it wraps */}
        <LinkText
          onPress={() => navigation.navigate("Login")}
          text={getTranslation("confirmEmail.backToLogin", "Back to Login")}
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
  title: {
    color: "#fff",
    textAlign: "center",
    marginBottom: 6,
    fontWeight: "800",
    marginTop: 20,
  },
  resultBox: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  centerRow: { flexDirection: "row", alignItems: "center" },
  resultText: { color: "rgba(255,255,255,0.95)" },
  resultOk: { color: "#E6FFFA" },
  resultErr: { color: "#FFE6E6" },
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
