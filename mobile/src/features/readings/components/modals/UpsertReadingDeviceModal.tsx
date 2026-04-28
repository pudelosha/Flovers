import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Switch,
  StyleSheet,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Clipboard from "@react-native-clipboard/clipboard";
import { useTranslation } from "react-i18next";

// Match the Edit Plant modal styling:
import { s as sp } from "../../../plants/styles/plants.styles"; // dropdown / inputs styles
import { prompts as pr } from "../../../profile/styles/profile.styles"; // prompt chrome (backdrop/sheet/buttons)

type Mode = "add" | "edit";
type PlantOption = { id: string; name: string; location?: string | null };

type Props = {
  visible: boolean;
  mode: Mode;

  plants?: PlantOption[];

  // initial values (optional)
  initialPlantId?: string | null;
  initialName?: string;
  initialNotes?: string;

  // edit-only
  initialEnabled?: boolean;

  // sensor toggles
  initialSensors?: {
    temperature?: boolean;
    humidity?: boolean;
    light?: boolean;
    moisture?: boolean;
  };

  // soil moisture alert
  initialMoistureAlertEnabled?: boolean;
  initialMoistureAlertPct?: number;

  // legacy back-compat (ignored if the above provided)
  initialHumidityAlertPct?: number;

  // sampling interval 1..24h
  initialIntervalHours?: number;

  // notifications / pump initial values
  initialSendEmailNotifications?: boolean;
  initialSendPushNotifications?: boolean;
  initialPumpIncluded?: boolean;
  initialAutomaticPumpLaunch?: boolean;
  initialPumpThresholdPct?: number;

  // watering completed notifications
  initialSendEmailWateringNotifications?: boolean;
  initialSendPushWateringNotifications?: boolean;

  // read-only (edit only)
  deviceKey?: string;
  authSecret?: string;

  // callbacks
  onCancel: () => void;
  onSave: (payload: {
    mode: Mode;
    plantId: string;
    name: string;
    notes?: string;
    enabled?: boolean;
    sensors: {
      temperature: boolean;
      humidity: boolean;
      light: boolean;
      moisture: boolean;
      moistureAlertEnabled?: boolean;
      moistureAlertPct?: number;
    };
    intervalHours: number;
    sendEmailNotifications?: boolean;
    sendPushNotifications?: boolean;
    pumpIncluded?: boolean;
    automaticPumpLaunch?: boolean;
    pumpThresholdPct?: number;
    sendEmailWateringNotifications?: boolean;
    sendPushWateringNotifications?: boolean;
  }) => void;

  // edit-only convenience actions
  onSendCodeByEmail?: () => void;
  onSaveCodeAsText?: () => void;
};

let Slider: any = null;
try {
  Slider = require("@react-native-community/slider").default;
} catch {}

