import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  Linking,
  StyleSheet,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Clipboard from "@react-native-clipboard/clipboard";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";
import { LANGS } from "../../../../i18n/locales/index";

// Reuse Reminders modal styles
import { s } from "../../../reminders/styles/reminders.styles";

type Props = {
  visible: boolean;

  // Content props you can pass from screen (or hardcode for now)
  writeEndpoint?: string; // POST add reading
  readEndpoint?: string; // GET/POST read readings
  authSecret?: string;

  onClose: () => void;

  // Optional hook to wire later
  onRotateSecret?: () => Promise<void> | void;
};

const WEB_BASE = "https://flovers.app";

function normalizeLang(lang: any) {
  if (!lang) return "en";

  const raw = String(lang).toLowerCase();
  const base = raw.split("-")[0];

  return (LANGS as readonly string[]).includes(base) ? base : "en";
}

function buildSchemasUrl(lang: any) {
  const safeLang = normalizeLang(lang);
  return `${WEB_BASE}/${safeLang}/schemas`;
}

export default function DeviceSetupModal({
  visible,
  writeEndpoint = "https://api.example.com/readings/add",
  readEndpoint = "https://api.example.com/readings",
  authSecret = "••••••••••••••",
  onClose,
  onRotateSecret,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const [showConfirmRotate, setShowConfirmRotate] = React.useState(false);
  const [revealSecret, setRevealSecret] = React.useState(false);

  const masked = React.useMemo(() => {
    const len = Math.max(10, (authSecret || "").replace(/\s/g, "").length || 12);
    return "•".repeat(len);
  }, [authSecret]);

  const openSchemas = React.useCallback(async () => {
    const url = buildSchemasUrl(currentLanguage);

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn("Failed to open schemas URL:", url, error);
    }
  }, [currentLanguage]);

  const copyToClipboard = React.useCallback((value?: string | null) => {
    if (!value) return;
    Clipboard.setString(value);
  }, []);

  React.useEffect(() => {
    if (!visible) {
      setRevealSecret(false);
      setShowConfirmRotate(false);
    }
  }, [visible]);

  if (!visible) return null;

  const sampleWritePayload = `{
  "deviceId": "YOUR_DEVICE_KEY",
  "secret":   "YOUR_AUTH_SECRET",
  "temperature": 23.5,
  "humidity": 58.0,
  "light": 512,
  "moisture": 41,
  "timestamp": "2025-01-01T12:34:56Z"
}`;

  const sampleReadQuery = `{
  "deviceId": "YOUR_DEVICE_KEY",
  "secret":   "YOUR_AUTH_SECRET",
  "from": "2025-01-01T00:00:00Z",
  "to":   "2025-01-02T00:00:00Z"
}`;

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={onClose} />

      <View style={s.promptWrap}>
        <View style={s.promptGlass}>
          <BlurView
            // @ts-ignore RN shorthand
            style={{ position: "absolute", inset: 0 }}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />

          <View
            pointerEvents="none"
            // @ts-ignore RN shorthand
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          />
        </View>

        <View style={[s.promptInner, { maxHeight: "86%" }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80, gap: 12 }}
          >
            <Text style={s.promptTitle}>
              {t("readingsModals.deviceSetup.title")}
            </Text>

            <View style={{ marginHorizontal: 16, gap: 12 }}>
              {/* Endpoints */}
              <Text style={styles.inputLabel}>
                {t("readingsModals.deviceSetup.httpEndpoints")}
              </Text>

              <InfoRow
                icon="cloud-upload-outline"
                label={t("readingsModals.deviceSetup.addReadingPost")}
                value={writeEndpoint}
              />

              <InfoRow
                icon="cloud-download-outline"
                label={t("readingsModals.deviceSetup.readReadingsGetPost")}
                value={readEndpoint}
              />

              {/* Sample payloads */}
              <Text style={[styles.inputLabel, { marginTop: 4 }]}>
                {t("readingsModals.deviceSetup.samplePayloads")}
              </Text>

              <Block label={t("readingsModals.deviceSetup.addReadingBody")}>
                <CodeBlock text={sampleWritePayload} />
              </Block>

              <Block label={t("readingsModals.deviceSetup.readRequestBody")}>
                <CodeBlock text={sampleReadQuery} />
              </Block>

              {/* Current secret + rotate */}
              <Text style={[styles.inputLabel, { marginTop: 4 }]}>
                {t("readingsModals.deviceSetup.currentAuthSecret")}
              </Text>

              <SecretRow
                value={revealSecret ? authSecret : masked}
                selectable={revealSecret}
                isRevealActive={revealSecret}
                onToggleReveal={() => setRevealSecret((v) => !v)}
                onCopy={() => copyToClipboard(authSecret)}
                revealAccessibilityLabel={
                  revealSecret
                    ? t("readingsModals.deviceSetup.hideAuthSecret")
                    : t("readingsModals.deviceSetup.showAuthSecret")
                }
                copyAccessibilityLabel={t(
                  "readingsModals.deviceSetup.copyAuthSecret",
                  "Copy Auth Secret Key"
                )}
              />

              <Pressable
                onPress={() => setShowConfirmRotate(true)}
                style={{
                  marginTop: 8,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  alignItems: "center",
                }}
              >
                <Text style={s.promptBtnText}>
                  {t("readingsModals.deviceSetup.generateNewSecret")}
                </Text>
              </Pressable>

              {/* Open website docs */}
              <Pressable
                onPress={openSchemas}
                style={{
                  marginTop: 12,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: "rgba(11,114,133,0.92)",
                  alignItems: "center",
                }}
              >
                <Text style={s.promptPrimaryText}>
                  {t("readingsModals.deviceSetup.openSchemasDocumentation")}
                </Text>
              </Pressable>

              {/* Footer buttons */}
              <View style={[s.promptButtonsRow, { marginTop: 4 }]}>
                <Pressable style={s.promptBtn} onPress={onClose}>
                  <Text style={s.promptBtnText}>
                    {t("readingsModals.common.close")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Confirm rotate secret */}
      {showConfirmRotate && (
        <>
          <Pressable
            style={s.promptBackdrop}
            onPress={() => setShowConfirmRotate(false)}
          />

          <View style={s.promptWrap}>
            <View style={s.promptGlass}>
              <BlurView
                // @ts-ignore RN shorthand
                style={{ position: "absolute", inset: 0 }}
                blurType="light"
                blurAmount={14}
                reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
              />

              <View
                pointerEvents="none"
                // @ts-ignore RN shorthand
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0,0.35)",
                }}
              />
            </View>

            <View style={s.promptInner}>
              <Text style={s.promptTitle}>
                {t("readingsModals.deviceSetup.rotateConfirmTitle")}
              </Text>

              <Text style={s.confirmText}>
                {t("readingsModals.deviceSetup.rotateConfirmText")}
              </Text>

              <View style={s.promptButtonsRow}>
                <Pressable
                  style={s.promptBtn}
                  onPress={() => setShowConfirmRotate(false)}
                >
                  <Text style={s.promptBtnText}>
                    {t("readingsModals.common.cancel")}
                  </Text>
                </Pressable>

                <Pressable
                  style={[s.promptBtn, s.promptPrimary]}
                  onPress={async () => {
                    try {
                      await onRotateSecret?.();
                    } finally {
                      setShowConfirmRotate(false);
                      setRevealSecret(false);
                    }
                  }}
                >
                  <Text style={s.promptPrimaryText}>
                    {t("readingsModals.deviceSetup.rotate")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </>
      )}
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <MaterialCommunityIcons name={icon as any} size={18} color="#fff" />
        <Text style={s.dropdownValue}>{label}</Text>
      </View>

      <View
        style={{
          padding: 12,
          borderRadius: 12,
          backgroundColor: "rgba(255,255,255,0.10)",
        }}
      >
        <Text
          style={[
            s.codeBlockText,
            {
              fontVariant: ["tabular-nums"],
              fontSize: 12,
              lineHeight: 18,
            },
          ]}
          selectable
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function SecretRow({
  value,
  selectable,
  isRevealActive,
  onToggleReveal,
  onCopy,
  revealAccessibilityLabel,
  copyAccessibilityLabel,
}: {
  value: string;
  selectable?: boolean;
  isRevealActive?: boolean;
  onToggleReveal: () => void;
  onCopy: () => void;
  revealAccessibilityLabel?: string;
  copyAccessibilityLabel?: string;
}) {
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.10)",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Text
        style={[
          s.codeBlockText,
          {
            fontVariant: ["tabular-nums"],
            flex: 1,
            minWidth: 0,
            fontSize: 10,
            lineHeight: 20,
          },
        ]}
        selectable={selectable}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>

      <Pressable
        onPress={onToggleReveal}
        accessibilityRole="button"
        accessibilityLabel={revealAccessibilityLabel}
        hitSlop={10}
        style={{ padding: 4 }}
      >
        <MaterialCommunityIcons
          name={isRevealActive ? "eye-off-outline" : "eye-outline"}
          size={20}
          color="#fff"
        />
      </Pressable>

      <Pressable
        onPress={onCopy}
        accessibilityRole="button"
        accessibilityLabel={copyAccessibilityLabel}
        hitSlop={10}
        style={{ padding: 4 }}
      >
        <MaterialCommunityIcons name="content-copy" size={20} color="#fff" />
      </Pressable>
    </View>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.dropdownValue}>{label}</Text>
      {children}
    </View>
  );
}

function CodeBlock({ text }: { text: string }) {
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 12,
        backgroundColor: "rgba(0,0,0,0.35)",
      }}
    >
      <Text
        style={[
          s.codeBlockText,
          {
            fontFamily: Platform.select({
              ios: "Menlo",
              android: "monospace",
            }) as any,
            fontSize: 10,
            lineHeight: 15,
          },
        ]}
        selectable
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inputLabel: {
    marginTop: 8,
    marginBottom: 6,
    color: "rgba(255,255,255,0.92)",
    fontWeight: "800",
    letterSpacing: 0.2,
    fontSize: 12,
  },
});