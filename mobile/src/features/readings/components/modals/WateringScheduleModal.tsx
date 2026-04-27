import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../app/providers/LanguageProvider";
import ModalCloseButton from "../../../../shared/ui/ModalCloseButton";
import type { ApiPumpTask } from "../types/readings.types";

// Reuse Reminders modal styles
import { s } from "../../../reminders/styles/reminders.styles";

type Props = {
  visible: boolean;
  loading?: boolean;
  working?: boolean;

  deviceId?: string | number | null;
  deviceName?: string | null;
  plantName?: string | null;
  location?: string | null;
  pumpIncluded?: boolean;
  lastPumpRunAt?: string | null;

  /**
   * Preferred new backend shape.
   * Comes from:
   * - GET /api/readings/devices/:id/pump-status/
   * - pending_pump_task
   */
  pendingPumpTask?: ApiPumpTask | null;

  /**
   * Backwards-compatible props.
   * Safe to remove later after ReadingsScreen is fully switched to pendingPumpTask.
   */
  scheduledJobExists?: boolean;
  scheduledJobCreatedAt?: string | null;

  onClose: () => void;
  onScheduleWatering?: () => Promise<void> | void;
  onRecallWatering?: () => Promise<void> | void;
};

export default function WateringScheduleModal({
  visible,
  loading = false,
  working = false,
  deviceId,
  deviceName,
  plantName,
  location,
  pumpIncluded,
  lastPumpRunAt,
  pendingPumpTask,
  scheduledJobExists = false,
  scheduledJobCreatedAt,
  onClose,
  onScheduleWatering,
  onRecallWatering,
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

  const hasPendingTask = Boolean(pendingPumpTask) || scheduledJobExists;

  const pendingTaskCreatedAt =
    pendingPumpTask?.requested_at ?? scheduledJobCreatedAt ?? null;

  const pendingTaskExpiresAt = pendingPumpTask?.expires_at ?? null;

  const canScheduleOrRecall =
    Boolean(pumpIncluded) &&
    !loading &&
    !working &&
    (hasPendingTask ? Boolean(onRecallWatering) : Boolean(onScheduleWatering));

  const handleScheduleButtonPress = React.useCallback(() => {
    if (!canScheduleOrRecall) return;

    if (hasPendingTask) {
      onRecallWatering?.();
    } else {
      onScheduleWatering?.();
    }
  }, [
    canScheduleOrRecall,
    hasPendingTask,
    onRecallWatering,
    onScheduleWatering,
  ]);

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
          <ModalCloseButton
            onPress={onClose}
            accessibilityLabel={tr("readingsModals.common.close", "Close")}
          />

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
                "Manual watering works by creating a pending pump job for this device. The mobile app does not run the pump directly. Instead, the backend stores the scheduled job, and the Arduino board checks for pending jobs when it sends its next reading. If a pending job exists and the board has pump-control logic, it can start the water pump and then mark the job as executed."
              )}
            </Text>

            <View style={{ marginHorizontal: 16, gap: 12 }}>
              {loading ? (
                <View
                  style={{
                    minHeight: 220,
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.10)",
                    justifyContent: "center",
                  }}
                >
                  <Text style={s.dropdownValue}>
                    {tr(
                      "readingsModals.wateringSchedule.loading",
                      "Checking watering schedule..."
                    )}
                  </Text>
                </View>
              ) : (
                <>
                  <Block
                    label={tr(
                      "readingsModals.wateringSchedule.currentSchedule",
                      "Current watering request"
                    )}
                  >
                    <View
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: hasPendingTask
                          ? "rgba(11,114,133,0.28)"
                          : "rgba(255,255,255,0.10)",
                        gap: 8,
                      }}
                    >
                      <StatusLine
                        icon={
                          hasPendingTask
                            ? "clock-check-outline"
                            : "clock-outline"
                        }
                        text={
                          hasPendingTask
                            ? tr(
                                "readingsModals.wateringSchedule.pendingJob",
                                "A watering job is currently scheduled and waiting for the device to pick it up."
                              )
                            : tr(
                                "readingsModals.wateringSchedule.noPendingJob",
                                "There is no pending watering job for this device."
                              )
                        }
                      />

                      {hasPendingTask && (
                        <>
                          <StatusLine
                            icon="calendar-clock"
                            text={tr(
                              "readingsModals.wateringSchedule.scheduledAt",
                              "Scheduled at: {{value}}",
                              { value: pendingTaskCreatedAt || "—" }
                            )}
                          />

                          {!!pendingTaskExpiresAt && (
                            <StatusLine
                              icon="timer-sand"
                              text={tr(
                                "readingsModals.wateringSchedule.expiresAt",
                                "Expires at: {{value}}",
                                { value: pendingTaskExpiresAt }
                              )}
                            />
                          )}
                        </>
                      )}
                    </View>
                  </Block>

                  <Block
                    label={tr(
                      "readingsModals.wateringSchedule.howItWorks",
                      "How this works"
                    )}
                  >
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
                          "readingsModals.wateringSchedule.step1",
                          "When you schedule watering, the backend stores a pending pump job for this device."
                        )}
                      />

                      <BulletText
                        text={tr(
                          "readingsModals.wateringSchedule.step2",
                          "The Arduino board normally sends readings about once per hour. During that request, it can also ask the backend whether a pump job is waiting."
                        )}
                      />

                      <BulletText
                        text={tr(
                          "readingsModals.wateringSchedule.step3",
                          "If the board has pump-control logic and finds a pending job, it can start the pump and then report that the job was executed."
                        )}
                      />

                      <BulletText
                        text={tr(
                          "readingsModals.wateringSchedule.step4",
                          "Manual scheduled watering is independent from automatic moisture-based watering. It does not check the current soil moisture level before running."
                        )}
                      />
                    </View>
                  </Block>

                  {!pumpIncluded && (
                    <Block
                      label={tr(
                        "readingsModals.wateringSchedule.pumpRequiredTitle",
                        "Pump required"
                      )}
                    >
                      <View
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: "rgba(255,255,255,0.10)",
                          gap: 8,
                        }}
                      >
                        <StatusLine
                          icon="alert-circle-outline"
                          text={tr(
                            "readingsModals.wateringSchedule.pumpRequiredText",
                            "This device is not configured with a water pump. Enable water pump support in the device settings before scheduling watering."
                          )}
                        />
                      </View>
                    </Block>
                  )}

                  <Pressable
                    disabled={!canScheduleOrRecall}
                    onPress={handleScheduleButtonPress}
                    style={{
                      marginTop: 12,
                      paddingVertical: 12,
                      borderRadius: 16,
                      backgroundColor: hasPendingTask
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(11,114,133,0.92)",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 8,
                      opacity: canScheduleOrRecall ? 1 : 0.7,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={
                        hasPendingTask
                          ? "calendar-remove-outline"
                          : "calendar-plus-outline"
                      }
                      size={18}
                      color="#fff"
                    />

                    <Text
                      style={
                        hasPendingTask
                          ? s.promptBtnText
                          : s.promptPrimaryText
                      }
                    >
                      {working
                        ? tr(
                            "readingsModals.wateringSchedule.working",
                            "Updating..."
                          )
                        : hasPendingTask
                        ? tr(
                            "readingsModals.wateringSchedule.recallWatering",
                            "Recall scheduled watering"
                          )
                        : tr(
                            "readingsModals.wateringSchedule.scheduleWatering",
                            "Schedule watering"
                          )}
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
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value}
        </Text>
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

function BulletText({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <MaterialCommunityIcons
        name="check-circle-outline"
        size={18}
        color="#fff"
        style={{ marginTop: 1 }}
      />

      <Text
        style={[
          s.dropdownValue,
          {
            flex: 1,
            minWidth: 0,
            fontSize: 12,
            lineHeight: 18,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function StatusLine({
  icon,
  text,
}: {
  icon: string;
  text: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <MaterialCommunityIcons
        name={icon as any}
        size={18}
        color="#fff"
        style={{ marginTop: 1 }}
      />

      <Text
        style={[
          s.dropdownValue,
          {
            flex: 1,
            minWidth: 0,
            fontSize: 12,
            lineHeight: 18,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}