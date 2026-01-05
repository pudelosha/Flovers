// C:\Projekty\Python\Flovers\mobile\src\features\plant-details\components\PlantInfoTile.tsx
import React, { useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import type { ApiPlantInstanceDetailFull } from "../../plants/types/plants.types";

type Props = {
  plant: ApiPlantInstanceDetailFull;
};

function normalizeOrientationKey(v: any): "N" | "E" | "S" | "W" | null {
  if (!v) return null;
  const raw = String(v).trim().toUpperCase();

  // Most common backend variants
  if (raw === "N" || raw === "NORTH") return "N";
  if (raw === "E" || raw === "EAST") return "E";
  if (raw === "S" || raw === "SOUTH") return "S";
  if (raw === "W" || raw === "WEST") return "W";

  return null;
}

export default function PlantInfoTile({ plant }: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  const title =
    plant.display_name ||
    plant.plant_definition?.name ||
    tr("plantDetails.info.fallbackTitle", `Plant #${plant.id}`, { id: plant.id });

  const latin = plant.plant_definition?.latin || "";
  const locationName = plant.location?.name || "";

  // Values that can be translated when they are key-like
  const lightValue = plant.light_level
    ? tr(
        `createPlant.step04.lightLevels.${String(plant.light_level)}.label`,
        String(plant.light_level)
      )
    : tr("plantDetails.common.dash", "—");

  // ✅ Orientation translated from plantDetails.json (reliable + local)
  const oKey = normalizeOrientationKey(plant.orientation);
  const orientationValue = oKey
    ? tr(
        `plantDetails.info.orientations.${oKey}`,
        // secondary attempt (optional): if your Step04 has it, it will still work
        tr(
          `createPlant.step04.orientations.${oKey}.label`,
          oKey
        )
      )
    : tr("plantDetails.common.dash", "—");

  const potValue = plant.pot_material
    ? tr(
        `createPlant.step05.potMaterials.${String(plant.pot_material)}.label`,
        String(plant.pot_material)
      )
    : tr("plantDetails.common.dash", "—");

  const soilValue = plant.soil_mix
    ? tr(
        `createPlant.step05.soilMixes.${String(plant.soil_mix)}.label`,
        String(plant.soil_mix)
      )
    : tr("plantDetails.common.dash", "—");

  const purchaseValue = plant.purchase_date || tr("plantDetails.common.dash", "—");
  const notesValue = plant.notes || tr("plantDetails.common.dash", "—");

  const distanceValue =
    (plant.distance_cm ?? tr("plantDetails.common.dash", "—")) +
    (plant.distance_cm != null ? ` ${tr("plantDetails.info.cm", "cm")}` : "");

  return (
    <View>
      <Text style={styles.h1}>{title}</Text>

      {!!latin && <Text style={styles.latin}>{latin}</Text>}

      {!!locationName && <Text style={styles.sub}>{locationName}</Text>}

      <View style={styles.infoGrid}>
        {[
          {
            icon: "calendar",
            label: tr("plantDetails.info.purchased", "Purchased"),
            value: purchaseValue,
          },
          {
            icon: "note-edit-outline",
            label: tr("plantDetails.info.notes", "Notes"),
            value: notesValue,
          },
          {
            icon: "white-balance-sunny",
            label: tr("plantDetails.info.light", "Light"),
            value: lightValue,
          },
          {
            icon: "compass-outline",
            label: tr("plantDetails.info.orientation", "Orientation"),
            value: orientationValue,
          },
          {
            icon: "tape-measure",
            label: tr("plantDetails.info.distance", "Distance"),
            value: distanceValue,
          },
          {
            icon: "pot-outline",
            label: tr("plantDetails.info.pot", "Pot"),
            value: potValue,
          },
          {
            icon: "shovel",
            label: tr("plantDetails.info.soil", "Soil"),
            value: soilValue,
          },
        ].map((it, i) => (
          <View key={i} style={styles.infoRow}>
            <MaterialCommunityIcons
              name={it.icon as any}
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.infoLabel}>{it.label}:</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {it.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { color: "#FFFFFF", fontWeight: "800", fontSize: 20, marginBottom: 6 },
  latin: {
    color: "rgba(255,255,255,0.9)",
    fontStyle: "italic",
    fontWeight: "600",
    fontSize: 12,
    marginBottom: 4,
  },
  sub: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    fontSize: 12,
    marginBottom: 10,
  },
  infoGrid: { gap: 8, marginTop: 6 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoLabel: { color: "#FFFFFF", fontWeight: "800", marginRight: 6 },
  infoValue: {
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
    flex: 1,
  },
});
