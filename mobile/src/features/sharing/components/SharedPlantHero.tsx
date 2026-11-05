import React, { useEffect, useState } from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from '../../../shared/theme/native';
import type { ImageSourcePropType } from 'react-native';
import PlantDescriptionSurface from '../../../shared/ui/PlantDescriptionSurface';
import MaterialCommunityIcons from '../../../shared/theme/Icon';
import { useTranslation } from 'react-i18next';
import { getPlantPhotoUri } from '../../../shared/utils/photoStorage';
import type { ShareablePlant } from '../types/sharing.types';
import { usePlantPhoto } from '../../../shared/hooks/usePlantPhoto';
import FramedPlantImage from '../../../shared/ui/FramedPlantImage';
import CenteredSpinner from '../../../shared/ui/CenteredSpinner';
import { normalizePhotoFraming } from '../../../shared/utils/photoFraming';

const previewImages = {
  pothos: require('../assets/pothos.jpg'),
  monstera: require('../assets/monstera.jpg'),
  peaceLily: require('../assets/peace-lily.jpg'),
};

export default function SharedPlantHero({
  plant,
  preferLocalPhoto = false,
  action,
  expiresAt,
}: {
  plant: ShareablePlant;
  preferLocalPhoto?: boolean;
  action?: React.ReactNode;
  expiresAt?: string;
}) {
  const { t } = useTranslation();
  const [localPhoto, setLocalPhoto] = useState<{
    plantId: string;
    uri: string | null;
  } | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const photoVariant =
    normalizePhotoFraming(plant.photo?.framing).zoom > 1
      ? 'display'
      : 'thumbnail';
  const { uri: syncedPhotoUri, loading: photoLoading } = usePlantPhoto(
    plant.photo,
    { variant: photoVariant, expiresAt },
  );
  const needsLocalPhoto =
    !plant.photo && preferLocalPhoto && /^[1-9]\d*$/.test(plant.id);
  const localPhotoLoading = needsLocalPhoto && localPhoto?.plantId !== plant.id;
  useEffect(() => {
    let active = true;
    if (!preferLocalPhoto || plant.photo || !/^[1-9]\d*$/.test(plant.id)) {
      setLocalPhoto(null);
      return;
    }
    getPlantPhotoUri(plant.id)
      .then(uri => {
        if (active) setLocalPhoto({ plantId: plant.id, uri });
      })
      .catch(() => {
        if (active) setLocalPhoto({ plantId: plant.id, uri: null });
      });
    return () => {
      active = false;
    };
  }, [plant.id, plant.photo?.id, preferLocalPhoto]);

  const localUri =
    !plant.photo && preferLocalPhoto && localPhoto?.plantId === plant.id
      ? localPhoto.uri
      : undefined;
  const imageUri = plant.photo
    ? syncedPhotoUri
    : localPhotoLoading
    ? undefined
    : localUri || plant.imageUrl?.trim();
  const sourceKey = imageUri || plant.previewImage || 'none';
  let source: ImageSourcePropType | undefined = imageUri
    ? { uri: imageUri }
    : !plant.photo && !localPhotoLoading && plant.previewImage
    ? previewImages[plant.previewImage]
    : undefined;
  if (failedSource === sourceKey) source = undefined;

  return (
    <View style={styles.outer}>
      <View style={styles.clip}>
        <View style={styles.photo} pointerEvents="none">
          {source ? (
            syncedPhotoUri && plant.photo ? (
              <FramedPlantImage
                testID="shared-plant-image"
                uri={syncedPhotoUri}
                photo={plant.photo}
                style={StyleSheet.absoluteFill}
                onError={() => setFailedSource(sourceKey)}
              />
            ) : (
              <ImageBackground
                testID="shared-plant-image"
                source={source}
                resizeMode="cover"
                style={StyleSheet.absoluteFill}
                onError={() => setFailedSource(sourceKey)}
              />
            )
          ) : (plant.photo && photoLoading) || localPhotoLoading ? (
            <View
              style={styles.placeholder}
              testID="shared-plant-photo-loading"
            >
              <CenteredSpinner size={26} />
            </View>
          ) : (
            <View style={styles.placeholder}>
              <MaterialCommunityIcons
                name="image-off-outline"
                size={27}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.noImageText}>
                {t('plantDetails.info.noImage', { defaultValue: 'No image' })}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.imageSpace} />
        <View style={styles.panel} testID="shared-plant-description">
          <PlantDescriptionSurface />
          <View style={styles.text}>
            <Text style={styles.name}>{plant.name}</Text>
            {!!plant.latin && <Text style={styles.latin}>{plant.latin}</Text>}
            {!!plant.location && (
              <View style={styles.locationRow}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.location}>{plant.location}</Text>
              </View>
            )}
          </View>
          {!!action && <View style={styles.action}>{action}</View>}
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  outer: { marginHorizontal: -18, marginTop: -18, marginBottom: 4 },
  clip: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  photo: { ...StyleSheet.absoluteFillObject },
  imageSpace: { height: 140 },
  panel: {
    marginTop: -26,
    minHeight: 90,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  action: { position: 'absolute', top: 12, right: 12 },
  text: {
    paddingLeft: 18,
    paddingRight: 58,
    paddingTop: 14,
    paddingBottom: 12,
  },
  name: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginBottom: 2 },
  latin: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  location: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  placeholder: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  noImageText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
});
