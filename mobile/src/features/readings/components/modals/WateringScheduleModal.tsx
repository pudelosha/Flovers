import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";

// Reuse Reminders modal styles
import { s } from "../../../reminders/styles/reminders.styles";

type Props = {
  visible: boolean;
  deviceId?: string | number | null;
  deviceName?: string | null;
  plantName?: string | null;
  location?: string | null;
  pumpIncluded?: boolean;
  lastPumpRunAt?: string | null;
  onClose: () => void;
};

export default function WateringScheduleModal({
  visible,
  deviceId,
  deviceName,
  plantName,
  location,
  pumpIncluded,
  lastPumpRunAt,
  onClose,
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
              {tr("readingsModals.wateringSchedule.title", "Schedule watering")}
            </Text>

            <Text style={s.confirmText}>
              {tr(
                "readingsModals.wateringSchedule.description",
                "This modal will let the user review watering details and confirm a watering schedule before the action is executed. This is currently a placeholder preview."
              )}
            </Text>

            <InfoRow
              icon="access-point"
              label={tr("readingsModals.wateringSchedule.deviceName", "Device name")}
              value={deviceName || "—"}
            />

            <InfoRow
              icon="identifier"
              label={tr("readingsModals.wateringSchedule.deviceId", "Device ID")}
              value={deviceId != null ? String(deviceId) : "—"}
            />

            <InfoRow
              icon="sprout-outline"
              label={tr("readingsModals.wateringSchedule.plant", "Plant")}
              value={plantName || "—"}
            />

            <InfoRow
              icon="map-marker-outline"
              label={tr("readingsModals.wateringSchedule.location", "Location")}
              value={location || "—"}
            />

            <InfoRow
              icon="water-pump"
              label={tr("readingsModals.wateringSchedule.pumpLinked", "Water pump linked")}
              value={
                pumpIncluded
                  ? tr("readingsModals.wateringSchedule.yes", "Yes")
                  : tr("readingsModals.wateringSchedule.no", "No")
              }
            />

            <InfoRow
              icon="history"
              label={tr("readingsModals.wateringSchedule.lastPumpRun", "Last pump run")}
              value={lastPumpRunAt || "—"}
            />

            <Block label={tr("readingsModals.wateringSchedule.previewSection", "What will appear here later")}>
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  gap: 8,
                }}
              >
                <BulletText
                  text={tr(
                    "readingsModals.wateringSchedule.preview1",
                    "Selected watering date and near-future schedule."
                  )}
                />
                <BulletText
                  text={tr(
                    "readingsModals.wateringSchedule.preview2",
                    "Estimated execution details for the linked pump."
                  )}
                />
                <BulletText
                  text={tr(
                    "readingsModals.wateringSchedule.preview3",
                    "A confirmation step before sending the request."
                  )}
                />
              </View>
            </Block>

            <Pressable
              disabled
              style={{
                marginTop: 12,
                paddingVertical: 12,
                borderRadius: 16,
                backgroundColor: "rgba(11,114,133,0.92)",
                alignItems: "center",
                opacity: 0.7,
              }}
            >
              <Text style={s.promptPrimaryText}>
                {tr("readingsModals.wateringSchedule.confirmPlaceholder", "Confirm schedule")}
              </Text>
            </Pressable>

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
        <Text style={[s.codeBlockText, { fontVariant: ["tabular-nums"] }]} selectable>
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

function BulletText({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <MaterialCommunityIcons
        name="check-circle-outline"
        size={18}
        color="#fff"
        style={{ marginTop: 1 }}
      />
      <Text style={[s.dropdownValue, { flex: 1 }]}>{text}</Text>
    </View>
  );
}