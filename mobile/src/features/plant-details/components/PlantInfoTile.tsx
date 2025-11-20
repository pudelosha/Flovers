// C:\Projekty\Python\Flovers\mobile\src\features\plant-details\components\PlantInfoTile.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import type { ApiPlantInstanceDetailFull } from "../../plants/types/plants.types";

type Props = {
  plant: ApiPlantInstanceDetailFull;
};

export default function PlantInfoTile({ plant }: Props) {
  const title =
    plant.display_name ||
    plant.plant_definition?.name ||
    `Plant #${plant.id}`;

  const latin = plant.plant_definition?.latin || "";
  const locationName = plant.location?.name || "";

  return (
    <View>
      <Text style={styles.h1}>{title}</Text>

      {!!latin && <Text style={styles.latin}>{latin}</Text>}

      {!!locationName && <Text style={styles.sub}>{locationName}</Text>}

      <View style={styles.infoGrid}>
        {[
          {
            icon: "calendar",
            label: "Purchased",
            value: plant.purchase_date || "—",
          },
          {
            icon: "note-edit-outline",
            label: "Notes",
            value: plant.notes || "—",
          },
          {
            icon: "white-balance-sunny",
            label: "Light",
            value: plant.light_level || "—",
          },
          {
            icon: "compass-outline",
            label: "Orientation",
            value: plant.orientation || "—",
          },
          {
            icon: "tape-measure",
            label: "Distance",
            value:
              (plant.distance_cm ?? "—") +
              (plant.distance_cm != null ? " cm" : ""),
          },
          {
            icon: "pot-outline",
            label: "Pot / Soil",
            value:
              [plant.pot_material, plant.soil_mix]
                .filter(Boolean)
                .join(" • ") || "—",
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
