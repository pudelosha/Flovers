import React from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  ImageBackground,
} from '../../../shared/theme/native';
import { useAppTheme } from '../../../shared/theme/ThemeContext';
import LinearGradient from '../../../shared/theme/Gradient';
import MaskedView from '../../../shared/theme/MaskedView';
import MaterialCommunityIcons from '../../../shared/theme/Icon';
import { useTranslation } from 'react-i18next';
import type { Plant } from '../types/plants.types';
import PlantMenu from './PlantMenu';
import FramedPlantImage from '../../../shared/ui/FramedPlantImage';
import CenteredSpinner from '../../../shared/ui/CenteredSpinner';
import { plantAccess } from '../../../shared/utils/plantAccess';
import { useSharingPreview } from '../../sharing/state/SharingPreviewProvider';
import { usePlantPhoto } from '../../../shared/hooks/usePlantPhoto';
import { normalizePhotoFraming } from '../../../shared/utils/photoFraming';
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
  const { isLight } = useAppTheme();
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
        style={grid.body}
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
            />
          ) : plant.photo && photoLoading ? (
            <View style={grid.placeholder} testID="plant-tile-photo-loading">
              <CenteredSpinner size={24} />
            </View>
          ) : imgUri ? (
            <ImageBackground
              source={{ uri: imgUri }}
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
        <View style={grid.panel} testID="plant-tile-description">
          {isLight ? (
            <LinearGradient
              themeRole="photo"
              pointerEvents="none"
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              colors={[
                'rgba(248,252,250,0.80)',
                'rgba(248,252,250,0.92)',
                '#F8FCFA',
                '#F8FCFA',
              ]}
              locations={[0, 0.25, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <MaskedView
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              maskElement={
                <LinearGradient
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  colors={[
                    'rgba(0,0,0,0.8)',
                    'rgba(0,0,0,0.92)',
                    '#000000',
                    '#000000',
                  ]}
                  locations={[0, 0.25, 0.5, 1]}
                  style={StyleSheet.absoluteFill}
                />
              }
            >
              <LinearGradient
                pointerEvents="none"
                colors={['#31695A', '#28443B']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </MaskedView>
          )}
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#244C40',
  },
  image: { width: '100%', aspectRatio: 1.2 },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    marginTop: -26,
    paddingHorizontal: 11,
    paddingTop: 13,
    paddingBottom: 12,
    minHeight: 89,
    borderRadius: 19,
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
