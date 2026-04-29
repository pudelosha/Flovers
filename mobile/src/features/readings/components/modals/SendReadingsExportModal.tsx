import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";

import ModalCloseButton from "../../../../shared/ui/ModalCloseButton";

import { s } from "../../../reminders/styles/reminders.styles";
import type {
  ReadingsExportEmailRequest,
  ReadingsExportSortDir,
  ReadingsExportSortKey,
  ReadingsExportStatus,
} from "../../../../api/services/readings.service";

type Props = {
  visible: boolean;
  effectiveFilters: ReadingsExportEmailRequest;
  plantName?: string;
  onCancel: () => void;
  onSend: () => void;
  sending?: boolean;
};

function renderStatusLabel(
  status: ReadingsExportStatus | undefined,
  t: (key: string, options?: any) => string
) {
  if (!status) return t("readingsModals.export.anyStatus");
  if (status === "enabled") return t("readingsModals.filter.statusEnabled");
  if (status === "disabled") return t("readingsModals.filter.statusDisabled");
  return t("readingsModals.export.anyStatus");
}

function renderSortKeyLabel(
  sortKey: ReadingsExportSortKey | undefined,
  t: (key: string, options?: any) => string
) {
  if (!sortKey) return t("readingsModals.export.notSet");
  return t(`readingsModals.sort.keys.${sortKey}`);
}

function renderSortDirLabel(
  sortDir: ReadingsExportSortDir | undefined,
  t: (key: string, options?: any) => string
) {
  if (!sortDir) return t("readingsModals.export.notSet");
  return t(`readingsModals.sort.directions.${sortDir}`);
}

export default function SendReadingsExportModal({
  visible,
  effectiveFilters,
  plantName,
  onCancel,
  onSend,
  sending = false,
}: Props) {
  const { t } = useTranslation();

  if (!visible) return null;

  const plantValue = effectiveFilters.plantId
    ? plantName || effectiveFilters.plantId
    : t("readingsModals.export.anyPlant");

  const locationValue =
    effectiveFilters.location || t("readingsModals.export.anyLocation");

  const statusValue = renderStatusLabel(effectiveFilters.status, t);
  const sortKeyValue = renderSortKeyLabel(effectiveFilters.sortKey, t);
  const sortDirValue = renderSortDirLabel(effectiveFilters.sortDir, t);

  const hasAnyCriteria = Boolean(
    effectiveFilters.plantId ||
      effectiveFilters.location ||
      effectiveFilters.status
  );

  return (
    <>
      <Pressable
        style={s.promptBackdrop}
        onPress={sending ? undefined : onCancel}
      />

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
              maxHeight: "86%",
              position: "relative",
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 44,
              paddingBottom: 120,
            }}
          >
            <Text style={s.promptTitle}>
              {t("readingsModals.export.title")}
            </Text>

            <View
              style={[
                s.input,
                {
                  marginTop: 0,
                  paddingTop: 14,
                  paddingBottom: 14,
                },
              ]}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontWeight: "800",
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {t("readingsModals.export.noticeTitle")}
              </Text>

              <Text
                style={{
                  color: "rgba(255,255,255,0.92)",
                  fontWeight: "600",
                  fontSize: 12,
                  lineHeight: 18,
                  marginTop: 6,
                }}
              >
                {hasAnyCriteria
                  ? t("readingsModals.export.noticeFiltered")
                  : t("readingsModals.export.noticeAllData")}
              </Text>
            </View>

            <Text style={s.inputLabel}>
              {t("readingsModals.export.plantLabel")}
            </Text>

            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {plantValue}
              </Text>
            </View>

            <Text style={s.inputLabel}>
              {t("readingsModals.export.locationLabel")}
            </Text>

            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {locationValue}
              </Text>
            </View>

            <Text style={s.inputLabel}>
              {t("readingsModals.export.statusLabel")}
            </Text>

            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {statusValue}
              </Text>
            </View>

            <Text style={s.inputLabel}>
              {t("readingsModals.export.sortByLabel")}
            </Text>

            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {sortKeyValue}
              </Text>
            </View>

            <Text style={s.inputLabel}>
              {t("readingsModals.export.directionLabel")}
            </Text>

            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {sortDirValue}
              </Text>
            </View>

            <View style={[s.promptButtonsRow, { marginTop: 6, marginBottom: 12 }]}>
              <Pressable
                onPress={sending ? undefined : onCancel}
                style={s.promptBtn}
              >
                <Text style={s.promptBtnText}>
                  {t("readingsModals.common.cancel")}
                </Text>
              </Pressable>

              <Pressable
                onPress={sending ? undefined : onSend}
                style={[s.promptBtn, s.promptPrimary]}
              >
                <Text style={s.promptPrimaryText}>
                  {sending
                    ? t("readingsModals.export.sending")
                    : t("readingsModals.export.send")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <ModalCloseButton
            onPress={sending ? () => {} : onCancel}
            accessibilityLabel={t("readingsModals.common.close", "Close")}
            style={{
              top: 8,
              right: 8,
              opacity: sending ? 0.5 : 1,
            }}
          />
        </View>
      </View>
    </>
  );
}