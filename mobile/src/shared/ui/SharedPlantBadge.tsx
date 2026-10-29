import React from "react";
import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { plantAccess } from "../utils/plantAccess";
import type { ApiPlantAccess } from "../utils/plantAccess";

export default function SharedPlantBadge({ access, compact = false, alignRight = false }: {
  access?: ApiPlantAccess | null;
  compact?: boolean;
  alignRight?: boolean;
}) {
  const { t } = useTranslation();
  const permissions = plantAccess(access);
  if (!permissions.isShared) return null;
  return <View style={[s.row, alignRight && { alignSelf: "flex-end" }]}>
    <MaterialCommunityIcons name="account-multiple-outline" size={compact ? 12 : 13} color="#BDE4F6" />
    <Text style={[s.label, compact && { fontSize: 10 }]} numberOfLines={1}>{compact
      ? t("sharing.access.shared", { defaultValue: "Shared" })
      : permissions.ownerName
      ? t("sharing.access.sharedBy", { defaultValue: "Shared by {{name}}", name: permissions.ownerName })
      : t("sharing.access.sharedPlant", { defaultValue: "Shared plant" })}</Text>
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  label: { color: "#BDE4F6", fontSize: 11, flexShrink: 1 },
});
