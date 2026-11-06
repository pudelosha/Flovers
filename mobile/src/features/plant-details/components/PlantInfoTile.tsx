import { ThemeContrastScope } from '../../../shared/theme/ThemeContext';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
} from '../../../shared/theme/native';
import MaterialCommunityIcons from '../../../shared/theme/Icon';
import LinearGradient from '../../../shared/theme/Gradient';
import PlantDescriptionSurface from '../../../shared/ui/PlantDescriptionSurface';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../app/providers/LanguageProvider';
import { useSettings } from '../../../app/providers/SettingsProvider';
import { useNavigation } from '@react-navigation/native';

import type { ApiPlantInstanceDetailFull } from '../../plants/types/plants.types';

import PlantInfoMenu from './PlantInfoMenu';
import { useSharingPreview } from '../../sharing/state/SharingPreviewProvider';

import { getPlantPhotoUri } from '../../../shared/utils/photoStorage';
import { usePlantPhoto } from '../../../shared/hooks/usePlantPhoto';
import SharedPlantBadge from '../../../shared/ui/SharedPlantBadge';
import FramedPlantImage from '../../../shared/ui/FramedPlantImage';
import CenteredSpinner from '../../../shared/ui/CenteredSpinner';
import { PHOTO_DETAILS_ASPECT_RATIO } from '../../../shared/utils/photoFraming';
import { plantAccess } from '../../../shared/utils/plantAccess';

export type PlantDetailsTab = 'info' | 'reminders' | 'readings';

type Props = {
  activeTab?: PlantDetailsTab;
  tabContent?: React.ReactNode;
  onTabChange?: (tab: PlantDetailsTab) => void;
  onShowQr?: () => void;
  plant?: ApiPlantInstanceDetailFull | null;
  collapseMenusSignal?: number;
  onTileTouch?: () => void;

  onOpenDefinition?: (plantDefinitionId: number) => void;
  onOpenEditPlant?: (plantId: string) => void;

  /**
   * open Change Image modal at SCREEN level (parent renders modal).
   * Pass plantId as string.
   */
  onOpenChangeImage?: (plantId: string) => void;

  /**
   * when this changes, tile reloads local image from storage.
   * Parent should bump this after image change/removal.
   */
  photoReloadSignal?: number;
  onImageReadyChange?: (ready: boolean) => void;
};

function normalizeOrientationKey(v: any): 'N' | 'E' | 'S' | 'W' | null {
  if (!v) return null;
  const raw = String(v).trim().toUpperCase();
  if (raw === 'N' || raw === 'NORTH') return 'N';
  if (raw === 'E' || raw === 'EAST') return 'E';
  if (raw === 'S' || raw === 'SOUTH') return 'S';
  if (raw === 'W' || raw === 'WEST') return 'W';
  return null;
}

function ImageMasked({
  uri,
  shiftUp = false,
  onLoad,
  onError,
}: {
  uri: string;
  shiftUp?: boolean;
  onLoad: () => void;
  onError: () => void;
}) {
  return (
    <ImageBackground
      source={{ uri }}
      onLoad={onLoad}
      onError={onError}
      resizeMode="cover"
      style={[StyleSheet.absoluteFillObject, shiftUp && { top: '-12%' }]}
    />
  );
}

/** RN Image cache-buster for local file URIs */
function withCacheBuster(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const sep = uri.includes('?') ? '&' : '?';
  return `${uri}${sep}t=${Date.now()}`;
}

function cmToInches(cm: number) {
  return cm / 2.54;
}

function formatDistanceBySettings(
  cm: number | null | undefined,
  measureUnit: 'metric' | 'imperial' | undefined,
  tr: (key: string, fallback?: string, values?: any) => string,
) {
  if (cm == null) return tr('plantDetails.common.dash', '—');

  if (measureUnit === 'imperial') {
    return `${Math.round(cmToInches(cm))} ${tr('plantDetails.info.in', 'in')}`;
  }

  return `${cm} ${tr('plantDetails.info.cm', 'cm')}`;
}

