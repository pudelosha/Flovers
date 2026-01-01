import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { Text, Button, ActivityIndicator } from "react-native-paper";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useAuth } from "../../../app/providers/useAuth";
import { ApiError } from "../../../api/client";
import TopSnackbar from "../../../shared/ui/TopSnackbar";
import { useTranslation } from "react-i18next"; // Add this import

type ConfirmParams = {
  token?: string;
  uid?: string;
  email?: string;
  /** Optional convenience if you pass a raw URL to this screen */
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

export default function ConfirmEmailScreen({ navigation }: any) {
  const route = useRoute<RouteProp<AuthStackParamList, "ConfirmEmail">>();
  const { confirmEmail } = useAuth() as any; // rename if your hook uses another name
  const { t } = useTranslation(); // Add translation hook

  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>(t('confirmEmail.confirming'));
  const [toast, setToast] = useState<{ visible: boolean; msg: string; variant?: "default" | "success" | "error" }>({
    visible: false,
    msg: "",
    variant: "default",
  });

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
        setMessage(t('confirmEmail.invalidLink'));
        setLoading(false);
        return;
      }

      try {
        if (typeof confirmEmail === "function") {
          await confirmEmail({ token, uid });
        } else {
          // If backend/hook isn't wired yet, pretend the call succeeded so you can test flow
          await new Promise((r) => setTimeout(r, 500));
        }
        if (!cancelled) {
          setOk(true);
          setMessage(t('confirmEmail.success'));
        }
      } catch (e: any) {
        if (!cancelled) {
          const msg =
            e instanceof ApiError ? e.body?.message || e.message : t('confirmEmail.activationFailed');
          setOk(false);
          setMessage(msg);
          setToast({ visible: true, msg, variant: "error" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
  }, [confirmEmail, derived, t]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.container}>
        <Text variant="headlineMedium" style={s.title}>
          {t('confirmEmail.title')}
        </Text>

        <View style={s.resultBox}>
          {loading ? (
            <View style={s.centerRow}>
              <ActivityIndicator animating size="small" />
              <Text style={s.resultText}>  {message}</Text>
            </View>
          ) : (
            <Text style={[s.resultText, ok ? s.resultOk : s.resultErr]}>
              {message}
            </Text>
          )}
        </View>

        {/* Primary CTA depends on result */}
        {!loading && ok === true && (
          <Button
            mode="contained"
            onPress={() => navigation.navigate("Login")}
            style={s.button}
          >
            {t('confirmEmail.goToLogin')}
          </Button>
        )}

        {!loading && ok === false && (
          <Button
            mode="contained"
            onPress={() => navigation.navigate("ResendActivation", { email: derived.email })}
            style={s.button}
          >
            {t('confirmEmail.resendActivation')}
          </Button>
        )}

        {/* Fallback / extra actions */}
        <Button
          onPress={() => navigation.navigate("Login")}
          accessibilityRole="link"
          compact
          style={s.linkButton}
        >
          <Text style={s.linkLabel}>
            {t('confirmEmail.backToLogin')}
          </Text>
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
  linkButton: { alignSelf: "center" },
  linkLabel: { fontSize: 14, color: "#FFFFFF" },
});
