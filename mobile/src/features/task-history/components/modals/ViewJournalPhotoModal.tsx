import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from '../../../../shared/theme/native';
import AppModalHost from '../../../../shared/ui/AppModalHost';
import CenteredSpinner from '../../../../shared/ui/CenteredSpinner';
import { useTranslation } from 'react-i18next';
import ContactModalFrame from '../../../sharing/components/ContactModalFrame';
import { usePlantPhoto } from '../../../../shared/hooks/usePlantPhoto';
import {
  fetchJournalPhotoPreview,
  fetchJournalPhotos,
  type JournalPhotoPreview,
} from '../../../../api/services/journal-photos.service';
import { useSettings } from '../../../../app/providers/SettingsProvider';
import MaterialCommunityIcons from '../../../../shared/theme/Icon';
import type { JournalPhotoItem } from '../../types/task-history.types';

import Dropdown from '../../../profile/components/Dropdown';

/** The authorized full photo, without the tile's crop or decorative gradient. */
export default function ViewJournalPhotoModal({
  visible,
  entry,
  onClose,
  plants = [],
}: {
  visible: boolean;
  entry: JournalPhotoItem | null;
  plants?: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [plantId, setPlantId] = useState<string | null>(entry?.plantId ?? null);
  const [plantOpen, setPlantOpen] = useState(false);
  const [catalog, setCatalog] = useState<{
    opening: number;
    items: JournalPhotoItem[];
  } | null>(null);
  const catalogOpening = useRef<number | null>(null);
  const [catalogError, setCatalogError] = useState<number | null>(null);
  const [selection, setSelection] = useState<{
    opening: number;
    id: string;
  } | null>(null);
  const [loaded, setLoaded] = useState<
    ({ context: string; opening: number } & JournalPhotoPreview) | null
  >(null);
  const [presentedOpening, setPresentedOpening] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [readyUri, setReadyUri] = useState<string | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  // A new opening must not reveal metadata or bytes retained by a previous one.
  const opening = useRef({ visible, id: entry?.id, plantId: entry?.plantId, sequence: 0 });
  if (
    opening.current.visible !== visible ||
    opening.current.id !== entry?.id ||
    opening.current.plantId !== entry?.plantId
  ) {
    opening.current = {
      visible,
      id: entry?.id,
      plantId: entry?.plantId,
      sequence: opening.current.sequence + 1,
    };
  }
  const catalogReady = catalog?.opening === opening.current.sequence;
  const photos = useMemo(
    () =>
      catalogReady
        ? catalog!.items.filter(item => !plantId || item.plantId === plantId)
        : [],
    [catalog, catalogReady, plantId],
  );
  const selectedId =
    selection?.opening === opening.current.sequence
      ? selection.id
      : entry && photos.some(item => item.id === entry.id)
      ? entry.id
      : photos[0]?.id;
  const selectedIndex = photos.findIndex(item => item.id === selectedId);
  const plantOptions = useMemo(() => {
    const options = new Map(plants.map(plant => [plant.id, plant.name]));
    if (catalogReady)
      for (const item of catalog!.items) options.set(item.plantId, item.plant);
    return Array.from(options, ([id, name]) => ({ id, name }));
  }, [plants, catalog, catalogReady]);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    const sequence = opening.current.sequence;
    if (catalogOpening.current !== sequence) {
      catalogOpening.current = sequence;
      setPlantId(entry?.plantId ?? null);
      setPlantOpen(false);
      setSelection(null);
    }
    setCatalogError(null);
    fetchJournalPhotos()
      .then(items => {
        if (active)
          setCatalog({
            opening: sequence,
            items: [...items].sort(
              (a, b) =>
                Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
                b.id.localeCompare(a.id),
            ),
          });
      })
      .catch(() => {
        if (active) setCatalogError(sequence);
      });
    return () => {
      active = false;
    };
  }, [visible, entry?.id, entry?.plantId, retry]);
  const context = `${opening.current.sequence}:${selectedId ?? 'none'}:${
    plantId ?? 'all'
  }:${retry}`;
  const current = loaded?.context === context ? loaded.entry : null;
  const photo = usePlantPhoto(visible ? current?.photo : null, {
    variant: 'display',
    expiresAt: current?.access?.expires_at,
  });

  useEffect(() => {
    if (!visible || !selectedId) return;
    let active = true;
    setLoadError(null);
    setReadyUri(null);
    setFailedUri(null);
    const sequence = opening.current.sequence;
    fetchJournalPhotoPreview(selectedId)
      .then(preview => {
        if (active) setLoaded({ context, opening: sequence, ...preview });
      })
      .catch(() => {
        if (active) setLoadError(context);
      });
    return () => {
      active = false;
    };
  }, [visible, selectedId, context]);

  const expired =
    !!current?.access?.expires_at &&
    Date.parse(current.access.expires_at) <= Date.now();
  const error =
    catalogError === opening.current.sequence ||
    loadError === context ||
    expired ||
    !!photo.error ||
    (!!photo.uri && failedUri === photo.uri);
  const navigation =
    loaded?.context === context
      ? {
          ...loaded,
          // The collection is newest first: Previous goes back in time.
          previousId: selectedIndex >= 0 ? photos[selectedIndex + 1]?.id ?? null : null,
          nextId: selectedIndex > 0 ? photos[selectedIndex - 1].id : null,
        }
      : null;
  // Keep the frame and its controls mounted while browsing within this opening.
  // Only current, freshly authorized metadata may supply private image bytes.
  const shell = loaded?.opening === opening.current.sequence ? loaded : null;
  const empty = catalogReady && photos.length === 0;
  const imageDimensions = current?.photo ?? shell?.entry.photo;
  const imageAspectRatio =
    imageDimensions?.width && imageDimensions?.height
      ? imageDimensions.width / imageDimensions.height
      : null;
  const imageLoading =
    !error && !empty && (!current || !photo.uri || readyUri !== photo.uri);
  const initialLoading =
    imageLoading && presentedOpening !== opening.current.sequence;
  const canNavigate = !error && !imageLoading;
  const swipeState = useRef({
    enabled: false,
    context,
    opening: opening.current.sequence,
    previousId: null as string | null,
    nextId: null as string | null,
  });
  swipeState.current = {
    enabled:
      visible && !!current && !error && !!photo.uri && readyUri === photo.uri,
    context,
    opening: opening.current.sequence,
    previousId: navigation?.previousId ?? null,
    nextId: navigation?.nextId ?? null,
  };
  const gestureContext = useRef<string | null>(null);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) => {
          const state = swipeState.current;
          return (
            state.enabled &&
            gesture.numberActiveTouches === 1 &&
            Math.abs(gesture.dx) >= 18 &&
            Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5 &&
            !!(gesture.dx < 0 ? state.nextId : state.previousId)
          );
        },
        onPanResponderGrant: () => {
          gestureContext.current = swipeState.current.context;
        },
        onPanResponderStart: (_event, gesture) => {
          if (gesture.numberActiveTouches > 1) gestureContext.current = null;
        },
        onPanResponderMove: (_event, gesture) => {
          if (gesture.numberActiveTouches > 1) gestureContext.current = null;
        },
        onPanResponderRelease: (_event, gesture) => {
          const startedAt = gestureContext.current;
          gestureContext.current = null;
          const state = swipeState.current;
          // Do not complete a gesture against a replaced, closed or still-loading photo.
          if (
            !state.enabled ||
            startedAt !== state.context ||
            gesture.numberActiveTouches > 1 ||
            Math.abs(gesture.dx) < 40 ||
            Math.abs(gesture.dx) <= Math.abs(gesture.dy) * 1.5
          )
            return;
          const id = gesture.dx < 0 ? state.nextId : state.previousId;
          if (id) setSelection({ opening: state.opening, id });
        },
        onPanResponderTerminate: () => {
          gestureContext.current = null;
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [],
  );

  if (!visible) return null;
  const formatAdded = (value: string) => {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    const pad = (part: number) => String(part).padStart(2, '0');
    const day = (settings.dateFormat || 'DD.MM.YYYY')
      .replace('YYYY', String(date.getFullYear()))
      .replace('MM', pad(date.getMonth() + 1))
      .replace('DD', pad(date.getDate()));
    return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const goTo = (id: string | null | undefined) => {
    if (id) setSelection({ opening: opening.current.sequence, id });
  };
  return (
    <AppModalHost>
      <ContactModalFrame
        visible
        title={String(
          t('taskHistory.photo.gallery', { defaultValue: 'Gallery' }),
        )}
        onClose={onClose}
        fullScreen
        loading={initialLoading}
      >
        <View style={styles.content}>
          <Dropdown
            open={plantOpen}
            valueText={
              plantOptions.find(plant => plant.id === plantId)?.name ??
              t('taskHistory.photo.allPlants', { defaultValue: 'All plants' })
            }
            onToggle={() => setPlantOpen(value => !value)}
            items={[
              {
                key: 'all',
                text: t('taskHistory.photo.allPlants', {
                  defaultValue: 'All plants',
                }),
                selected: !plantId,
                onPress: () => {
                  setPlantId(null);
                  setSelection(
                    catalogReady && catalog!.items[0]
                      ? {
                          opening: opening.current.sequence,
                          id: catalog!.items[0].id,
                        }
                      : null,
                  );
                  setPlantOpen(false);
                },
              },
              ...plantOptions.map(plant => ({
                key: plant.id,
                text: plant.name,
                selected: plantId === plant.id,
                onPress: () => {
                  setPlantId(plant.id);
                  const first = catalog?.items.find(
                    item => item.plantId === plant.id,
                  );
                  setSelection(
                    first
                      ? { opening: opening.current.sequence, id: first.id }
                      : null,
                  );
                  setPlantOpen(false);
                },
              })),
            ]}
          />
          <Text style={styles.name}>
            {!error && !empty ? shell?.entry.plant ?? '\u00a0' : '\u00a0'}
          </Text>
          <View
            testID="journal-photo-swipe-area"
            style={[
              styles.imagePane,
              imageAspectRatio && !error && !empty
                ? { aspectRatio: imageAspectRatio }
                : { minHeight: 160 },
            ]}
            {...panResponder.panHandlers}
          >
            {empty && !error ? (
              <Text style={styles.empty}>
                {t('taskHistory.photo.emptyGallery', {
                  defaultValue: 'No journal photos for this selection.',
                })}
              </Text>
            ) : error ? (
              <View style={styles.error}>
                <Text style={styles.errorText}>
                  {t('taskHistory.photo.loadFailed', {
                    defaultValue:
                      'Could not load the photo details. Please try again.',
                  })}
                </Text>
                <Pressable
                  style={styles.button}
                  onPress={() => {
                    photo.refresh();
                    setRetry(value => value + 1);
                  }}
                >
                  <Text style={styles.buttonText}>
                    {t('taskHistory.photo.retry', {
                      defaultValue: 'Try again',
                    })}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                {!!photo.uri && (
                  <Image
                    key={`${context}:${photo.uri}`}
                    testID="journal-full-photo"
                    accessibilityLabel={current?.plant ?? ''}
                    source={{ uri: photo.uri }}
                    resizeMode="contain"
                    style={[
                      StyleSheet.absoluteFill,
                      { opacity: readyUri === photo.uri ? 1 : 0 },
                    ]}
                    onLoad={() => {
                      if (swipeState.current.context !== context) return;
                      setReadyUri(photo.uri);
                      setPresentedOpening(opening.current.sequence);
                    }}
                    onError={() => {
                      if (swipeState.current.context === context)
                        setFailedUri(photo.uri);
                    }}
                  />
                )}
                {imageLoading && !initialLoading && (
                  <View
                    testID="journal-photo-loading"
                    style={StyleSheet.absoluteFill}
                  >
                    <CenteredSpinner size={42} />
                  </View>
                )}
              </>
            )}
          </View>
          <Text testID="journal-photo-added-at" style={styles.added}>
            {shell && !error && !empty
              ? `${t('taskHistory.photo.added', {
                  defaultValue: 'Added',
                })}: ${formatAdded(shell.entry.createdAt)}`
              : '\u00a0'}
          </Text>
          {!!shell && photos.length > 1 && !empty && (
            <View style={styles.navigation}>
              <Pressable
                accessibilityRole="button"
                disabled={!navigation?.previousId || !canNavigate}
                accessibilityState={{
                  disabled: !navigation?.previousId || !canNavigate,
                }}
                onPress={() => goTo(navigation?.previousId)}
                style={[
                  styles.button,
                  styles.navigationButton,
                  (!navigation?.previousId || !canNavigate) && styles.disabled,
                ]}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={[styles.buttonText, styles.navigationText]}>
                  {t('taskHistory.photo.previous', {
                    defaultValue: 'Previous',
                  })}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!navigation?.nextId || !canNavigate}
                accessibilityState={{
                  disabled: !navigation?.nextId || !canNavigate,
                }}
                onPress={() => goTo(navigation?.nextId)}
                style={[
                  styles.button,
                  styles.navigationButton,
                  (!navigation?.nextId || !canNavigate) && styles.disabled,
                ]}
              >
                <Text style={[styles.buttonText, styles.navigationText]}>
                  {t('taskHistory.photo.next', { defaultValue: 'Next' })}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>
              {t('taskHistory.photo.close', { defaultValue: 'Close' })}
            </Text>
          </Pressable>
        </View>
      </ContactModalFrame>
    </AppModalHost>
  );
}
const styles = StyleSheet.create({
  content: { marginHorizontal: 16, gap: 14 },
  empty: { color: '#FFFFFF', padding: 16, textAlign: 'center' },
  name: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  imagePane: {
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  error: { padding: 18, gap: 16 },
  errorText: { color: '#FFAAAA', fontSize: 14, lineHeight: 21 },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.17)',
  },
  added: { color: 'rgba(255,255,255,0.9)', fontSize: 14, textAlign: 'center' },
  navigation: { flexDirection: 'row', gap: 12 },
  navigationButton: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 6 },
  disabled: { opacity: 0.4 },
  navigationText: { flexShrink: 1, textAlign: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
