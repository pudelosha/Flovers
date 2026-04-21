import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";

import { useSettings } from "../../../../app/providers/SettingsProvider";
import { s } from "../../styles/task-history.styles";
import type { TaskType } from "../../../home/types/home.types";
import type {
  HistoryExportEmailRequest,
  HistoryExportSortDir,
  HistoryExportSortKey,
} from "../../../../api/services/history.service";

type Props = {
  visible: boolean;
  effectiveFilters: HistoryExportEmailRequest;
  plantName?: string;
  onCancel: () => void;
  onSend: (includePending: boolean) => void;
  sending?: boolean;
};

function isValidDateYYYYMMDD(v?: string) {
  if (!v) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v);
  if (isNaN(+d)) return false;
  const [Y, M, D] = v.split("-").map(Number);
  return (
    d.getUTCFullYear() === Y &&
    d.getUTCMonth() + 1 === M &&
    d.getUTCDate() === D
  );
}

function formatDateForDisplay(iso?: string, pattern?: string) {
  if (!iso || !isValidDateYYYYMMDD(iso)) return "";

  const [yyyy, mm, dd] = iso.split("-");
  const fmt = pattern && typeof pattern === "string" ? pattern : "DD.MM.YYYY";

  return fmt.replace("YYYY", yyyy).replace("MM", mm).replace("DD", dd);
}

function renderTaskTypesLabel(
  types: TaskType[] | undefined,
  t: (key: string, options?: any) => string
) {
  if (!types || types.length === 0) {
    return t("taskHistoryModals.export.allTaskTypes");
  }

  return types
    .map((tt) => t(`taskHistoryModals.common.taskTypes.${tt}`))
    .join(", ");
}

function renderSortKeyLabel(
  sortKey: HistoryExportSortKey | undefined,
  t: (key: string, options?: any) => string
) {
  if (!sortKey) return t("taskHistoryModals.export.notSet");
  return t(`taskHistoryModals.sort.keys.${sortKey}`);
}

function renderSortDirLabel(
  sortDir: HistoryExportSortDir | undefined,
  t: (key: string, options?: any) => string
) {
  if (!sortDir) return t("taskHistoryModals.export.notSet");
  return t(`taskHistoryModals.sort.directions.${sortDir}`);
}

export default function SendHistoryExportModal({
  visible,
  effectiveFilters,
  plantName,
  onCancel,
  onSend,
  sending = false,
}: Props) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const [includePending, setIncludePending] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setIncludePending(Boolean(effectiveFilters.includePending));
    }
  }, [visible, effectiveFilters.includePending]);

  if (!visible) return null;

  const plantValue = effectiveFilters.plantId
    ? plantName || effectiveFilters.plantId
    : t("taskHistoryModals.export.anyPlant");

  const locationValue =
    effectiveFilters.location || t("taskHistoryModals.export.anyLocation");

  const taskTypesValue = renderTaskTypesLabel(effectiveFilters.types, t);

  const fromValue =
    formatDateForDisplay(effectiveFilters.completedFrom, settings.dateFormat) ||
    t("taskHistoryModals.export.notSet");

  const toValue =
    formatDateForDisplay(effectiveFilters.completedTo, settings.dateFormat) ||
    t("taskHistoryModals.export.notSet");

  const sortKeyValue = renderSortKeyLabel(effectiveFilters.sortKey, t);
  const sortDirValue = renderSortDirLabel(effectiveFilters.sortDir, t);

  const hasAnyCriteria = Boolean(
    effectiveFilters.plantId ||
      effectiveFilters.location ||
      (effectiveFilters.types && effectiveFilters.types.length > 0) ||
      effectiveFilters.completedFrom ||
      effectiveFilters.completedTo
  );

  return (
    <>
      <Pressable
        style={s.promptBackdrop}
        onPress={sending ? undefined : onCancel}
      />

      <View style={s.promptWrap}>
        <View style={[s.promptGlass, s.promptGlass28]}>
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

        <View style={[s.promptInner, s.promptInner28, { maxHeight: "86%" }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 92 }}
          >
            <Text style={s.promptTitle}>
              {t("taskHistoryModals.export.title")}
            </Text>

            <View
              style={[
                s.input,
                {
                  marginTop: 0,
                  paddingTop: 14,
                  paddingBottom: 14,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginTop: 1 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontWeight: "800",
                    fontSize: 13,
                    lineHeight: 19,
                  }}
                >
                  {t("taskHistoryModals.export.noticeTitle")}
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
                    ? t("taskHistoryModals.export.noticeFiltered")
                    : t("taskHistoryModals.export.noticeAllData")}
                </Text>
              </View>
            </View>

            <Text style={s.sectionTitle}>
              {t("taskHistoryModals.export.criteriaTitle")}
            </Text>

            <Text style={s.inputLabel}>
              {t("taskHistoryModals.export.plantLabel")}
            </Text>
            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {plantValue}
              </Text>
            </View>

            <Text style={s.inputLabel}>
              {t("taskHistoryModals.export.locationLabel")}
            </Text>
            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {locationValue}
              </Text>
            </View>

            <Text style={s.inputLabel}>
              {t("taskHistoryModals.export.taskTypesLabel")}
            </Text>
            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {taskTypesValue}
              </Text>
            </View>

            <Text style={s.inputLabel}>
              {t("taskHistoryModals.export.completedFromLabel")}
            </Text>
            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {fromValue}
              </Text>
            </View>

            <Text style={s.inputLabel}>
              {t("taskHistoryModals.export.completedToLabel")}
            </Text>
            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {toValue}
              </Text>
            </View>

            <Text style={s.inputLabel}>
              {t("taskHistoryModals.export.sortByLabel")}
            </Text>
            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {sortKeyValue}
              </Text>
            </View>

            <Text style={s.inputLabel}>
              {t("taskHistoryModals.export.directionLabel")}
            </Text>
            <View style={[s.input, { justifyContent: "center" }]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                {sortDirValue}
              </Text>
            </View>

<Pressable
  onPress={sending ? undefined : () => setIncludePending((v) => !v)}
  style={{
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  }}
>
  <MaterialCommunityIcons
    name={includePending ? "checkbox-marked" : "checkbox-blank-outline"}
    size={22}
    color="#FFFFFF"
    style={{ marginRight: 10 }}
  />

  <Text
    style={{
      flex: 1,
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 13,
      lineHeight: 18,
    }}
  >
    {t("taskHistoryModals.export.includePending")}
  </Text>
</Pressable>

            <View style={[s.promptButtonsRow, { marginTop: 6, marginBottom: 12 }]}>
              <Pressable
                onPress={sending ? undefined : onCancel}
                style={s.promptBtn}
              >
                <Text style={s.promptBtnText}>
                  {t("taskHistoryModals.common.cancel")}
                </Text>
              </Pressable>

              <Pressable
                onPress={sending ? undefined : () => onSend(includePending)}
                style={[s.promptBtn, s.promptPrimary]}
              >
                <Text style={s.promptPrimaryText}>
                  {sending
                    ? t("taskHistoryModals.export.sending")
                    : t("taskHistoryModals.export.send")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </>
  );
}