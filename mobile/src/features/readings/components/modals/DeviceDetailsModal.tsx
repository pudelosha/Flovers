import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Clipboard from "@react-native-clipboard/clipboard";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

// Reuse Reminders modal styles
import { s } from "../../../reminders/styles/reminders.styles";

type SensorsShape = {
  temperature?: boolean;
  humidity?: boolean;
  light?: boolean;
  moisture?: boolean;
};

type Props = {
  visible: boolean;
  loading?: boolean;
  sending?: boolean;

  accountSecret?: string;
  deviceId?: string | number | null;
  deviceKey?: string | null;
  deviceName?: string | null;
  plantName?: string | null;
  location?: string | null;
  sensors?: SensorsShape | null;
  pumpIncluded?: boolean;

  onClose: () => void;
  onEmailCode?: () => Promise<void> | void;
};

function sensorLabels(
  sensors: SensorsShape | null | undefined,
  t: (key: string, fallback?: string) => string
) {
  const list: string[] = [];

  if (sensors?.temperature) {
    list.push(t("readingsModals.deviceDetails.sensorTemperature", "Air temperature"));
  }

  if (sensors?.humidity) {
    list.push(t("readingsModals.deviceDetails.sensorHumidity", "Air humidity"));
  }

  if (sensors?.light) {
    list.push(t("readingsModals.deviceDetails.sensorLight", "Light"));
  }

  if (sensors?.moisture) {
    list.push(t("readingsModals.deviceDetails.sensorMoisture", "Soil moisture"));
  }

  return list;
}

