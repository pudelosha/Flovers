import React from "react";
import { View, Text, Pressable, TextInput, ScrollView, Switch } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";

// Match the Edit Plant modal styling:
import { s as sp } from "../../../plants/styles/plants.styles";        // dropdown / inputs styles
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
      moistureAlertPct?: number; // 0..100 when enabled
    };
    intervalHours: number;
  }) => void;

  // edit-only convenience actions
  onSendCodeByEmail?: () => void;
  onSaveCodeAsText?: () => void;
};

let Slider: any = null;
try { Slider = require("@react-native-community/slider").default; } catch {}

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
  initialIntervalHours = 5,
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

  // Local state (will be reset by sync effect below when props/visibility change)
  const [plantId, setPlantId] = React.useState<string>(mode === "edit" && initialPlantId ? initialPlantId : "");
  const [name, setName] = React.useState<string>(initialName ?? "");
  const [notes, setNotes] = React.useState<string>(initialNotes ?? "");
  const [enabled, setEnabled] = React.useState<boolean>(initialEnabled);

  const [sensorTemp, setSensorTemp] = React.useState<boolean>(initialSensors?.temperature ?? true);
  const [sensorHum, setSensorHum] = React.useState<boolean>(initialSensors?.humidity ?? true);
  const [sensorLight, setSensorLight] = React.useState<boolean>(initialSensors?.light ?? true);
  const [sensorMoist, setSensorMoist] = React.useState<boolean>(initialSensors?.moisture ?? true);

  const defaultMoistPct =
    typeof initialMoistureAlertPct === "number"
      ? initialMoistureAlertPct
      : typeof initialHumidityAlertPct === "number"
      ? initialHumidityAlertPct
      : 30;

  const [moistAlertEnabled, setMoistAlertEnabled] = React.useState<boolean>(Boolean(initialMoistureAlertEnabled));
  const [moistAlertPct, setMoistAlertPct] = React.useState<number>(Math.max(0, Math.min(100, defaultMoistPct)));

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const [intervalHours, setIntervalHours] = React.useState<number>(clamp(initialIntervalHours, 1, 24));

  // show/hide secret
  const [showSecret, setShowSecret] = React.useState(false);

  // Close dropdown when modal opens
  React.useEffect(() => { if (visible) setPlantOpen(false); }, [visible]);

  // ✅ SYNC EFFECT: when opening the modal (or when any initial* changes), re-seed local state
  React.useEffect(() => {
    if (!visible) return;
    const nextPlantId = mode === "edit" && initialPlantId ? initialPlantId : "";
    setPlantId(nextPlantId);
    setName(initialName ?? "");
    setNotes(initialNotes ?? "");
    setEnabled(initialEnabled);

    setSensorTemp(initialSensors?.temperature ?? true);
    setSensorHum(initialSensors?.humidity ?? true);
    setSensorLight(initialSensors?.light ?? true);
    setSensorMoist(initialSensors?.moisture ?? true);

    const moistPct =
      typeof initialMoistureAlertPct === "number"
        ? initialMoistureAlertPct
        : typeof initialHumidityAlertPct === "number"
        ? initialHumidityAlertPct
        : 30;

    setMoistAlertEnabled(Boolean(initialMoistureAlertEnabled));
    setMoistAlertPct(Math.max(0, Math.min(100, moistPct)));

    setIntervalHours(clamp(initialIntervalHours ?? 5, 1, 24));
    setShowSecret(false);
  }, [
    visible,
    mode,
    initialPlantId,
    initialName,
    initialNotes,
    initialEnabled,
    initialSensors?.temperature,
    initialSensors?.humidity,
    initialSensors?.light,
    initialSensors?.moisture,
    initialMoistureAlertEnabled,
    initialMoistureAlertPct,
    initialHumidityAlertPct,
    initialIntervalHours,
  ]);

  // Keep plantId valid if it points to a missing plant; do NOT auto-pick first in add mode.
  React.useEffect(() => {
    if (plantId && !plants.some((p) => p.id === plantId)) {
      setPlantId("");
    }
  }, [plants, plantId]);

  const selectedPlant = React.useMemo(
    () => plants.find((p) => p.id === plantId),
    [plantId, plants]
  );

  // When user picks a plant and the device name is still empty, auto-fill "Plant – Location"
  const buildNameFromPlant = (p: PlantOption) => {
    const loc = p.location ? ` – ${p.location}` : "";
    return `${p.name}${loc}`;
  };

  // Required: both plantId and non-empty device name
  const canSave = Boolean(plantId) && Boolean((name || "").trim());

  const handleSave = () => {
    if (!canSave) return;
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
        moistureAlertEnabled: sensorMoist ? moistAlertEnabled : undefined,
        moistureAlertPct: sensorMoist && moistAlertEnabled ? moistAlertPct : undefined,
      },
      intervalHours,
    });
  };

  // ---- UI ----
  if (!visible) return null;

  // Empty plants state
  if (plants.length === 0) {
    return (
      <>
        <Pressable style={pr.backdrop} onPress={onCancel} />
        <View style={pr.promptWrap}>
          <View style={pr.promptGlass}>
            <BlurView style={{ position: "absolute", inset: 0 } as any} blurType="light" blurAmount={14} reducedTransparencyFallbackColor="rgba(255,255,255,0.25)" />
            <View pointerEvents="none" style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" } as any} />
          </View>
          <View style={[pr.promptInner, { maxHeight: "86%" }]}>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={pr.promptTitle}>{t("readingsModals.upsert.linkDeviceTitle")}</Text>
              <Text style={{ color: "rgba(255,255,255,0.95)", paddingHorizontal: 16 }}>
                {t("readingsModals.upsert.noPlantsText")}
              </Text>
              <View style={[pr.promptButtonsRow, { marginTop: 12 }]}>
                <Pressable style={pr.promptBtn} onPress={onCancel}>
                  <Text style={pr.promptBtnText}>{t("readingsModals.common.close")}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </>
    );
  }

  const title = mode === "add" ? t("readingsModals.upsert.linkDeviceTitle") : t("readingsModals.upsert.editDeviceTitle");

  return (
    <>
      <Pressable style={pr.backdrop} onPress={onCancel} />
      <View style={pr.promptWrap}>
        <View style={pr.promptGlass}>
          <BlurView style={{ position: "absolute", inset: 0 } as any} blurType="light" blurAmount={14} reducedTransparencyFallbackColor="rgba(255,255,255,0.25)" />
          <View pointerEvents="none" style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.35)" } as any} />
        </View>

        <View style={[pr.promptInner, { maxHeight: "86%" }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
            <Text style={pr.promptTitle}>{title}</Text>

            {/* 1) Plant dropdown */}
            <View style={sp.dropdown}>
              <Pressable
                style={sp.dropdownHeader}
                onPress={() => setPlantOpen((o) => !o)}
                android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              >
                <Text style={sp.dropdownValue}>
                  {selectedPlant ? selectedPlant.name : t("readingsModals.upsert.selectPlant")}
                </Text>
                <MaterialCommunityIcons name={plantOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
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
                      {plantId === p.id && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
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

            {/* Sensors */}
            <Text style={[sp.dropdownValue, { marginHorizontal: 16, marginTop: 8 }]}>
              {t("readingsModals.upsert.sensors")}
            </Text>
            <View style={{ gap: 10, marginHorizontal: 16, marginTop: 6 }}>
              <RowSwitch label={t("readingsModals.upsert.sensorTemperature")} value={sensorTemp} onValueChange={setSensorTemp} weight="600" />
              <RowSwitch label={t("readingsModals.upsert.sensorHumidity")} value={sensorHum} onValueChange={setSensorHum} weight="600" />
              <RowSwitch label={t("readingsModals.upsert.sensorLight")} value={sensorLight} onValueChange={setSensorLight} weight="600" />
              <RowSwitch label={t("readingsModals.upsert.sensorSoilMoisture")} value={sensorMoist} onValueChange={setSensorMoist} weight="600" />

              {/* Soil moisture alert controls */}
              {sensorMoist && (
                <View style={{ marginLeft: 8, gap: 10 }}>
                  <CheckRow
                    label={t("readingsModals.upsert.moistAlertLabel")}
                    checked={moistAlertEnabled}
                    onToggle={() => setMoistAlertEnabled((v) => !v)}
                  />
                  {moistAlertEnabled && (
                    <View style={{ marginLeft: 8 }}>
                      <Text
                        style={[
                          sp.dropdownItemText,
                          { fontWeight: "600", fontSize: 12, opacity: 0.9, marginBottom: 6 }
                        ]}
                      >
                        {t("readingsModals.upsert.thresholdLabel")}{" "}
                        <Text style={{ fontWeight: "800", color: "#fff" }}>{moistAlertPct}%</Text>
                      </Text>
                      {Slider ? (
                        <Slider
                          minimumValue={0}
                          maximumValue={100}
                          step={1}
                          value={moistAlertPct}
                          onValueChange={(v: number) => setMoistAlertPct(Math.max(0, Math.min(100, Math.round(v))))}
                          style={{ marginBottom: 12 }}
                        />
                      ) : (
                        <TextInput
                          style={pr.input}
                          keyboardType="numeric"
                          value={String(moistAlertPct)}
                          onChangeText={(t2) => {
                            const n = parseInt(t2.replace(/[^\d]/g, ""), 10);
                            const v = Number.isFinite(n) ? n : 30;
                            setMoistAlertPct(Math.max(0, Math.min(100, v)));
                          }}
                          placeholder="30"
                          placeholderTextColor="rgba(255,255,255,0.7)"
                        />
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Sampling interval */}
            <Text style={[sp.dropdownValue, { marginHorizontal: 16, marginTop: 16 }]}>
              {t("readingsModals.upsert.samplingInterval")}
            </Text>
            <Text
              style={[
                sp.dropdownItemText,
                { marginHorizontal: 16, marginTop: 4, fontWeight: "600", fontSize: 12, opacity: 0.9 }
              ]}
            >
              {t("readingsModals.upsert.everyXHours", { count: intervalHours })}
            </Text>
            <View style={{ marginTop: 6, marginHorizontal: 16 }}>
              {Slider ? (
                <Slider
                  minimumValue={1}
                  maximumValue={24}
                  step={1}
                  value={intervalHours}
                  onValueChange={(v: number) => setIntervalHours(Math.max(1, Math.min(24, Math.round(v))))}
                  style={{ marginBottom: 12 }}
                />
              ) : (
                <TextInput
                  style={pr.input}
                  keyboardType="numeric"
                  value={String(intervalHours)}
                  onChangeText={(t2) => {
                    const n = parseInt(t2.replace(/[^\d]/g, ""), 10);
                    const v = Number.isFinite(n) ? n : 5;
                    const clamped = Math.max(1, Math.min(24, v));
                    setIntervalHours(clamped);
                  }}
                  placeholder="5"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                />
              )}
            </View>

            {/* Edit-only connectivity + actions */}
            {mode === "edit" && (
              <>
                <Text style={[sp.dropdownValue, { marginHorizontal: 16, marginTop: 16, marginBottom: 6 }]}>
                  {t("readingsModals.upsert.authSecret")}
                </Text>
                <View
                  style={{
                    marginHorizontal: 16,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.10)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={sp.dropdownValue} selectable={showSecret}>
                    {authSecret ? (showSecret ? authSecret : "••••••••••••••") : t("readingsModals.common.dash")}
                  </Text>
                  {authSecret ? (
                    <Pressable
                      onPress={() => setShowSecret((v) => !v)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showSecret
                          ? t("readingsModals.deviceSetup.hideAuthSecret")
                          : t("readingsModals.deviceSetup.showAuthSecret")
                      }
                    >
                      <MaterialCommunityIcons
                        name={showSecret ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#FFFFFF"
                      />
                    </Pressable>
                  ) : null}
                </View>

                <Text style={[sp.dropdownValue, { marginHorizontal: 16, marginTop: 10, marginBottom: 6 }]}>
                  {t("readingsModals.upsert.deviceKey")}
                </Text>
                <View style={{ marginHorizontal: 16, padding: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.10)" }}>
                  <Text style={sp.dropdownValue}>{deviceKey ? deviceKey : t("readingsModals.common.dash")}</Text>
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 12 }}>
                  {/* Make these primary (blue) to match Save */}
                  <Pressable onPress={onSendCodeByEmail} style={[pr.promptBtn, pr.promptPrimary, { flex: 1, alignItems: "center" }]}>
                    <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                      {t("readingsModals.upsert.sendCodeViaEmail")}
                    </Text>
                  </Pressable>
                  <Pressable onPress={onSaveCodeAsText} style={[pr.promptBtn, pr.promptPrimary, { flex: 1, alignItems: "center" }]}>
                    <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>
                      {t("readingsModals.upsert.saveCodeAsText")}
                    </Text>
                  </Pressable>
                </View>

                <Text style={[sp.dropdownValue, { marginHorizontal: 16, marginTop: 16 }]}>
                  {t("readingsModals.upsert.enabled")}
                </Text>
                <View style={{ marginHorizontal: 16 }}>
                  <RowSwitch
                    label={t("readingsModals.upsert.ingestReadingsFromDevice")}
                    value={enabled}
                    onValueChange={setEnabled}
                    weight="600"
                  />
                </View>
              </>
            )}

            {/* Notes */}
            <TextInput
              style={[pr.input, { height: 120, textAlignVertical: "top", paddingTop: 10 }]}
              placeholder={t("readingsModals.upsert.notesOptional")}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            {/* Footer */}
            <View style={pr.promptButtonsRow}>
              <Pressable style={pr.promptBtn} onPress={onCancel}>
                <Text style={pr.promptBtnText}>{t("readingsModals.common.cancel")}</Text>
              </Pressable>
              <Pressable
                style={[pr.promptBtn, pr.promptPrimary, (!canSave ? { opacity: 0.5 } : null)]}
                disabled={!canSave}
                onPress={handleSave}
              >
                <Text style={[pr.promptBtnText, pr.promptPrimaryText]}>{t("readingsModals.common.save")}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </>
  );
}

/** Slimmer label switch (less font weight). */
function RowSwitch({
  label,
  value,
  onValueChange,
  weight = "600",
}: { label: string; value: boolean; onValueChange: (v: boolean) => void; weight?: "600" | "700" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 }}>
      <Text style={[sp.dropdownItemText, { fontWeight: weight as any }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

/** White checkbox row used for the soil moisture alert toggle — smaller text/weight. */
function CheckRow({
  label,
  checked,
  onToggle,
}: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={{ flexDirection: "row", alignItems: "center" }}>
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
        }}
      >
        {checked ? <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" /> : null}
      </View>
      <Text style={[sp.dropdownItemText, { fontWeight: "600", fontSize: 12, opacity: 0.9 }]}>{label}</Text>
    </Pressable>
  );
}
