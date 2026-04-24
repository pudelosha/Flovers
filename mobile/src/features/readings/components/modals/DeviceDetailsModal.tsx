import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
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

  if (sensors?.temperature) list.push(t("readingsModals.deviceDetails.sensorTemperature", "Air temperature"));
  if (sensors?.humidity) list.push(t("readingsModals.deviceDetails.sensorHumidity", "Air humidity"));
  if (sensors?.light) list.push(t("readingsModals.deviceDetails.sensorLight", "Light"));
  if (sensors?.moisture) list.push(t("readingsModals.deviceDetails.sensorMoisture", "Soil moisture"));

  return list;
}

export default function DeviceDetailsModal({
  visible,
  loading = false,
  sending = false,
  accountSecret = "••••••••••••••",
  deviceId,
  deviceKey,
  deviceName,
  plantName,
  location,
  sensors,
  pumpIncluded,
  onClose,
  onEmailCode,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = React.useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const enabledSensors = React.useMemo(() => sensorLabels(sensors, tr), [sensors, tr]);

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
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" }}
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
                "This modal shows device setup information, generated identifiers, enabled sensors, and whether a water pump is linked with this device."
              )}
            </Text>

            {loading ? (
              <View
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.10)",
                }}
              >
                <Text style={s.dropdownValue}>
                  {tr("readingsModals.deviceDetails.loading", "Loading device details...")}
                </Text>
              </View>
            ) : (
              <>
                <InfoRow
                  icon="shield-key-outline"
                  label={tr("readingsModals.deviceDetails.accountSecret", "Account secret")}
                  value={accountSecret || "—"}
                  helper={tr(
                    "readingsModals.deviceDetails.accountSecretHelp",
                    "This can be changed from FAB → Device setup."
                  )}
                />

                <InfoRow
                  icon="identifier"
                  label={tr("readingsModals.deviceDetails.deviceId", "Device ID")}
                  value={deviceId != null ? String(deviceId) : "—"}
                />

                <InfoRow
                  icon="key-outline"
                  label={tr("readingsModals.deviceDetails.deviceKey", "Device key")}
                  value={deviceKey || "—"}
                />

                <InfoRow
                  icon="access-point"
                  label={tr("readingsModals.deviceDetails.deviceName", "Device name")}
                  value={deviceName || "—"}
                />

                <InfoRow
                  icon="sprout-outline"
                  label={tr("readingsModals.deviceDetails.plant", "Plant")}
                  value={plantName || "—"}
                />

                <InfoRow
                  icon="map-marker-outline"
                  label={tr("readingsModals.deviceDetails.location", "Location")}
                  value={location || "—"}
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
                          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
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
                        {tr("readingsModals.deviceDetails.noSensors", "No sensors enabled")}
                      </Text>
                    )}
                  </View>
                </Block>

                <InfoRow
                  icon="water-pump"
                  label={tr("readingsModals.deviceDetails.pumpLinked", "Water pump linked")}
                  value={
                    pumpIncluded
                      ? tr("readingsModals.deviceDetails.yes", "Yes")
                      : tr("readingsModals.deviceDetails.no", "No")
                  }
                />

                <Pressable
                  onPress={onEmailCode}
                  disabled={sending || loading || !deviceId}
                  style={{
                    marginTop: 12,
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: "rgba(11,114,133,0.92)",
                    alignItems: "center",
                    opacity: sending || loading || !deviceId ? 0.7 : 1,
                  }}
                >
                  <Text style={s.promptPrimaryText}>
                    {sending
                      ? tr("readingsModals.deviceDetails.emailingCode", "Sending...")
                      : tr("readingsModals.deviceDetails.emailCode", "Email code")}
                  </Text>
                </Pressable>
              </>
            )}

            <View style={s.promptButtonsRow}>
              <Pressable style={s.promptBtn} onPress={onClose}>
                <Text style={s.promptBtnText}>
                  {tr("readingsModals.common.close", "Close")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
  helper,
}: {
  icon: string;
  label: string;
  value: string;
  helper?: string;
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
        <Text style={[s.codeBlockText, { fontVariant: ["tabular-nums"] }]} selectable>
          {value}
        </Text>

        {!!helper && (
          <Text style={[s.confirmText, { marginTop: 8 }]}>
            {helper}
          </Text>
        )}
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