/**
 * Align backend/raw values to the existing i18n structure in createPlantStep04.json.
 *
 * Supported existing keys:
 * - createPlant.step04.low
 * - createPlant.step04.high
 * - createPlant.step04.modal.levels.brightDirect
 * - createPlant.step04.modal.levels.brightIndirect
 * - createPlant.step04.modal.levels.medium
 * - createPlant.step04.modal.levels.low
 * - createPlant.step04.modal.levels.veryLow
 */
function normalizeLightLevelKey(
  v: any,
):
  | 'low'
  | 'high'
  | 'medium'
  | 'brightDirect'
  | 'brightIndirect'
  | 'veryLow'
  | null {
  if (!v) return null;

  const raw = String(v).trim();
  const x = raw.toLowerCase().replace(/[\s_-]+/g, '');

  if (x === 'low' || x === 'lowlight') return 'low';
  if (x === 'high' || x === 'highlight') return 'high';
  if (
    x === 'medium' ||
    x === 'mid' ||
    x === 'mediumlight' ||
    x === 'partialshade'
  )
    return 'medium';
  if (x === 'brightdirect' || x === 'direct') return 'brightDirect';
  if (x === 'brightindirect' || x === 'indirect') return 'brightIndirect';
  if (x === 'verylow' || x === 'verylowlight') return 'veryLow';

  return null;
}