export default function UpsertReadingDeviceModal({
  visible,
  mode,
  plants = [],
  initialPlantId,
  initialName,
  initialNotes,
  initialEnabled = true,
  initialSensors,
  initialMoistureAlertEnabled,
  initialMoistureAlertPct,
  initialHumidityAlertPct, // legacy
  initialIntervalHours = 1,
  initialSendEmailNotifications = false,
  initialSendPushNotifications = false,
  initialPumpIncluded = false,
  initialAutomaticPumpLaunch = false,
  initialPumpThresholdPct = 30,
  initialSendEmailWateringNotifications = false,
  initialSendPushWateringNotifications = false,
  deviceKey,
  authSecret,
  onCancel,
  onSave,
  onSendCodeByEmail,
  onSaveCodeAsText,
}: Props) {
  const { t } = useTranslation();

  // ---- hooks (always run) ----
  const [plantOpen, setPlantOpen] = React.useState(false);

  const defaultMoistPct =
    typeof initialMoistureAlertPct === "number"
      ? initialMoistureAlertPct
      : typeof initialHumidityAlertPct === "number"
      ? initialHumidityAlertPct
      : 30;

  // Local state (will be reset by sync effect below when props/visibility change)
  const [plantId, setPlantId] = React.useState<string>(
    mode === "edit" && initialPlantId ? initialPlantId : ""
  );
  const [name, setName] = React.useState<string>(initialName ?? "");
  const [notes, setNotes] = React.useState<string>(initialNotes ?? "");
  const [enabled, setEnabled] = React.useState<boolean>(initialEnabled);

  const [sensorTemp, setSensorTemp] = React.useState<boolean>(
    initialSensors?.temperature ?? true
  );
  const [sensorHum, setSensorHum] = React.useState<boolean>(
    initialSensors?.humidity ?? true
  );
  const [sensorLight, setSensorLight] = React.useState<boolean>(
    initialSensors?.light ?? true
  );
  const [sensorMoist, setSensorMoist] = React.useState<boolean>(
    initialSensors?.moisture ?? true
  );

  const [moistAlertEnabled, setMoistAlertEnabled] = React.useState<boolean>(
    Boolean(initialMoistureAlertEnabled)
  );
  const [moistAlertPct, setMoistAlertPct] = React.useState<number>(
    Math.max(0, Math.min(100, defaultMoistPct))
  );

  const [intervalHours, setIntervalHours] = React.useState<number>(
    Math.max(initialIntervalHours, 1)
  );

  // Additional state for notifications and pump control
  const [sendEmailNotifications, setSendEmailNotifications] =
    React.useState<boolean>(initialSendEmailNotifications);
  const [sendPushNotifications, setSendPushNotifications] =
    React.useState<boolean>(initialSendPushNotifications);
  const [pumpIncluded, setPumpIncluded] =
    React.useState<boolean>(initialPumpIncluded);
  const [automaticPumpLaunch, setAutomaticPumpLaunch] =
    React.useState<boolean>(initialAutomaticPumpLaunch);
  const [pumpThresholdPct, setPumpThresholdPct] = React.useState<number>(
    Math.max(0, Math.min(100, initialPumpThresholdPct))
  );

  const [
    sendEmailWateringNotifications,
    setSendEmailWateringNotifications,
  ] = React.useState<boolean>(initialSendEmailWateringNotifications);
  const [
    sendPushWateringNotifications,
    setSendPushWateringNotifications,
  ] = React.useState<boolean>(initialSendPushWateringNotifications);

  // show/hide secret
  const [showSecret, setShowSecret] = React.useState(false);

  // Close dropdown when modal opens
  React.useEffect(() => {
    if (visible) setPlantOpen(false);
  }, [visible]);

  // Reset local state whenever modal opens / source props change
  React.useEffect(() => {
    if (!visible) return;

    const nextDefaultMoistPct =
      typeof initialMoistureAlertPct === "number"
        ? initialMoistureAlertPct
        : typeof initialHumidityAlertPct === "number"
        ? initialHumidityAlertPct
        : 30;

    setPlantOpen(false);
    setPlantId(mode === "edit" && initialPlantId ? initialPlantId : "");
    setName(initialName ?? "");
    setNotes(initialNotes ?? "");
    setEnabled(initialEnabled);

    setSensorTemp(initialSensors?.temperature ?? true);
    setSensorHum(initialSensors?.humidity ?? true);
    setSensorLight(initialSensors?.light ?? true);
    setSensorMoist(initialSensors?.moisture ?? true);

    setMoistAlertEnabled(Boolean(initialMoistureAlertEnabled));
    setMoistAlertPct(Math.max(0, Math.min(100, nextDefaultMoistPct)));

    setIntervalHours(Math.max(initialIntervalHours, 1));

    setSendEmailNotifications(Boolean(initialSendEmailNotifications));
    setSendPushNotifications(Boolean(initialSendPushNotifications));
    setPumpIncluded(Boolean(initialPumpIncluded));
    setAutomaticPumpLaunch(Boolean(initialAutomaticPumpLaunch));
    setPumpThresholdPct(Math.max(0, Math.min(100, initialPumpThresholdPct)));

    setSendEmailWateringNotifications(
      Boolean(initialSendEmailWateringNotifications)
    );
    setSendPushWateringNotifications(
      Boolean(initialSendPushWateringNotifications)
    );

    setShowSecret(false);
  }, [
    visible,
    mode,
    initialPlantId,
    initialName,
    initialNotes,
    initialEnabled,
    initialSensors,
    initialMoistureAlertEnabled,
    initialMoistureAlertPct,
    initialHumidityAlertPct,
    initialIntervalHours,
    initialSendEmailNotifications,
    initialSendPushNotifications,
    initialPumpIncluded,
    initialAutomaticPumpLaunch,
    initialPumpThresholdPct,
    initialSendEmailWateringNotifications,
    initialSendPushWateringNotifications,
  ]);

  const selectedPlant = React.useMemo(
    () => plants.find((p) => p.id === plantId),
    [plantId, plants]
  );

  // When user picks a plant and the device name is still empty, auto-fill "Plant – Location"
  const buildNameFromPlant = (p: PlantOption) => {
    const loc = p.location ? ` – ${p.location}` : "";
    return `${p.name}${loc}`;
  };

  const copyToClipboard = React.useCallback((value?: string | null) => {
    if (!value) return;
    Clipboard.setString(value);
  }, []);

  // Required: both plantId and non-empty device name
  const canSave = Boolean(plantId) && Boolean((name || "").trim());

  const handleSave = () => {
    if (!canSave) return;

    const shouldEnableMoistureAlert =
      sensorMoist &&
      (sendEmailNotifications || sendPushNotifications || moistAlertEnabled);

    const shouldUseAutomaticPumpLaunch = pumpIncluded && automaticPumpLaunch;

    onSave({
      mode,
      plantId,
      name: name.trim(),
      notes,
      enabled: mode === "edit" ? enabled : undefined,
      sensors: {
        temperature: sensorTemp,
        humidity: sensorHum,
        light: sensorLight,
        moisture: sensorMoist,

        // Keep child UI state in React state, but only apply/save it when the parent capability is available.
        moistureAlertEnabled: sensorMoist ? shouldEnableMoistureAlert : false,
        moistureAlertPct:
          sensorMoist && shouldEnableMoistureAlert ? moistAlertPct : undefined,
      },
      intervalHours,

      // Soil moisture notifications are only applied when Soil Moisture sensor is enabled.
      // Their checkbox state is preserved locally even while locked.
      sendEmailNotifications: sensorMoist ? sendEmailNotifications : false,
      sendPushNotifications: sensorMoist ? sendPushNotifications : false,

      pumpIncluded,

      // Auto pump launch is only applied when Include Water Pump is enabled.
      // Its checkbox state is preserved locally even while locked.
      automaticPumpLaunch: shouldUseAutomaticPumpLaunch,
      pumpThresholdPct: shouldUseAutomaticPumpLaunch
        ? pumpThresholdPct
        : undefined,

      // Watering-complete notifications are only applied when Include Water Pump is enabled.
      // Their checkbox state is preserved locally even while locked.
      sendEmailWateringNotifications: pumpIncluded
        ? sendEmailWateringNotifications
        : false,
      sendPushWateringNotifications: pumpIncluded
        ? sendPushWateringNotifications
        : false,
    });
  };

  // ---- UI ----
  if (!visible) return null;

  const title =
    mode === "add"
      ? t("readingsModals.upsert.linkDeviceTitle")
      : t("readingsModals.upsert.editDeviceTitle");

  return (
    <>
      <Pressable style={pr.backdrop} onPress={onCancel} />
      <View style={pr.promptWrap}>
        <View style={pr.promptGlass}>
          <BlurView
            style={{ position: "absolute", inset: 0 } as any}
            blurType="light"
            blurAmount={14}
            reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            } as any}
          />
        </View>

        <View style={[pr.promptInner, { maxHeight: "86%" }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
          >
            <Text style={pr.promptTitle}>{title}</Text>

            {/* 1) Plant dropdown */}
            <View style={sp.dropdown}>
              <Pressable
                style={sp.dropdownHeader}
                onPress={() => setPlantOpen((o) => !o)}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <Text style={sp.dropdownValue}>
                  {selectedPlant
                    ? selectedPlant.name
                    : t("readingsModals.upsert.selectPlant")}
                </Text>
                <MaterialCommunityIcons
                  name={plantOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#FFFFFF"
                />
              </Pressable>
              {plantOpen && (
                <View style={sp.dropdownList}>
                  {plants.map((p) => (
                    <Pressable
                      key={p.id}
                      style={sp.dropdownItem}
                      onPress={() => {
                        setPlantId(p.id);
                        setPlantOpen(false);
                        if (!(name || "").trim()) setName(buildNameFromPlant(p)); // auto-fill only if empty
                      }}
                    >
                      <Text style={sp.dropdownItemText}>{p.name}</Text>
                      {plantId === p.id && (
                        <MaterialCommunityIcons
                          name="check"
                          size={18}
                          color="#FFFFFF"
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* 2) Location (read-only) */}
            <TextInput
              style={pr.input}
              value={selectedPlant?.location ?? ""}
              placeholder={t("readingsModals.upsert.locationPlaceholder")}
              placeholderTextColor="rgba(255,255,255,0.7)"
              editable={false}
              pointerEvents="none"
            />

            {/* 3) Device name (mandatory) */}
            <TextInput
              style={pr.input}
              placeholder={t("readingsModals.upsert.deviceNameRequired")}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={name}
              onChangeText={setName}
            />

            {/* Move notes up and place it beneath Device Name */}
            <TextInput
              style={[
                pr.input,
                { height: 120, textAlignVertical: "top", paddingTop: 10 },
              ]}
              placeholder={t("readingsModals.upsert.notesOptional")}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            {/* Sensors Section */}
            <View style={styles.separatorLine} />
            <Text style={styles.sectionHeader}>
              {t("readingsModals.upsert.sensors")}
            </Text>
            <View style={{ gap: 10, marginHorizontal: 16, marginTop: 6 }}>
              <RowSwitch
                label={t("readingsModals.upsert.sensorTemperature")}
                value={sensorTemp}
                onValueChange={setSensorTemp}
                weight="600"
              />
              <RowSwitch
                label={t("readingsModals.upsert.sensorHumidity")}
                value={sensorHum}
                onValueChange={setSensorHum}
                weight="600"
              />
              <RowSwitch
                label={t("readingsModals.upsert.sensorLight")}
                value={sensorLight}
                onValueChange={setSensorLight}
                weight="600"
              />
              <RowSwitch
                label={t("readingsModals.upsert.sensorSoilMoisture")}
                value={sensorMoist}
                onValueChange={setSensorMoist}
                weight="600"
              />
            </View>

            {/* Water Pump Section */}
            <View style={styles.separatorLine} />
            <Text style={styles.sectionHeader}>
              {t("readingsModals.upsert.waterPump")}
            </Text>
            <View style={{ marginHorizontal: 16 }}>
              <RowSwitch
                label={t("readingsModals.upsert.pumpIncluded")}
                value={pumpIncluded}
                onValueChange={setPumpIncluded}
                weight="600"
              />

              <CheckRow
                label={t("readingsModals.upsert.automaticPumpLaunch")}
                checked={automaticPumpLaunch}
                disabled={!pumpIncluded}
                onToggle={() => setAutomaticPumpLaunch((v) => !v)}
              />

              {Slider ? (
                <View
                  style={[
                    {
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginLeft: 16,
                      marginRight: 16,
                    },
                    !pumpIncluded || !automaticPumpLaunch
                      ? { opacity: 0.45 }
                      : null,
                  ]}
                >
                  <Slider
                    minimumValue={0}
                    maximumValue={100}
                    step={1}
                    value={pumpThresholdPct}
                    disabled={!pumpIncluded || !automaticPumpLaunch}
                    onValueChange={(v: number) =>
                      setPumpThresholdPct(
                        Math.max(0, Math.min(100, Math.round(v)))
                      )
                    }
                    style={{ flex: 1 }}
                  />
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "600",
                      marginLeft: 8,
                    }}
                  >
                    {pumpThresholdPct}%
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Notifications Section */}
            <View style={styles.separatorLine} />
            <Text style={styles.sectionHeader}>
              {t("readingsModals.upsert.notifications")}
            </Text>

            <Text style={styles.sectionInfoText}>
              {t(
                "readingsModals.upsert.notificationsSoilMoistureInfo",
                "Soil moisture alerts are available only when the Soil Moisture sensor is enabled."
              )}
            </Text>

            <View
              style={{ marginHorizontal: 16, marginTop: 10, marginBottom: 10 }}
            >
              <CheckRow
                label={t("readingsModals.upsert.sendEmailNotifications")}
                checked={sendEmailNotifications}
                disabled={!sensorMoist}
                onToggle={() => setSendEmailNotifications((v) => !v)}
              />

              <CheckRow
                label={t("readingsModals.upsert.sendPushNotifications")}
                checked={sendPushNotifications}
                disabled={!sensorMoist}
                onToggle={() => setSendPushNotifications((v) => !v)}
              />

              {Slider ? (
                <View
                  style={[
                    {
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginLeft: 16,
                      marginRight: 16,
                      marginTop: 5,
                    },
                    !sensorMoist ? { opacity: 0.45 } : null,
                  ]}
                >
                  <Slider
                    minimumValue={0}
                    maximumValue={100}
                    step={1}
                    value={moistAlertPct}
                    disabled={!sensorMoist}
                    onValueChange={(v: number) => {
                      setMoistAlertEnabled(true);
                      setMoistAlertPct(
                        Math.max(0, Math.min(100, Math.round(v)))
                      );
                    }}
                    style={{ flex: 1 }}
                  />
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "600",
                      marginLeft: 8,
                    }}
                  >
                    {moistAlertPct}%
                  </Text>
                </View>
              ) : null}

              <Text style={styles.sectionInfoTextNoMargin}>
                {t(
                  "readingsModals.upsert.wateringNotificationsInfo",
                  "Watering completion notifications are available only when this device has an included water pump. They can be sent after scheduled watering completes or after automatic watering is triggered and completed."
                )}
              </Text>

              <CheckRow
                label={t(
                  "readingsModals.upsert.sendEmailWateringNotifications",
                  "Send email notification when watering is complete"
                )}
                checked={sendEmailWateringNotifications}
                disabled={!pumpIncluded}
                onToggle={() =>
                  setSendEmailWateringNotifications((v) => !v)
                }
              />

              <CheckRow
                label={t(
                  "readingsModals.upsert.sendPushWateringNotifications",
                  "Send push notification when watering is complete"
                )}
                checked={sendPushWateringNotifications}
                disabled={!pumpIncluded}
                onToggle={() =>
                  setSendPushWateringNotifications((v) => !v)
                }
              />
            </View>

            {/* Footer */}
            <View style={{ paddingVertical: 16 }}>
              <View style={pr.promptButtonsRow}>
                <Pressable style={pr.promptBtn} onPress={onCancel}>
                  <Text style={pr.promptBtnText}>
                    {t("readingsModals.common.cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    pr.promptBtn,
                    pr.promptPrimary,
                    !canSave ? { opacity: 0.5 } : null,
                  ]}
                  disabled={!canSave}
                  onPress={handleSave}
                >
                  <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                    {t("readingsModals.common.save")}
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

// Helper components
function RowSwitch({
  label,
  value,
  onValueChange,
  weight = "600",
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  weight?: "600" | "700";
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
      }}
    >
      <Text style={[sp.dropdownItemText, { fontWeight: weight as any }]}>
        {label}
      </Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onToggle}
      disabled={disabled}
      style={{
        width: "100%",
        flexDirection: "row",
        alignItems: "flex-start",
        paddingRight: 8,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 10,
          marginTop: 1,
          flexShrink: 0,
        }}
      >
        {checked ? (
          <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
        ) : null}
      </View>

      <Text
        style={[
          sp.dropdownItemText,
          {
            flex: 1,
            flexShrink: 1,
            minWidth: 0,
            fontWeight: "600",
            fontSize: 12,
            opacity: 0.9,
            lineHeight: 18,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Separator line - white for testing, matches the visual style
  separatorLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#FFFFFF", // White for testing purposes
    marginVertical: 12,
    marginHorizontal: 16,
  },

  // Section headers: identical font style to pr.promptTitle
  sectionHeader: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 18,
    marginLeft: 16,
    marginBottom: 8,
    letterSpacing: 0.1,
  },

  sectionInfoText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.8,
    lineHeight: 18,
    marginHorizontal: 16,
    marginBottom: 2,
  },

  sectionInfoTextNoMargin: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.8,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 8,
  },
});