export default function DeviceDetailsModal({
  visible,
  loading = false,
  sending = false,
  accountSecret = "••••••••••••••",
  deviceKey,
  deviceName,
  plantName,
  sensors,
  pumpIncluded,
  onClose,
  onEmailCode,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const [revealSecret, setRevealSecret] = React.useState(false);

  const tr = React.useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const enabledSensors = React.useMemo(
    () => sensorLabels(sensors, tr),
    [sensors, tr]
  );

  const maskedSecret = React.useMemo(() => {
    const len = Math.max(10, (accountSecret || "").replace(/\s/g, "").length || 12);
    return "•".repeat(len);
  }, [accountSecret]);

  const copyToClipboard = React.useCallback((value?: string | null) => {
    if (!value) return;
    Clipboard.setString(value);
  }, []);

  React.useEffect(() => {
    if (!visible) {
      setRevealSecret(false);
    }
  }, [visible]);

  if (!visible) return null;

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
              {tr("readingsModals.deviceDetails.title", "Device details")}
            </Text>

            <Text style={s.confirmText}>
              {tr(
                "readingsModals.deviceDetails.description",
                "This modal shows device setup information, generated identifiers, enabled sensors, whether a water pump is linked with this device, and the account secret used by the device. You can also send an email with sample Arduino code that matches the selected device settings, including sensors and water pump configuration. The generated code is populated with this device’s dedicated Device Key and Auth Secret Key. The Auth Secret Key can be reset later from FAB → Device setup."
              )}
            </Text>

            <View style={{ marginHorizontal: 16, gap: 12 }}>
              {loading ? (
                <View
                  style={{
                    minHeight: 420,
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.10)",
                    justifyContent: "center",
                  }}
                >
                  <Text style={s.dropdownValue}>
                    {tr("readingsModals.deviceDetails.loading", "Loading device details...")}
                  </Text>
                </View>
              ) : (
                <>
                  <InfoRow
                    label={tr("readingsModals.deviceDetails.deviceName", "Device name")}
                    value={deviceName || "—"}
                  />

                  <InfoRow
                    label={tr("readingsModals.deviceDetails.deviceKey", "Device key")}
                    value={deviceKey || "—"}
                    onCopy={deviceKey ? () => copyToClipboard(deviceKey) : undefined}
                    copyAccessibilityLabel={tr(
                      "readingsModals.deviceDetails.copyDeviceKey",
                      "Copy device key"
                    )}
                  />

                  <InfoRow
                    label={tr(
                      "readingsModals.deviceDetails.accountSecret",
                      "Auth Secret Key"
                    )}
                    value={revealSecret ? accountSecret || "—" : maskedSecret}
                    smallValueText
                    onCopy={accountSecret ? () => copyToClipboard(accountSecret) : undefined}
                    copyAccessibilityLabel={tr(
                      "readingsModals.deviceDetails.copyAuthSecret",
                      "Copy Auth Secret Key"
                    )}
                    onToggleReveal={() => setRevealSecret((v) => !v)}
                    revealAccessibilityLabel={
                      revealSecret
                        ? tr(
                            "readingsModals.deviceDetails.hideAuthSecret",
                            "Hide Auth Secret Key"
                          )
                        : tr(
                            "readingsModals.deviceDetails.showAuthSecret",
                            "Show Auth Secret Key"
                          )
                    }
                    isRevealActive={revealSecret}
                  />

                  <InfoRow
                    label={tr("readingsModals.deviceDetails.plant", "Plant")}
                    value={plantName || "—"}
                  />

                  <Block label={tr("readingsModals.deviceDetails.sensors", "Sensors")}>
                    <View
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: "rgba(255,255,255,0.10)",
                        gap: 8,
                      }}
                    >
                      {enabledSensors.length > 0 ? (
                        enabledSensors.map((item) => (
                          <View
                            key={item}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <MaterialCommunityIcons
                              name="check-circle-outline"
                              size={18}
                              color="#fff"
                            />
                            <Text style={s.dropdownValue}>{item}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={s.dropdownValue}>
                          {tr(
                            "readingsModals.deviceDetails.noSensors",
                            "No sensors enabled"
                          )}
                        </Text>
                      )}
                    </View>
                  </Block>

                  <InfoRow
                    label={tr(
                      "readingsModals.deviceDetails.pumpLinked",
                      "Water pump linked"
                    )}
                    value={
                      pumpIncluded
                        ? tr("readingsModals.deviceDetails.yes", "Yes")
                        : tr("readingsModals.deviceDetails.no", "No")
                    }
                  />

                  <Pressable
                    onPress={onEmailCode}
                    disabled={sending || loading || !deviceKey}
                    style={{
                      marginTop: 12,
                      paddingVertical: 12,
                      borderRadius: 16,
                      backgroundColor: "rgba(11,114,133,0.92)",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 8,
                      opacity: sending || loading || !deviceKey ? 0.7 : 1,
                    }}
                  >
                    <MaterialCommunityIcons name="email-outline" size={18} color="#fff" />
                    <Text style={s.promptPrimaryText}>
                      {sending
                        ? tr("readingsModals.deviceDetails.emailingCode", "Sending...")
                        : tr("readingsModals.deviceDetails.emailCode", "Email code")}
                    </Text>
                  </Pressable>
                </>
              )}

              <View style={[s.promptButtonsRow, { marginTop: 4 }]}>
                <Pressable style={s.promptBtn} onPress={onClose}>
                  <Text style={s.promptBtnText}>
                    {tr("readingsModals.common.close", "Close")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </>
  );
}

function InfoRow({
  label,
  value,
  onCopy,
  copyAccessibilityLabel,
  onToggleReveal,
  revealAccessibilityLabel,
  isRevealActive,
  smallValueText = false,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copyAccessibilityLabel?: string;
  onToggleReveal?: () => void;
  revealAccessibilityLabel?: string;
  isRevealActive?: boolean;
  smallValueText?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.dropdownValue}>{label}</Text>

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
              fontSize: smallValueText ? 10 : undefined,
              lineHeight: smallValueText ? 20 : undefined,
            },
          ]}
          selectable
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value}
        </Text>

        {!!onToggleReveal && (
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
        )}

        {!!onCopy && (
          <Pressable
            onPress={onCopy}
            accessibilityRole="button"
            accessibilityLabel={copyAccessibilityLabel}
            hitSlop={10}
            style={{ padding: 4 }}
          >
            <MaterialCommunityIcons name="content-copy" size={20} color="#fff" />
          </Pressable>
        )}
      </View>
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