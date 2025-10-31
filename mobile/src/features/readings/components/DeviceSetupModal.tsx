import React from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// Reuse Reminders modal styles
import { s } from "../../reminders/styles/reminders.styles";

type Props = {
  visible: boolean;

  // Content props you can pass from screen (or hardcode for now)
  writeEndpoint?: string; // POST add reading
  readEndpoint?: string;  // GET/POST read readings
  authSecret?: string;

  onClose: () => void;

  // Optional hooks to wire later
  onRotateSecret?: () => Promise<void> | void;
  onDownloadPdf?: () => void;
};

export default function DeviceSetupModal({
  visible,
  writeEndpoint = "https://api.example.com/readings/add",
  readEndpoint = "https://api.example.com/readings",
  authSecret = "••••••••••••••",
  onClose,
  onRotateSecret,
  onDownloadPdf,
}: Props) {
  const [showConfirmRotate, setShowConfirmRotate] = React.useState(false);
  const [revealSecret, setRevealSecret] = React.useState(false);

  // ✅ Move the hook ABOVE the conditional return
  const masked = React.useMemo(() => {
    const len = Math.max(10, (authSecret || "").replace(/\s/g, "").length || 12);
    return "•".repeat(len);
  }, [authSecret]);

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
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
          />
        </View>

        <View style={s.promptInner}>
          <Text style={s.promptTitle}>Device setup</Text>

          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 8, gap: 12 }}>
            {/* Endpoints */}
            <Text style={s.inputLabel}>HTTP endpoints</Text>

            <InfoRow icon="cloud-upload-outline" label="Add reading (POST)" value={writeEndpoint} />
            <InfoRow icon="cloud-download-outline" label="Read readings (GET/POST)" value={readEndpoint} />

            {/* Sample payloads */}
            <Text style={s.inputLabel}>Sample payloads</Text>

            <Block label="Add reading body">
              <CodeBlock text={sampleWritePayload} />
            </Block>

            <Block label="Read request body">
              <CodeBlock text={sampleReadQuery} />
            </Block>

            {/* Current secret + rotate */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={s.inputLabel}>Current auth secret</Text>
              <Pressable
                onPress={() => setRevealSecret((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={revealSecret ? "Hide auth secret" : "Show auth secret"}
                hitSlop={10}
                style={{ padding: 4 }}
              >
                <MaterialCommunityIcons
                  name={revealSecret ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#fff"
                />
              </Pressable>
            </View>

            <View
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.10)",
                position: "relative",
              }}
            >
              <Text
                style={[s.dropdownValue, { fontVariant: ["tabular-nums"] }]}
                selectable={revealSecret}
              >
                {revealSecret ? authSecret : masked}
              </Text>
            </View>

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
              <Text style={s.promptBtnText}>Generate new secret</Text>
            </Pressable>

            {/* Download PDF doc */}
            <Pressable
              onPress={onDownloadPdf}
              style={{
                marginTop: 12,
                paddingVertical: 12,
                borderRadius: 16,
                backgroundColor: "rgba(11,114,133,0.92)",
                alignItems: "center",
              }}
            >
              <Text style={s.promptPrimaryText}>Download PDF documentation</Text>
            </Pressable>
          </ScrollView>

          <View style={s.promptButtonsRow}>
            <Pressable style={s.promptBtn} onPress={onClose}>
              <Text style={s.promptBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Confirm rotate secret (inline lightweight modal) */}
      {showConfirmRotate && (
        <>
          <Pressable style={s.promptBackdrop} onPress={() => setShowConfirmRotate(false)} />
          <View style={s.promptWrap}>
            <View style={s.promptGlass}>
              <BlurView
                // @ts-ignore
                style={{ position: "absolute", inset: 0 }}
                blurType="light"
                blurAmount={14}
                reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
              />
              <View
                pointerEvents="none"
                // @ts-ignore
                style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
              />
            </View>

            <View style={s.promptInner}>
              <Text style={s.promptTitle}>Rotate secret?</Text>
              <Text style={s.confirmText}>
                Generating a new secret will invalidate the current one. Update your device configuration afterwards.
              </Text>

              <View style={s.promptButtonsRow}>
                <Pressable style={s.promptBtn} onPress={() => setShowConfirmRotate(false)}>
                  <Text style={s.promptBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[s.promptBtn, s.promptPrimary]}
                  onPress={async () => {
                    try {
                      await onRotateSecret?.();
                    } finally {
                      setShowConfirmRotate(false);
                      setRevealSecret(false); // hide again after rotate
                    }
                  }}
                >
                  <Text style={s.promptPrimaryText}>Rotate</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </>
      )}
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <MaterialCommunityIcons name={icon as any} size={18} color="#fff" />
        <Text style={s.dropdownValue}>{label}</Text>
      </View>
      <View style={{ padding: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.10)" }}>
        <Text style={[s.dropdownValue, { fontVariant: ["tabular-nums"] }]} selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.dropdownValue}>{label}</Text>
      {children}
    </View>
  );
}

function CodeBlock({ text }: { text: string }) {
  return (
    <View style={{ padding: 12, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.35)" }}>
      <Text
        style={[
          s.dropdownItemText,
          { fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }) as any },
        ]}
        selectable
      >
        {text}
      </Text>
    </View>
  );
}
