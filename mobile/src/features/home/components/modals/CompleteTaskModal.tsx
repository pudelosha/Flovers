import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  Platform,
  ScrollView,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import { s } from "../../styles/home.styles";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../../../app/providers/SettingsProvider";
import ModalCloseButton from "../../../../shared/ui/ModalCloseButton";

let DateTimePicker: any = null;
try {
  DateTimePicker = require("@react-native-community/datetimepicker").default;
} catch {}

function isValidDateYYYYMMDD(v?: string) {
  if (!v) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;

  const [Y, M, D] = v.split("-").map(Number);
  const d = new Date(`${v}T00:00:00`);

  return (
    !Number.isNaN(+d) &&
    d.getFullYear() === Y &&
    d.getMonth() + 1 === M &&
    d.getDate() === D
  );
}

function toYYYYMMDD(d: Date) {
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
}

function startOfLocalDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function clampToToday(d: Date) {
  const today = startOfLocalDay(new Date());
  const selected = startOfLocalDay(d);
  return selected > today ? today : selected;
}

function dateFromISO(iso?: string) {
  if (!isValidDateYYYYMMDD(iso)) return startOfLocalDay(new Date());
  return clampToToday(new Date(`${iso}T00:00:00`));
}

function formatDateForDisplay(iso?: string, pattern?: string) {
  if (!iso || !isValidDateYYYYMMDD(iso)) return "";

  const [yyyy, mm, dd] = iso.split("-");
  const fmt = pattern && typeof pattern === "string" ? pattern : "DD.MM.YYYY";

  return fmt.replace("YYYY", yyyy).replace("MM", mm).replace("DD", dd);
}

type Props = {
  visible: boolean;
  note: string;
  onChangeNote: (v: string) => void;
  completionDate: string;
  onChangeCompletionDate: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;

  // allow single + bulk modes
  mode?: "single" | "bulk";
  count?: number;

  isOverdue?: boolean;
  intervalText?: string;
};

export default function CompleteTaskModal({
  visible,
  note,
  onChangeNote,
  completionDate,
  onChangeCompletionDate,
  onCancel,
  onConfirm,
  mode = "single",
  count,
  isOverdue = false,
  intervalText = "",
}: Props) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!visible) setShowDatePicker(false);
  }, [visible]);

  if (!visible) return null;

  const isBulk = mode === "bulk";
  const completionDateDisplay = formatDateForDisplay(
    completionDate,
    settings.dateFormat
  );

  const closeModal = () => {
    Keyboard.dismiss();
    setShowDatePicker(false);
    onCancel();
  };

  const confirm = () => {
    Keyboard.dismiss();
    setShowDatePicker(false);
    onConfirm();
  };

  return (
    <>
      <Pressable style={s.promptBackdrop} onPress={closeModal} />

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
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.35)",
            }}
          />
        </View>

        <View
          style={[
            s.promptInner,
            {
              height: "86%",
              maxHeight: "86%",
              position: "relative",
            },
          ]}
        >
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingTop: 44,
              paddingBottom: 120,
            }}
          >
            <Text style={s.promptTitle}>
              {isBulk
                ? t("homeModals.completeBulk.title", { count: count ?? 0 })
                : t("homeModals.complete.title")}
            </Text>

            {isOverdue ? (
              <Text style={s.inputHint}>
                {t(
                  isBulk
                    ? "homeModals.completeBulk.overdueInfo"
                    : "homeModals.complete.overdueInfo",
                  { intervalText }
                )}
              </Text>
            ) : null}

            <Text style={s.inputLabel}>
              {t("homeModals.complete.completionDateLabel")}
            </Text>

            <Text style={s.inputHint}>
              {isBulk
                ? t("homeModals.completeBulk.completionDateHint")
                : t("homeModals.complete.completionDateHint")}
            </Text>

            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                if (DateTimePicker) setShowDatePicker(true);
              }}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            >
              <TextInput
                style={s.input}
                placeholder={settings.dateFormat || "DD.MM.YYYY"}
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={completionDateDisplay || completionDate}
                editable={false}
                pointerEvents="none"
              />
            </Pressable>

            <Text style={s.inputLabel}>{t("homeModals.complete.noteLabel")}</Text>

            <Text style={s.inputHint}>
              {isBulk
                ? t("homeModals.completeBulk.noteHint")
                : t("homeModals.complete.noteHint")}
            </Text>

            <TextInput
              style={[
                s.input,
                {
                  minHeight: 96,
                  textAlignVertical: "top",
                },
              ]}
              multiline
              placeholder={t("homeModals.complete.notePlaceholder")}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={note}
              onChangeText={onChangeNote}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={confirm}
            />

            <View style={s.promptButtonsRow}>
              <Pressable style={s.promptBtn} onPress={closeModal}>
                <Text style={s.promptBtnText}>
                  {t("homeModals.common.cancel")}
                </Text>
              </Pressable>

              <Pressable style={[s.promptBtn, s.promptPrimary]} onPress={confirm}>
                <Text style={[s.promptBtnText, s.promptPrimaryText]}>
                  {isBulk
                    ? t("homeModals.completeBulk.confirm")
                    : t("homeModals.complete.confirm")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <ModalCloseButton
            onPress={closeModal}
            accessibilityLabel={t("homeModals.common.close", "Close")}
            style={{
              top: 8,
              right: 8,
            }}
          />

          {DateTimePicker && showDatePicker && Platform.OS === "android" && (
            <DateTimePicker
              value={dateFromISO(completionDate)}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(event: any, date?: Date) => {
                setShowDatePicker(false);
                if (date) onChangeCompletionDate(toYYYYMMDD(clampToToday(date)));
              }}
            />
          )}

          {DateTimePicker && showDatePicker && Platform.OS !== "android" && (
            <View style={s.datePickerOverlay}>
              <Pressable
                style={s.datePickerDismissLayer}
                onPress={() => setShowDatePicker(false)}
              />

              <View style={s.datePickerPopover}>
                <DateTimePicker
                  value={dateFromISO(completionDate)}
                  mode="date"
                  display="inline"
                  maximumDate={new Date()}
                  onChange={(event: any, date?: Date) => {
                    if (date) onChangeCompletionDate(toYYYYMMDD(clampToToday(date)));
                  }}
                />

                <View style={s.datePickerActions}>
                  <Pressable
                    onPress={() => setShowDatePicker(false)}
                    style={[s.promptBtn, s.promptPrimary]}
                  >
                    <Text style={s.promptPrimaryText}>
                      {t("homeModals.common.apply")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </>
  );
}