export default function PlantInfoTile({
  plant,
  activeTab = 'info',
  tabContent,
  onTabChange,
  onShowQr,
  collapseMenusSignal,
  onTileTouch,
  onOpenDefinition,
  onOpenEditPlant,
  onOpenChangeImage,
  photoReloadSignal,
  onImageReadyChange,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();
  const [parameterTextHeights, setParameterTextHeights] = useState<Record<string, { label?: number; value?: number }>>({});
  const parameterHeight = Math.max(58, ...Object.values(parameterTextHeights).map(height => (height.label ?? 14) + (height.value ?? 17) + 20));
  const measureParameterText = (key: string, part: 'label' | 'value', height: number) => {
    const rounded = Math.ceil(height);
    setParameterTextHeights(previous => previous[key]?.[part] === rounded
      ? previous : { ...previous, [key]: { ...previous[key], [part]: rounded } });
  };

  const nav = useNavigation<any>();
  const { openSharePlant, shares } = useSharingPreview();
  const access = plantAccess(plant?.access);

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      if (typeof txt === 'string' && txt && txt !== key) return txt;
      return fallback || key.split('.').pop() || key;
    },
    [t, currentLanguage],
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [infoPanelHeight, setInfoPanelHeight] = useState(120);
  const infoFadeHeight = Math.ceil(infoPanelHeight / 3);

  // in-app prompt when plant has no definition link (matches ChangePlantImageModal confirm style)
  const [noDefinitionPromptVisible, setNoDefinitionPromptVisible] =
    useState(false);

  // local photo uri for THIS plant id
  const [loadedImageKey, setLoadedImageKey] = useState('');
  const [failedImageKey, setFailedImageKey] = useState('');
  const [localPlantPhoto, setLocalPlantPhoto] = useState<{
    key: string;
    uri: string | null;
  } | null>(null);
  const localLookupKey =
    plant?.id && access.isOwner && !plant.photo
      ? `${plant.id}:${photoReloadSignal ?? 0}`
      : null;
  const localPhotoLoading =
    !!localLookupKey && localPlantPhoto?.key !== localLookupKey;
  const { uri: syncedPhotoUri, loading: photoLoading } = usePlantPhoto(
    plant?.photo,
    {
      variant: 'display',
      reloadSignal: photoReloadSignal,
      expiresAt: plant?.access?.expires_at,
    },
  );

  const toggleMenu = () => setMenuOpen(v => !v);
  const closeMenu = () => setMenuOpen(false);
  const handleTileTouch = useCallback(() => {
    setMenuOpen(false);
    onTileTouch?.();
  }, [onTileTouch]);

  useEffect(() => {
    setMenuOpen(false);
    setNoDefinitionPromptVisible(false);
  }, [collapseMenusSignal]);

  // load/reload local image when plant changes OR parent tells us to reload
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!plant?.id || !localLookupKey) {
        setLocalPlantPhoto(null);
        return;
      }
      try {
        const uri = await getPlantPhotoUri(String(plant.id));
        if (!cancelled)
          setLocalPlantPhoto({
            key: localLookupKey,
            uri: withCacheBuster(uri),
          });
      } catch {
        if (!cancelled) setLocalPlantPhoto({ key: localLookupKey, uri: null });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [plant?.id, localLookupKey]);

  // Synced photos take precedence. An older local image belongs only to its
  // original owned plant and must never flash on another plant's details.
  const imageUrl = useMemo(() => {
    if (!plant) return null;
    if (plant.photo) return syncedPhotoUri;
    if (localPhotoLoading) return null;
    if (
      localLookupKey &&
      localPlantPhoto?.key === localLookupKey &&
      localPlantPhoto.uri
    )
      return localPlantPhoto.uri;

    const pd: any = plant.plant_definition;
    return pd?.image || pd?.image_thumb || null;
  }, [
    localPlantPhoto,
    syncedPhotoUri,
    plant,
    localLookupKey,
    localPhotoLoading,
  ]);

  const imageKey = imageUrl
    ? `${plant?.id}:${photoReloadSignal ?? 0}:${imageUrl}`
    : '';
  const imageFailed = !!imageKey && failedImageKey === imageKey;
  const imageReady =
    !localPhotoLoading &&
    !(plant?.photo && photoLoading) &&
    (!imageUrl || imageFailed || loadedImageKey === imageKey);
  useEffect(() => {
    onImageReadyChange?.(imageReady);
  }, [imageReady, onImageReadyChange]);
  const onImageLoad = () => setLoadedImageKey(imageKey);
  const onImageError = () => setFailedImageKey(imageKey);

  if (!plant) {
    return (
      <View>
        <Text style={styles.h1}>
          {tr('plantDetails.info.loading', 'Loading…')}
        </Text>
      </View>
    );
  }

  const title =
    plant.display_name ||
    plant.plant_definition?.name ||
    tr('plantDetails.info.fallbackTitle', `Plant #${plant.id}`, {
      id: plant.id,
    });

  const latin = plant.plant_definition?.latin || '';
  const locationName = plant.location?.name || '';

  const lightKey = normalizeLightLevelKey(plant.light_level);
  const lightValue = lightKey
    ? lightKey === 'low' || lightKey === 'high'
      ? tr(`createPlant.step04.${lightKey}`, String(plant.light_level))
      : tr(
          `createPlant.step04.modal.levels.${lightKey}`,
          String(plant.light_level),
        )
    : plant.light_level
    ? String(plant.light_level)
    : tr('plantDetails.common.dash', '—');

  const oKey = normalizeOrientationKey(plant.orientation);
  const orientationValue = oKey
    ? tr(
        `plantDetails.info.orientations.${oKey}`,
        tr(`createPlant.step04.orientations.${oKey}`, oKey),
      )
    : tr('plantDetails.common.dash', '—');

  const potValue = plant.pot_material
    ? tr(
        `createPlant.step05.potMaterials.${String(plant.pot_material)}.label`,
        String(plant.pot_material),
      )
    : tr('plantDetails.common.dash', '—');

  const soilValue = plant.soil_mix
    ? tr(
        `createPlant.step05.soilMixes.${String(plant.soil_mix)}.label`,
        String(plant.soil_mix),
      )
    : tr('plantDetails.common.dash', '—');

  const purchaseValue =
    plant.purchase_date || tr('plantDetails.common.dash', '—');
  const notesValue = plant.notes || tr('plantDetails.common.dash', '—');

  const distanceValue = formatDistanceBySettings(
    plant.distance_cm ?? null,
    settings?.measureUnit,
    tr,
  );

  const plantDefinitionId =
    (plant.plant_definition?.id ?? (plant as any).plant_definition_id) != null
      ? Number(plant.plant_definition?.id ?? (plant as any).plant_definition_id)
      : null;

  const plantDefinitionIdSafe = Number.isFinite(plantDefinitionId as any)
    ? (plantDefinitionId as number)
    : null;

  const DOTS_TOP = 10;
  const DOTS_RIGHT = 10;
  const MENU_LIFT = 10;

  return (
    <View style={[styles.root, menuOpen && styles.rootRaised]}>
      <View
        style={[
          styles.heroOuter,
          activeTab !== 'info' && tabContent == null && { marginBottom: -16 },
        ]}
      >
        <Pressable onPressIn={handleTileTouch} accessible={false}>
          <View
            style={[
              styles.heroClip,
              activeTab !== 'info' &&
                tabContent == null && {
                  borderBottomLeftRadius: 28,
                  borderBottomRightRadius: 28,
                },
            ]}
          >
            {(imageUrl && !imageFailed) ||
            (plant.photo && photoLoading) ||
            localPhotoLoading ? (
              <View style={styles.heroImage}>
                {imageUrl ? (
                  <View style={StyleSheet.absoluteFill}>
                    {syncedPhotoUri && plant.photo ? (
                      <FramedPlantImage
                        uri={syncedPhotoUri}
                        photo={plant.photo}
                        style={StyleSheet.absoluteFillObject}
                        testID="plant-detail-photo"
                        onLoad={onImageLoad}
                        onError={onImageError}
                      />
                    ) : (
                      <ImageMasked
                        uri={imageUrl}
                        shiftUp={!plant.photo && (imageUrl === plant.plant_definition?.image || imageUrl === plant.plant_definition?.image_thumb)}
                        onLoad={onImageLoad}
                        onError={onImageError}
                      />
                    )}
                  </View>
                ) : (
                  <View
                    style={StyleSheet.absoluteFill}
                    testID="plant-detail-photo-loading"
                  >
                    <CenteredSpinner size={32} />
                  </View>
                )}

                <LinearGradient
                  themeRole="photo"
                  pointerEvents="none"
                  colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0.00)']}
                  locations={[0, 1]}
                  style={styles.heroTopScrim}
                />

                <ThemeContrastScope kind="photo">
                  <View
                    style={[
                      styles.heroText,
                      { paddingBottom: infoFadeHeight + 60 },
                    ]}
                  >
                    <Text style={styles.h1} numberOfLines={1}>
                      {title}
                    </Text>
                    <SharedPlantBadge access={plant.access} compact />

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
                </ThemeContrastScope>
              </View>
            ) : (
              <View style={[styles.heroImage, styles.heroPlaceholder]}>
                <MaterialCommunityIcons
                  name="image-off-outline"
                  size={24}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.noImageText}>
                  {tr('plantDetails.info.noImage', 'No image')}
                </Text>
                <SharedPlantBadge access={plant.access} compact />
              </View>
            )}
          </View>
        </Pressable>

        <View
          testID="plant-detail-segments"
          style={[styles.segmentBar, { bottom: infoFadeHeight + 5 }]}
        >
          {(['info', 'reminders', 'readings'] as const).map(key => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === key }}
              onPress={() => {
                closeMenu();
                onTabChange?.(key);
              }}
              style={[
                styles.segment,
                activeTab === key && styles.segmentActive,
              ]}
            >
              <Text
                style={styles.segmentText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {tr(
                  `plantDetails.segments.${key}`,
                  key === 'info'
                    ? 'Info'
                    : key === 'reminders'
                    ? 'Reminders'
                    : 'Readings',
                )}
              </Text>
            </Pressable>
          ))}
        </View>

        {menuOpen && (
          <View style={styles.menuOverlay} pointerEvents="box-none">
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />

            <View
              style={[
                styles.menuSheetPos,
                { top: DOTS_TOP - MENU_LIFT, right: DOTS_RIGHT },
              ]}
              pointerEvents="box-none"
            >
              <PlantInfoMenu
                canEdit={access.canEdit}
                sharingActive={shares.some(
                  share =>
                    share.direction === 'outgoing' &&
                    share.plant.id === String(plant.id),
                )}
                onShare={() => {
                  closeMenu();
                  openSharePlant({
                    id: String(plant.id),
                    name: title,
                    location: locationName,
                    latin,
                    imageUrl: plant.plant_definition?.image_thumb || plant.plant_definition?.image || undefined,
                    photo: plant.photo,
                  });
                }}
                onShowQr={
                  access.isOwner && onShowQr
                    ? () => {
                        closeMenu();
                        onShowQr();
                      }
                    : undefined
                }
                onEditPlant={() => {
                  closeMenu();
                  if (onOpenEditPlant) {
                    onOpenEditPlant(String(plant.id));
                  } else {
                    nav.navigate('Plants', { editPlantId: String(plant.id) });
                  }
                }}
                onChangeImage={() => {
                  closeMenu();
                  onOpenChangeImage?.(String(plant.id));
                }}
                onJournal={() => {
                  closeMenu();
                  nav.navigate('TaskHistory', { plantId: String(plant.id) });
                }}
                onShowReminders={() => {
                  closeMenu();
                  nav.navigate(
                    'Reminders' as never,
                    { plantId: String(plant.id) } as never,
                  );
                }}
              />
            </View>
          </View>
        )}

        {!menuOpen && (
          <View
            style={[styles.dotsAnchor, { top: DOTS_TOP, right: DOTS_RIGHT }]}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={toggleMenu}
              style={styles.menuBtn}
              android_ripple={{
                color: 'rgba(255,255,255,0.16)',
                borderless: true,
              }}
              hitSlop={10}
            >
              <ThemeContrastScope kind="photo">
                {' '}
                <MaterialCommunityIcons
                  name="dots-horizontal"
                  size={20}
                  color="#FFFFFF"
                />
              </ThemeContrastScope>
            </Pressable>
          </View>
        )}
      </View>

      {(activeTab === 'info' || tabContent != null) && (
        <Pressable
          testID="plant-detail-description"
          style={[
            styles.infoBody,
            activeTab === 'info' && styles.infoBodyParameters,
            activeTab === 'readings' && { minHeight: infoFadeHeight + 56 },
            { marginTop: -infoFadeHeight },
          ]}
          onLayout={event => {
            const height = Math.round(event.nativeEvent.layout.height);
            if (height > 0 && activeTab === 'info') setInfoPanelHeight(height);
          }}
          onPressIn={handleTileTouch}
          accessible={false}
        >
          <PlantDescriptionSurface fadeHeight={infoFadeHeight} />
          {activeTab === 'info' ? (
            <View style={styles.infoGrid}>
              {[
                {
                  icon: 'white-balance-sunny',
                  label: tr('plantDetails.info.light', 'Light'),
                  value: lightValue,
                  fullWidth: false,
                },
                {
                  icon: 'compass-outline',
                  label: tr('plantDetails.info.orientation', 'Orientation'),
                  value: orientationValue,
                  fullWidth: false,
                },
                {
                  icon: 'shovel',
                  label: tr('plantDetails.info.soil', 'Soil'),
                  value: soilValue,
                  fullWidth: false,
                },
                {
                  icon: 'pot-outline',
                  label: tr('plantDetails.info.pot', 'Pot'),
                  value: potValue,
                  fullWidth: false,
                },
                {
                  icon: 'tape-measure',
                  label: tr('plantDetails.info.distance', 'Distance'),
                  value: distanceValue,
                  fullWidth: false,
                },
                {
                  icon: 'calendar',
                  label: tr('plantDetails.info.purchased', 'Purchased'),
                  value: purchaseValue,
                  fullWidth: false,
                },
                {
                  icon: 'note-edit-outline',
                  label: tr('plantDetails.info.notes', 'Notes'),
                  value: notesValue,
                  fullWidth: true,
                },
              ].map(it => (
                <View
                  key={it.icon}
                  testID={`plant-info-field-${it.icon}`}
                  style={[styles.infoField, { minHeight: parameterHeight }, it.fullWidth && styles.infoFieldFull]}
                >
                  <View style={styles.infoIcon}>
                    <MaterialCommunityIcons name={it.icon as any} size={20} color="#FFFFFF" />
                  </View>
                  <View
                    style={styles.infoText}
                    testID={`plant-info-text-${it.icon}`}
                  >
                    <Text
                      style={styles.infoLabel}
                      testID={`plant-info-label-${it.icon}`}
                      onLayout={it.fullWidth ? undefined : event => measureParameterText(it.icon, 'label', event.nativeEvent.layout.height)}
                    >{it.label}</Text>
                    <View style={styles.infoValueArea}>
                      <Text
                        style={styles.infoValue}
                        testID={`plant-info-value-${it.icon}`}
                        onLayout={it.fullWidth ? undefined : event => measureParameterText(it.icon, 'value', event.nativeEvent.layout.height)}
                      >{it.value}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            tabContent
          )}
        </Pressable>
      )}
      {/* In-app prompt: No plant definition (NO dimming backdrop, full black card) */}
      {noDefinitionPromptVisible && (
        <View style={styles.confirmOverlay} pointerEvents="box-none">
          <View style={styles.confirmCard}>
            <View style={styles.confirmHeader}>
              <MaterialCommunityIcons
                name="book-open-variant"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.confirmTitle}>
                {tr(
                  'plantDetails.infoMenu.noDefinitionTitle',
                  'Plant definition unavailable',
                )}
              </Text>
            </View>

            <Text style={styles.confirmBody}>
              {tr(
                'plantDetails.infoMenu.noDefinitionBody',
                'This plant is not linked to a plant definition yet.',
              )}
            </Text>

            <View style={styles.confirmRow}>
              <Pressable
                style={[styles.confirmBtn, styles.confirmBtnPrimary]}
                onPress={() => setNoDefinitionPromptVisible(false)}
              >
                <Text style={styles.confirmBtnText}>
                  {tr('plantDetailsModals.common.close', 'Close')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative', zIndex: 1, elevation: 1 },
  rootRaised: { zIndex: 60, elevation: 60 },

  heroOuter: {
    marginLeft: -16,
    marginRight: -16,
    marginTop: -16,
    position: 'relative',
    overflow: 'visible',
  },

  heroClip: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },

  heroImage: {
    width: '100%',
    aspectRatio: PHOTO_DETAILS_ASPECT_RATIO,
    justifyContent: 'flex-end',
  },

  heroTopScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 70,
  },

  segmentBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: '#051F18',
    borderRadius: 20,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 17,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: 'rgba(11,114,133,1)' },
  segmentText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  heroText: { paddingHorizontal: 16, paddingBottom: 54 },

  dotsAnchor: {
    position: 'absolute',
    zIndex: 220,
    elevation: 220,
    overflow: 'visible',
  },
  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.20)',
  },

  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 200,
    overflow: 'visible',
  },
  menuSheetPos: {
    position: 'absolute',
    alignItems: 'flex-end',
    overflow: 'visible',
    zIndex: 210,
    elevation: 210,
  },

  infoBody: {
    marginTop: -40,
    marginHorizontal: -16,
    marginBottom: -16,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  h1: { color: '#FFFFFF', fontWeight: '800', fontSize: 22, marginBottom: 6 },
  latin: {
    color: 'rgba(255,255,255,0.92)',
    fontStyle: 'italic',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  locRow: { flexDirection: 'row', alignItems: 'center' },
  sub: { color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 13 },

  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  noImageText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    marginTop: 8,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    rowGap: 8,
    marginTop: 0,
  },
  infoBodyParameters: { paddingTop: 16, paddingBottom: 16 },
  infoField: {
    width: '48.8%',
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    padding: 10,
    gap: 8,
    minHeight: 58,
  },
  infoFieldFull: { width: '100%' },
  infoIcon: {
    alignSelf: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, minWidth: 0, alignSelf: 'stretch' },
  infoValueArea: { flexGrow: 1, justifyContent: 'center' },
  infoLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, lineHeight: 14 },
  infoValue: { color: '#FFFFFF', fontSize: 12, lineHeight: 17, fontWeight: '700', flexShrink: 1 },

  // prompt sheet styles (copied from your ChangePlantImageModal approach)
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
    elevation: 1200,
    justifyContent: 'flex-end',
  },
  confirmCard: {
    margin: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,1)',
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  confirmTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, flex: 1 },
  confirmBody: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 12,
  },
  confirmRow: { flexDirection: 'row', gap: 10 },

  confirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  confirmBtnPrimary: { backgroundColor: 'rgba(11,114,133,0.92)' },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '900' },
});
