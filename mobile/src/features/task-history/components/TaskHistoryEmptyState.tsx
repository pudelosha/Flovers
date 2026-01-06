import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";

import { s } from "../styles/task-history.styles";

type Props = {
  plantIdFilter?: string;
};

export default function TaskHistoryEmptyState({ plantIdFilter }: Props) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        borderRadius: 28,
        overflow: "hidden",
        minHeight: 140,
      }}
    >
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={20}
        overlayColor="transparent"
        reducedTransparencyFallbackColor="transparent"
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(255,255,255,0.20)" },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 28,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.20)",
          },
        ]}
      />
      <View style={s.emptyInner}>
        <MaterialCommunityIcons
          name="history"
          size={26}
          color="#FFFFFF"
          style={{ marginBottom: 10 }}
        />
        <Text style={s.emptyTitle}>{t("taskHistory.empty.title")}</Text>
        <View style={s.emptyDescBox}>
          <Text style={s.emptyText}>
            {t("taskHistory.empty.descBeforeBold")}{" "}
            <Text style={s.inlineBold}>{t("taskHistory.empty.bold")}</Text>{" "}
            {t("taskHistory.empty.descAfterBold")}
            {"\n\n"}
            {plantIdFilter
              ? t("taskHistory.empty.filteredToPlantId", { plantId: plantIdFilter })
              : t("taskHistory.empty.openFromTaskHint")}
          </Text>
        </View>
      </View>
    </View>
  );
}
