// PlantInfoTile.tsx
import React, { useCallback, useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, ImageBackground, Pressable, Alert } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useNavigation } from "@react-navigation/native";

import type { ApiPlantInstanceDetailFull } from "../../plants/types/plants.types";

import PlantInfoMenu from "./PlantInfoMenu";
import ChangePlantImageModal from "./modals/ChangePlantImageModal";

type Props = {
  plant?: ApiPlantInstanceDetailFull | null;
  collapseMenusSignal?: number;
  onOpenDefinition?: (plantDefinitionId: number) => void;
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
  return <ImageBackground source={{ uri }} resizeMode="cover" style={StyleSheet.absoluteFillObject} />;
}

export default function PlantInfoTile({ plant, collapseMenusSignal, onOpenDefinition }: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const nav = useNavigation<any>();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [changeImgModalVisible, setChangeImgModalVisible] = useState(false);

  const toggleMenu = () => setMenuOpen((v) => !v);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [collapseMenusSignal]);

  if (!plant) {
    return (
      <View>
        <Text style={styles.h1}>{tr("plantDetails.info.loading", "Loading…")}</Text>
      </View>
    );
  }

  const title =
    plant.display_name ||
    plant.plant_definition?.name ||
    tr("plantDetails.info.fallbackTitle", `Plant #${plant.id}`, { id: plant.id });

  const latin = plant.plant_definition?.latin || "";
  const locationName = plant.location?.name || "";

  const imageUrl = useMemo(() => {
    const pd: any = plant.plant_definition;
    return pd?.image || pd?.image_thumb || null;
  }, [plant.plant_definition]);

  const lightValue = plant.light_level
    ? tr(`createPlant.step04.lightLevels.${String(plant.light_level)}.label`, String(plant.light_level))
    : tr("plantDetails.common.dash", "—");

  const oKey = normalizeOrientationKey(plant.orientation);
  const orientationValue = oKey
    ? tr(`plantDetails.info.orientations.${oKey}`, tr(`createPlant.step04.orientations.${oKey}.label`, oKey))
    : tr("plantDetails.common.dash", "—");

  const potValue = plant.pot_material
    ? tr(`createPlant.step05.potMaterials.${String(plant.pot_material)}.label`, String(plant.pot_material))
    : tr("plantDetails.common.dash", "—");

  const soilValue = plant.soil_mix
    ? tr(`createPlant.step05.soilMixes.${String(plant.soil_mix)}.label`, String(plant.soil_mix))
    : tr("plantDetails.common.dash", "—");

  const purchaseValue = plant.purchase_date || tr("plantDetails.common.dash", "—");
  const notesValue = plant.notes || tr("plantDetails.common.dash", "—");

  const distanceValue =
    (plant.distance_cm ?? tr("plantDetails.common.dash", "—")) +
    (plant.distance_cm != null ? ` ${tr("plantDetails.info.cm", "cm")}` : "");

  const plantDefinitionId =
    (plant.plant_definition?.id ?? plant.plant_definition_id) != null
      ? Number(plant.plant_definition?.id ?? plant.plant_definition_id)
      : null;

  const plantDefinitionIdSafe =
    Number.isFinite(plantDefinitionId as any) ? (plantDefinitionId as number) : null;

  const DOTS_TOP = 10;
  const DOTS_RIGHT = 10;
  const MENU_LIFT = 10;

  return (
    <View style={[styles.root, menuOpen && styles.rootRaised]}>
      <View style={styles.heroOuter}>
        <View style={styles.heroClip}>
          {imageUrl ? (
            <View style={styles.heroImage}>
              {/* ✅ Less pronounced fade (still disappears into glass, but later/softer) */}
              <MaskedView
                style={StyleSheet.absoluteFill}
                maskElement={
                  <LinearGradient
                    colors={[
                      "rgba(0,0,0,1.00)",
                      "rgba(0,0,0,0.92)",
                      "rgba(0,0,0,0.75)",
                      "rgba(0,0,0,0.50)",
                      "rgba(0,0,0,0.22)",
                      "rgba(0,0,0,0.00)",
                    ]}
                    locations={[0, 0.10, 0.45, 0.68, 0.88, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                }
              >
                <ImageMasked uri={imageUrl} />
              </MaskedView>

              {/* ✅ OPTIONAL top-only scrim for readability (does not affect bottom fade) */}
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(0,0,0,0.22)", "rgba(0,0,0,0.00)"]}
                locations={[0, 1]}
                style={styles.heroTopScrim}
              />

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
                      name="map-marker-outline"
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
              <MaterialCommunityIcons name="image-off-outline" size={24} color="rgba(255,255,255,0.9)" />
              <Text style={styles.noImageText}>{tr("plantDetails.info.noImage", "No image")}</Text>
            </View>
          )}
        </View>

        {menuOpen && (
          <View style={styles.menuOverlay} pointerEvents="box-none">
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />

            <View
              style={[styles.menuSheetPos, { top: DOTS_TOP - MENU_LIFT, right: DOTS_RIGHT }]}
              pointerEvents="box-none"
            >
              <PlantInfoMenu
                onPlantDefinition={() => {
                  closeMenu();
                  if (plantDefinitionIdSafe != null) {
                    onOpenDefinition?.(plantDefinitionIdSafe);
                  } else {
                    Alert.alert(tr("plantDetailsModals.definition.noId", "No plant definition id found."));
                  }
                }}
                onEditPlant={() => {
                  closeMenu();
                  // ✅ NEW: open EditPlantModal on Plants tab for this plant id
                  nav.navigate("Plants", { editPlantId: String(plant.id) });
                }}
                onChangeImage={() => {
                  closeMenu();
                  requestAnimationFrame(() => setChangeImgModalVisible(true));
                }}
                onShowReminders={() => {
                  closeMenu();
                  nav.navigate("Reminders" as never, { plantId: String(plant.id) } as never);
                }}
              />
            </View>
          </View>
        )}

        {!menuOpen && (
          <View style={[styles.dotsAnchor, { top: DOTS_TOP, right: DOTS_RIGHT }]} pointerEvents="box-none">
            <Pressable
              onPress={toggleMenu}
              style={styles.menuBtn}
              android_ripple={{ color: "rgba(255,255,255,0.16)", borderless: true }}
              hitSlop={10}
            >
              <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </View>

      <View style={{ marginTop: 10 }}>
        <View style={styles.infoGrid}>
          {[
            { icon: "calendar", label: tr("plantDetails.info.purchased", "Purchased"), value: purchaseValue },
            { icon: "note-edit-outline", label: tr("plantDetails.info.notes", "Notes"), value: notesValue },
            { icon: "white-balance-sunny", label: tr("plantDetails.info.light", "Light"), value: lightValue },
            { icon: "compass-outline", label: tr("plantDetails.info.orientation", "Orientation"), value: orientationValue },
            { icon: "tape-measure", label: tr("plantDetails.info.distance", "Distance"), value: distanceValue },
            { icon: "pot-outline", label: tr("plantDetails.info.pot", "Pot"), value: potValue },
            { icon: "shovel", label: tr("plantDetails.info.soil", "Soil"), value: soilValue },
          ].map((it, i) => (
            <View key={i} style={styles.infoRow}>
              <MaterialCommunityIcons name={it.icon as any} size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.infoLabel}>{it.label}:</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {it.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ChangePlantImageModal visible={changeImgModalVisible} onClose={() => setChangeImgModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "relative", zIndex: 1, elevation: 1 },
  rootRaised: { zIndex: 60, elevation: 60 },

  heroOuter: {
    marginLeft: -16,
    marginRight: -16,
    marginTop: -16,
    position: "relative",
    overflow: "visible",
  },

  heroClip: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },

  // Keep transparent: do NOT set backgroundColor, do NOT add heroShade (image must "disappear")
  heroImage: { width: "100%", aspectRatio: 1.6, justifyContent: "flex-end" },

  heroTopScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 70,
  },

  heroText: { paddingHorizontal: 16, paddingBottom: 14 },

  dotsAnchor: {
    position: "absolute",
    zIndex: 220,
    elevation: 220,
    overflow: "visible",
  },
  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.20)",
  },

  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 200,
    overflow: "visible",
  },
  menuSheetPos: {
    position: "absolute",
    alignItems: "flex-end",
    overflow: "visible",
    zIndex: 210,
    elevation: 210,
  },

  h1: { color: "#FFFFFF", fontWeight: "800", fontSize: 22, marginBottom: 6 },
  latin: {
    color: "rgba(255,255,255,0.92)",
    fontStyle: "italic",
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 8,
  },
  locRow: { flexDirection: "row", alignItems: "center" },
  sub: { color: "rgba(255,255,255,0.92)", fontWeight: "700", fontSize: 13 },

  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  noImageText: { color: "rgba(255,255,255,0.9)", fontWeight: "700", marginTop: 8 },

  infoGrid: { gap: 8, marginTop: 6 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoLabel: { color: "#FFFFFF", fontWeight: "800", marginRight: 6 },
  infoValue: { color: "rgba(255,255,255,0.95)", fontWeight: "600", flex: 1 },
});
