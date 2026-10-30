import React from "react";
import { View, Pressable, Text, StyleSheet, ImageBackground } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { s } from "../styles/plants.styles";
import { Plant } from "../types/plants.types";
import PlantMenu from "./PlantMenu";
import SharedPlantBadge from "../../../shared/ui/SharedPlantBadge";
import { plantAccess, SHARED_PLANT_TINT } from "../../../shared/utils/plantAccess";
import { useSharingPreview } from "../../sharing/state/SharingPreviewProvider";
import { usePlantPhoto } from "../../../shared/hooks/usePlantPhoto";

type Props = {
  plant: Plant;
  isMenuOpen: boolean;
  onPressBody: () => void;
  onPressMenu: () => void;
  onDetails: () => void;
  onEdit: () => void;
  onReminders: () => void;
  onJournal: () => void;
  onDelete: () => void;
  onShowQr: () => void;
};

const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

export default function PlantTile({
  plant,
  isMenuOpen,
  onPressBody,
  onPressMenu,
  onDetails,
  onEdit,
  onReminders,
  onJournal,
  onDelete,
  onShowQr,
}: Props) {
  const { openSharePlant, shares } = useSharingPreview();
  const { uri: syncedPhotoUri } = usePlantPhoto(plant.photo, { variant: "thumbnail", expiresAt: plant.access?.expires_at });
  const imgUri = syncedPhotoUri || plant.imageUrl;
  const access = plantAccess(plant.access);

  const handleTilePress = () => {
    onPressBody();
    onPressMenu();
  };

  return (
    <View style={[s.cardWrap, isMenuOpen && s.cardWrapRaised]}>
      <View style={s.cardGlass}>
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={[
            "rgba(255, 255, 255, 0.06)",
            "rgba(255, 255, 255, 0.02)",
            "rgba(255, 255, 255, 0.08)",
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View pointerEvents="none" style={s.plantImageEdge}>
          <MaskedView
            style={StyleSheet.absoluteFill}
            maskElement={
              <LinearGradient
                colors={[
                  "rgba(0,0,0,1.00)",
                  "rgba(0,0,0,0.82)",
                  "rgba(0,0,0,0.64)",
                  "rgba(0,0,0,0.42)",
                  "rgba(0,0,0,0.18)",
                  "rgba(0,0,0,0.00)",
                  "rgba(0,0,0,0.00)",
                ]}
                locations={[0, 0.14, 0.28, 0.44, 0.58, 0.66, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            }
          >
            {imgUri ? (
              <ImageBackground
                source={{ uri: imgUri }}
                resizeMode="cover"
                style={s.plantImageShifted}
              />
            ) : (
              <View style={s.plantImagePlaceholder}>
                <MaterialCommunityIcons
                  name="image-off-outline"
                  size={26}
                  color="rgba(255,255,255,0.92)"
                />
              </View>
            )}
          </MaskedView>

          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0.20)", "rgba(0,0,0,0.00)"]}
            locations={[0, 1]}
            style={s.plantImageTopScrim}
          />
        </View>

        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(255,255,255,0.04)",
            "rgba(255,255,255,0.08)",
            "rgba(255,255,255,0.14)",
            "rgba(255,255,255,0.14)",
          ]}
          locations={[0, 0.42, 0.58, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={s.cardImageTint}
        />

        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: 28,
              borderWidth: 0,
              borderColor: "rgba(255,255,255,0.08)",
              zIndex: 2,
            },
          ]}
        />

        {access.isShared && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: SHARED_PLANT_TINT }]} />}
        <View style={s.cardRow}>
          <Pressable
            style={s.cardBodyPressable}
            onPress={handleTilePress}
            android_ripple={{ color: "rgba(255,255,255,0.08)" }}
          >
            <View style={s.plantTextCol}>
              <Text style={s.plantName} numberOfLines={1}>
                {plant.name}
              </Text>
              <SharedPlantBadge access={plant.access} compact />

              {!!plant.latin && (
                <Text style={s.latin} numberOfLines={1}>
                  {plant.latin}
                </Text>
              )}

              {!!plant.location && (
                <View style={s.locationRow}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={12}
                    color="#FFFFFF"
                    style={s.locationIcon}
                  />
                  <Text style={s.location} numberOfLines={1}>
                    {plant.location}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>
      </View>

      {isMenuOpen && (
        <PlantMenu
          canEdit={access.canEdit}
          onDetails={onDetails}
          onEdit={onEdit}
          onReminders={onReminders}
          onJournal={onJournal}
          onDelete={onDelete}
          onShowQr={onShowQr}
          sharingActive={shares.some((share) => share.direction === "outgoing" && share.plant.id === String(plant.id))}
          onShare={() => {
            onPressMenu();
            openSharePlant({ id: String(plant.id), name: plant.name, location: plant.location, latin: plant.latin, imageUrl: plant.imageUrl, photo: plant.photo });
          }}
        />
      )}
    </View>
  );
}
