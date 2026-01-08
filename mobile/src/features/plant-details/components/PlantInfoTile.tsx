import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";

import type { ApiPlantInstanceDetailFull } from "../../plants/types/plants.types";

type Props = {
  plant: ApiPlantInstanceDetailFull;
};

function normalizeOrientationKey(v: any): "N" | "E" | "S" | "W" | null {
  if (!v) return null;
  const raw = String(v).trim().toUpperCase();
  if (raw === "N" || raw === "NORTH") return "N";
  if (raw === "E" || raw === "EAST") return "E";
  if (raw === "S" || raw === "SOUTH") return "S";
  if (raw === "W" || raw === "WEST") return "W";
  return null;
}

function ImageMasked({ uri }: { uri: string }) {
  return (
    <ImageBackground
      source={{ uri }}
      resizeMode="cover"
      style={StyleSheet.absoluteFillObject}
    />
  );
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

  // Prefer hero image, fallback to thumb (backend returns absolute URLs)
  const imageUrl = useMemo(() => {
    const pd: any = plant.plant_definition;
    return pd?.image || pd?.image_thumb || null;
  }, [plant.plant_definition]);

  const lightValue = plant.light_level
    ? tr(
        `createPlant.step04.lightLevels.${String(plant.light_level)}.label`,
        String(plant.light_level)
      )
    : tr("plantDetails.common.dash", "—");

  const oKey = normalizeOrientationKey(plant.orientation);
  const orientationValue = oKey
    ? tr(
        `plantDetails.info.orientations.${oKey}`,
        tr(`createPlant.step04.orientations.${oKey}.label`, oKey)
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
      {/* HERO IMAGE that aggressively fades out (background "consumes" it early) */}
      <View style={styles.heroWrap}>
        {imageUrl ? (
          <View style={styles.heroImage}>
            <MaskedView
              style={StyleSheet.absoluteFill}
              maskElement={
                <LinearGradient
                  // More aggressive alpha ramp:
                  // - by ~6–10% you already see some transparency
                  // - by ~35% it's clearly fading
                  // - by ~60–70% it's mostly gone
                  colors={[
                    "rgba(0,0,0,1.00)", // 0%  fully visible
                    "rgba(0,0,0,0.88)", // ~8% already slightly transparent
                    "rgba(0,0,0,0.60)", // ~30% noticeable fade
                    "rgba(0,0,0,0.22)", // ~58% heavy fade
                    "rgba(0,0,0,0.00)", // 100% fully transparent
                  ]}
                  locations={[0, 0.08, 0.60, 0.8, 1]}
                  style={StyleSheet.absoluteFill}
                />
              }
            >
              <ImageMasked uri={imageUrl} />
            </MaskedView>

            {/* Keep this subtle; too dark makes fade look like a dark band */}
            <View pointerEvents="none" style={styles.heroShade} />

            {/* Title block stays in image area */}
            <View style={styles.heroText}>
              <Text style={styles.h1} numberOfLines={1}>
                {title}
              </Text>

              {!!latin && (
                <Text style={styles.latin} numberOfLines={1}>
                  {latin}
                </Text>
              )}

              {!!locationName && (
                <View style={styles.locRow}>
                  <MaterialCommunityIcons
                    name="home-variant-outline"
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 8, opacity: 0.95 }}
                  />
                  <Text style={styles.sub} numberOfLines={1}>
                    {locationName}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <MaterialCommunityIcons
              name="image-off-outline"
              size={24}
              color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.noImageText}>
              {tr("plantDetails.info.noImage", "No image")}
            </Text>
          </View>
        )}
      </View>

      {/* DETAILS BELOW IMAGE */}
      <View style={{ marginTop: 10 }}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  // HERO
  heroWrap: {
    marginLeft: -16,
    marginRight: -16,
    marginTop: -16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    aspectRatio: 1.6,
    justifyContent: "flex-end",
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  heroText: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  // Title texts (inside image)
  h1: { color: "#FFFFFF", fontWeight: "800", fontSize: 22, marginBottom: 6 },
  latin: {
    color: "rgba(255,255,255,0.92)",
    fontStyle: "italic",
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 8,
  },
  locRow: { flexDirection: "row", alignItems: "center" },
  sub: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "700",
    fontSize: 13,
  },

  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  noImageText: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
    marginTop: 8,
  },

  // DETAILS
  infoGrid: { gap: 8, marginTop: 6 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoLabel: { color: "#FFFFFF", fontWeight: "800", marginRight: 6 },
  infoValue: { color: "rgba(255,255,255,0.95)", fontWeight: "600", flex: 1 },
});
