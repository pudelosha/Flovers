import React, { useEffect, useState } from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  ImageBackground,
} from '../../../shared/theme/native';
import PlantDescriptionSurface from '../../../shared/ui/PlantDescriptionSurface';
import MaterialCommunityIcons from '../../../shared/theme/Icon';
import { useTranslation } from 'react-i18next';
import type { Plant } from '../types/plants.types';
import PlantMenu from './PlantMenu';
import FramedPlantImage from '../../../shared/ui/FramedPlantImage';
import CenteredSpinner from '../../../shared/ui/CenteredSpinner';
import { plantAccess } from '../../../shared/utils/plantAccess';
import { useSharingPreview } from '../../sharing/state/SharingPreviewProvider';
import { usePlantPhoto } from '../../../shared/hooks/usePlantPhoto';
import {
  PHOTO_DETAILS_ASPECT_RATIO,
  PHOTO_PLANTS_GRID_ASPECT_RATIO,
  normalizePhotoFraming,
} from '../../../shared/utils/photoFraming';
type Props = {
  plant: Plant;
  menuAlign?: 'left' | 'right';
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
  menuAlign = 'right',
}: Props) {
  const { t } = useTranslation();
  const { openSharePlant, shares } = useSharingPreview();
  const photoVariant =
    normalizePhotoFraming(plant.photo?.framing).zoom > 1
      ? 'display'
      : 'thumbnail';
  const { uri: syncedPhotoUri, loading: photoLoading } = usePlantPhoto(
    plant.photo,
    { variant: photoVariant, expiresAt: plant.access?.expires_at },
  );
  const imgUri = plant.photo ? syncedPhotoUri : plant.imageUrl;
  const imageKey = `${plant.id}:${imgUri || ''}`;
  const [decodedImage, setDecodedImage] = useState<string | null>(null);
  const [panelLaidOut, setPanelLaidOut] = useState(false);
  const [presentedImage, setPresentedImage] = useState<string | null>(null);
  const imageReady = imgUri
    ? decodedImage === imageKey
    : !photoLoading;

  useEffect(() => {
    if (!imageReady || !panelLaidOut) return;
    // Let the native gradient/mask finish painting before revealing the card.
    let secondFrame: number | undefined;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setPresentedImage(imageKey));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
    };
  }, [imageKey, imageReady, panelLaidOut]);
  const cardReady = imageReady && presentedImage === imageKey;
  const access = plantAccess(plant.access);
  const label = [
    plant.name,
    plant.latin,
    plant.location,
    access.isShared
      ? t('sharing.access.shared', { defaultValue: 'Shared' })
      : null,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <View style={[grid.wrap, isMenuOpen && { zIndex: 50 }]}>
      <Pressable
        testID="plant-tile-body"
        style={[grid.body, { opacity: cardReady ? 1 : 0 }]}
        pointerEvents={cardReady ? 'auto' : 'none'}
        accessibilityElementsHidden={!cardReady}
        importantForAccessibility={cardReady ? 'auto' : 'no-hide-descendants'}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: isMenuOpen }}
        onPress={() => {
          onPressBody();
          onPressMenu();
        }}
      >
        <View style={grid.photoBackground} pointerEvents="none">
          {syncedPhotoUri && plant.photo ? (
            <FramedPlantImage
              uri={syncedPhotoUri}
              photo={plant.photo}
              style={StyleSheet.absoluteFillObject}
              testID="plant-tile-photo"
              onLoad={() => setDecodedImage(imageKey)}
              onError={() => setDecodedImage(imageKey)}
            />
          ) : plant.photo && photoLoading ? (
            <View style={grid.placeholder} testID="plant-tile-photo-loading">
              <CenteredSpinner size={24} />
            </View>
          ) : imgUri ? (
            <ImageBackground
              key={imageKey}
              source={{ uri: imgUri }}
              onLoad={() => setDecodedImage(imageKey)}
              onError={() => setDecodedImage(imageKey)}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={grid.placeholder}>
              <MaterialCommunityIcons
                name="image-off-outline"
                size={28}
                color="#FFFFFF"
              />
            </View>
          )}
        </View>
        <View style={grid.image} pointerEvents="none" />
        <View style={grid.panel} testID="plant-tile-description"
          onLayout={() => setPanelLaidOut(true)}>
          <PlantDescriptionSurface />
          <View style={grid.titleRow}>
            <Text style={grid.name} numberOfLines={1}>
              {plant.name}
            </Text>
            {access.isShared && (
              <MaterialCommunityIcons
                name="account-multiple-outline"
                size={13}
                color="#BDE4F6"
                accessibilityLabel={String(
                  t('sharing.access.shared', { defaultValue: 'Shared' }),
                )}
              />
            )}
          </View>
          <Text style={grid.latin} numberOfLines={1}>
            {plant.latin || ' '}
          </Text>
          <View style={grid.locationRow}>
            {!!plant.location && (
              <MaterialCommunityIcons
                name="map-marker"
                size={12}
                color="#FFFFFF"
              />
            )}
            <Text style={grid.location} numberOfLines={1}>
              {plant.location || ' '}
            </Text>
          </View>
        </View>
      </Pressable>
      {isMenuOpen && (
        <PlantMenu
          canEdit={access.canEdit}
          align={menuAlign}
          onDetails={onDetails}
          onEdit={onEdit}
          onReminders={onReminders}
          onJournal={onJournal}
          onDelete={onDelete}
          onShowQr={onShowQr}
          sharingActive={shares.some(
            share =>
              share.direction === 'outgoing' &&
              share.plant.id === String(plant.id),
          )}
          onShare={() => {
            onPressMenu();
            openSharePlant({
              id: String(plant.id),
              name: plant.name,
              location: plant.location,
              latin: plant.latin,
              imageUrl: plant.imageUrl,
              photo: plant.photo,
            });
          }}
        />
      )}
    </View>
  );
}

const grid = StyleSheet.create({
  wrap: { position: 'relative', overflow: 'visible', borderRadius: 22 },
  body: { borderRadius: 22, overflow: 'hidden' },
  photoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: PHOTO_DETAILS_ASPECT_RATIO,
    backgroundColor: '#244C40',
  },
  image: { width: '100%', aspectRatio: PHOTO_PLANTS_GRID_ASPECT_RATIO },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    marginTop: -26,
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 8,
    minHeight: 76,
    boxShadow: '0px -2px 6px rgba(0, 0, 0, 0.16)',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  latin: {
    fontSize: 11,
    lineHeight: 15,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  location: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
});
