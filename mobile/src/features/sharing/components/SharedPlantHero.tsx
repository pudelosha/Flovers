import React, { useEffect, useState } from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { getPlantPhotoUri } from "../../../shared/utils/photoStorage";
import type { ShareablePlant } from "../types/sharing.types";

const previewImages = {
  pothos: require("../assets/pothos.jpg"),
  monstera: require("../assets/monstera.jpg"),
  peaceLily: require("../assets/peace-lily.jpg"),
};

export default function SharedPlantHero({ plant, preferLocalPhoto = false }: {
  plant: ShareablePlant;
  preferLocalPhoto?: boolean;
}) {
  const { t } = useTranslation();
  const [localPhoto, setLocalPhoto] = useState<{ plantId: string; uri: string } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!preferLocalPhoto || !/^[1-9]\d*$/.test(plant.id)) {
      setLocalPhoto(null);
      return;
    }
    getPlantPhotoUri(plant.id).then((uri) => {
      if (active) setLocalPhoto(uri ? { plantId: plant.id, uri } : null);
    }).catch(() => {
      if (active) setLocalPhoto(null);
    });
    return () => { active = false; };
  }, [plant.id, preferLocalPhoto]);

  const localUri = preferLocalPhoto && localPhoto?.plantId === plant.id ? localPhoto.uri : undefined;
  const imageUri = localUri || plant.imageUrl?.trim();
  const sourceKey = imageUri || plant.previewImage || "none";
  let source: ImageSourcePropType | undefined = imageUri
    ? { uri: imageUri }
    : plant.previewImage ? previewImages[plant.previewImage] : undefined;
  if (failedSource === sourceKey) source = undefined;

  return (
    <View style={styles.outer}>
      <View style={styles.clip}>
        <View style={styles.hero}>
          {source ? <>
            <MaskedView style={StyleSheet.absoluteFill} maskElement={
              <LinearGradient colors={["rgba(0,0,0,1)", "rgba(0,0,0,0.92)", "rgba(0,0,0,0.68)", "rgba(0,0,0,0.28)", "rgba(0,0,0,0)"]}
                locations={[0, 0.25, 0.55, 0.8, 1]} style={StyleSheet.absoluteFill} />
            }>
              <ImageBackground testID="shared-plant-image" source={source} resizeMode="cover" style={StyleSheet.absoluteFill}
                onError={() => setFailedSource(sourceKey)} />
            </MaskedView>
            <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.18)", "rgba(0,0,0,0)"]}
              style={styles.topScrim} />
          </> : <View style={styles.noImage}>
            <MaterialCommunityIcons name="image-off-outline" size={27} color="rgba(255,255,255,0.8)" />
            <Text style={styles.noImageText}>{t("plantDetails.info.noImage", { defaultValue: "No image" })}</Text>
          </View>}
          <View style={styles.text}>
            <Text style={styles.name}>{plant.name}</Text>
            {!!plant.latin && <Text style={styles.latin}>{plant.latin}</Text>}
            {!!plant.location && <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color="#FFFFFF" />
              <Text style={styles.location}>{plant.location}</Text>
            </View>}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { marginHorizontal: -18, marginTop: -18, marginBottom: 4 },
  clip: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden" },
  hero: { width: "100%", aspectRatio: 1.8, justifyContent: "flex-end" },
  topScrim: { position: "absolute", top: 0, left: 0, right: 0, height: 55 },
  text: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 },
  name: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginBottom: 5 },
  latin: { color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: "700", fontStyle: "italic", marginBottom: 8 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  location: { color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: "700", flexShrink: 1 },
  noImage: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "flex-start", paddingTop: 22 },
  noImageText: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 6 },
});
