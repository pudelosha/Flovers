import { usePlantEditor } from '../../plants/hooks/usePlantEditor';
import { ScreenLoadingSpinner } from '../../../shared/ui/HeaderPresentation';
import ListLoadError from '../../../shared/ui/ListLoadError';
import { useRequestGuard } from '../../../shared/hooks/useRequestGuard';
import { useHeaderContentReady } from '../../../shared/ui/HeaderPresentation';
import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Pressable,
  RefreshControl,
  Alert,
  Text,
  StyleSheet,
  Animated,
  Easing,
  PermissionsAndroid,
  Platform,
  AnimatedView,
  AnimatedFlatList,
} from '../../../shared/theme/native';
import { PUBLIC_BASE_URL_NORM } from '../../../config';
import {
  useNavigation,
  useFocusEffect,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '../../../shared/theme/Icon';
import { useTranslation } from 'react-i18next';
import LinearGradient from '../../../shared/theme/Gradient';

import { useLanguage } from '../../../app/providers/LanguageProvider';
import { useSettings } from '../../../app/providers/SettingsProvider';

import GlassHeader from '../../../shared/ui/GlassHeader';
import FAB from '../../../shared/ui/FAB';
import CenteredSpinner from '../../../shared/ui/CenteredSpinner';
import { usePlantPhotoPreload } from '../../../shared/hooks/usePlantPhotoPreload';
import TopSnackbar from '../../../shared/ui/TopSnackbar';
import { s } from '../styles/plants.styles';
import PlantTile from '../components/PlantTile';
import EditPlantModal from '../components/modals/EditPlantModal';
import ChangePlantImageModal from '../../plant-details/components/modals/ChangePlantImageModal';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import PlantQrModal from '../components/modals/PlantQrModal';

import SortPlantsModal, {
  SortDir,
  SortKey,
} from '../components/modals/SortPlantsModal';
import FilterPlantsModal from '../components/modals/FilterPlantsModal';
import SearchPlantsModal from '../components/modals/SearchPlantsModal';
import { matchesPlantSearch } from '../utils/plantSearch';

import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
} from '../constants/plants.constants';

import type { Plant } from '../types/plants.types';
import {
  fetchPlantInstances,
  deletePlantInstance,
  ApiPlantInstanceListItem,
} from '../../../api/services/plant-instances.service';

import { getPlantPhotoUri } from '../../../shared/utils/photoStorage';
import RNFS from 'react-native-fs';
import { plantAccess } from '../../../shared/utils/plantAccess';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { sendQrCodeByEmail } from '../../../api/services/qr-code.service';



function mapApiToPlant(
  item: ApiPlantInstanceListItem,
  unnamedFallback: string,
): Plant {
  const name =
    item.display_name?.trim() ||
    item.plant_definition?.name?.trim() ||
    unnamedFallback;

  const latin = item.plant_definition?.latin || undefined;
  const location = item.location?.name || undefined;

  const imageUrl =
    item.plant_definition?.image_thumb ||
    item.plant_definition?.image ||
    undefined;

  return {
    id: String(item.id),
    access: item.access,
    name,
    latin,
    species: item.plant_definition?.name || undefined,
    location,
    notes: item.notes || '',
    imageUrl,
    photo: item.photo,
    qrCode: item.qr_code ?? undefined,
  };
}

function norm(v?: string) {
  return (v || '').toLowerCase().trim();
}

const TAB_GREEN_DARK = 'rgba(5, 31, 24, 0.9)';
const TAB_GREEN_LIGHT = 'rgba(16, 80, 63, 0.9)';

export default function PlantsScreen() {
  const requestGuard = useRequestGuard();
  const headerReady = useHeaderContentReady();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  // Allow the last tile's full menu to clear the FAB and bottom tab bar.
  const listFooterHeight = 360 + insets.bottom;

  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [fabCloseSignal, setFabCloseSignal] = useState(0);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVariant, setToastVariant] = useState<
    'default' | 'success' | 'error'
  >('default');
  const showToast = (
    message: string,
    variant: 'default' | 'success' | 'error' = 'default',
  ) => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };


  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const searchListRef = useRef<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('plant');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [activeFilters, setActiveFilters] = useState<{
    location?: string;
    latin?: string;
  }>({});

  const [qrVisible, setQrVisible] = useState(false);
  const [imagePlantId, setImagePlantId] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState('');
  const [qrPlantName, setQrPlantName] = useState('');
  const [qrPlantId, setQrPlantId] = useState<string>('');
  const qrModalRef = useRef<any>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');

  const closeFloatingMenus = useCallback(() => {
    setMenuOpenId(null);
    setFabCloseSignal(value => value + 1);
  }, []);

  const applySearch = useCallback(
    (value: string) => {
      closeFloatingMenus();
      setSearchQuery(value);
      setSearchOpen(false);
      requestAnimationFrame(() =>
        searchListRef.current?.scrollToOffset({ offset: 0, animated: false }),
      );
    },
    [closeFloatingMenus],
  );

  const closeFabMenu = useCallback(() => {
    setFabCloseSignal(value => value + 1);
  }, []);

  const onToggleMenu = useCallback((id: string) => {
    setFabCloseSignal(value => value + 1);
    setMenuOpenId(curr => (curr === id ? null : id));
  }, []);

  const tr = useCallback(
    (key: string, fallback?: string, values?: Record<string, unknown>) => {
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (
        (isMissing ? undefined : txt) || fallback || key.split('.').pop() || key
      );
    },
    [t],
  );

  const onSaveQr = useCallback(
    async (svgRef: any) => {
      if (!svgRef?.toDataURL) {
        throw new Error(
          tr('plants.qrErrors.rendererNotReady', 'QR renderer not ready.'),
        );
      }

      const dataUrl: string = await new Promise((res, rej) =>
        svgRef.toDataURL((d: string) =>
          d ? res(d) : rej(new Error('No dataURL')),
        ),
      );

      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const filePath = `${RNFS.CachesDirectoryPath}/plant_qr_${Date.now()}.png`;
      await RNFS.writeFile(filePath, base64, 'base64');

      if (Platform.OS === 'android' && Platform.Version <= 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: tr('plants.permissions.storage.title', 'Storage permission'),
            message: tr(
              'plants.permissions.storage.message',
              'We need access to save the QR code to your gallery.',
            ),
            buttonPositive: tr('plants.permissions.storage.ok', 'OK'),
          },
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error(
            tr(
              'plants.permissions.storage.denied',
              'Storage permission denied.',
            ),
          );
        }
      }

      await CameraRoll.save(filePath, { type: 'photo' });
    },
    [tr],
  );

  useFocusEffect(
    useCallback(() => {
      closeFloatingMenus();
      setSortOpen(false);
      setFilterOpen(false);
      setConfirmDeleteId(null);
      setConfirmDeleteName('');
      setQrVisible(false);
      setImagePlantId(null);
      setQrPlantId('');
      qrModalRef.current = null;

    }, [closeFloatingMenus]),
  );

  const unnamedFallback = useMemo(
    () => t('plants.list.unnamed', { defaultValue: 'Unnamed plant' }),
    [t],
  );

  const attachLocalPhotos = useCallback(async (list: Plant[]) => {
    const results = await Promise.all(
      list.map(async p => {
        if (!plantAccess(p.access).isOwner || p.photo) return p;
        try {
          const local = await getPlantPhotoUri(p.id);
          if (local) {
            return { ...p, imageUrl: local };
          }
        } catch {
          // ignore
        }
        return p;
      }),
    );
    return results;
  }, []);

  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    const isCurrent = requestGuard.begin();
    try {
      const data = await fetchPlantInstances({ auth: true });

      const mapped = data.map(it => mapApiToPlant(it, unnamedFallback));
      const withLocal = await attachLocalPhotos(mapped);
      if (!isCurrent()) return;

      setLoadError(false);
      setPlants(withLocal);
    } catch (e: any) {
      if (!isCurrent()) return;
      setLoadError(true);
      showToast(
        e?.message ||
          t('plants.toast.loadFailed', {
            defaultValue: 'Failed to load plants',
          }),
        'error',
      );
      setPlants([]);
    }
  }, [t, unnamedFallback, attachLocalPhotos, requestGuard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    closeFloatingMenus();
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [closeFloatingMenus, load]);

  const openCreatePlantWizard = () => {
    closeFloatingMenus();
    nav.navigate('CreatePlantWizard');
  };

  const openJournal = (p: Plant) => {
    closeFloatingMenus();
    nav.navigate('TaskHistory', { plantId: String(p.id) });
  };

  const plantEditor = usePlantEditor({
    onBeforeOpen: closeFloatingMenus,
    onSaved: async updated => {
      const mapped = mapApiToPlant(updated, unnamedFallback);
      const withLocal = await attachLocalPhotos([mapped]);
      setPlants(previous => previous.map(plant => plant.id === String(updated.id) ? withLocal[0] : plant));
      showToast(t('plants.toast.updated', { defaultValue: 'Plant updated' }), 'success');
    },
  });
  const { visible: editOpen, loading: editLoading, saving } = plantEditor;
  const openEditModalById = plantEditor.open;
  const openEditModal = useCallback((plant: Plant) => openEditModalById(plant.id), [openEditModalById]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      requestGuard.activate();

      (async () => {
        const params = (route as any)?.params;
        const incomingEditId =
          params?.editPlantId ?? params?.plantId ?? params?.id;

        if (incomingEditId) {
          (nav as any).setParams?.({
            editPlantId: undefined,
            plantId: undefined,
            id: undefined,
          });

          if (!mounted) return;

          setLoading(true);
          setPlants([]);

          try {
            await openEditModalById(String(incomingEditId));
          } finally {
            if (mounted) setLoading(false);
          }

          return;
        }

        setLoading(true);
        setPlants([]);
        try {
          await load();
        } finally {
          if (mounted) setLoading(false);
        }
      })();

      return () => {
        mounted = false;
        requestGuard.invalidate();
      };
    }, [load, route, nav, openEditModalById, requestGuard]),
  );


  const askDelete = (p: Plant) => {
    closeFloatingMenus();
    setConfirmDeleteId(p.id);
    setConfirmDeleteName(p.name);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deletePlantInstance(Number(confirmDeleteId), { auth: true });
      setPlants(prev => prev.filter(p => p.id !== confirmDeleteId));
      showToast(
        t('plants.toast.deleted', { defaultValue: 'Plant deleted' }),
        'success',
      );
    } catch (e: any) {
      Alert.alert(
        t('plants.alert.deleteFailedTitle', { defaultValue: 'Delete failed' }),
        e?.message ||
          t('plants.alert.deleteFailedMsg', {
            defaultValue: 'Could not delete this plant.',
          }),
      );
    } finally {
      setConfirmDeleteId(null);
      setConfirmDeleteName('');
    }
  };

  const openShowQr = (p: Plant) => {
    closeFloatingMenus();

    const code = p.qrCode || p.id;
    const value = `${PUBLIC_BASE_URL_NORM}/plant-instances/by-qr/?code=${encodeURIComponent(
      code,
    )}`;

    setQrPlantId(p.id);
    setQrPlantName(p.name);
    setQrValue(value);
    qrModalRef.current = null;
    setQrVisible(true);
  };

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    plants.forEach(p => p.location && set.add(p.location));
    return Array.from(set).sort((a, b) => norm(a).localeCompare(norm(b)));
  }, [plants]);

  const latinOptions = useMemo(() => {
    const set = new Set<string>();
    plants.forEach(p => p.latin && set.add(p.latin));
    return Array.from(set).sort((a, b) => norm(a).localeCompare(norm(b)));
  }, [plants]);

  const derivedPlants = useMemo(() => {
    const filtered = plants.filter(p => {
      if (!matchesPlantSearch(p, searchQuery)) return false;
      if (
        activeFilters.location &&
        norm(p.location) !== norm(activeFilters.location)
      )
        return false;
      if (activeFilters.latin && norm(p.latin) !== norm(activeFilters.latin))
        return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'plant') {
        cmp = norm(a.name).localeCompare(norm(b.name));
      } else {
        cmp = norm(a.location).localeCompare(norm(b.location));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [plants, activeFilters, sortKey, sortDir, searchQuery]);

  const photoTargets = useMemo(
    () =>
      derivedPlants.map(plant => ({
        photo: plant.photo,
        variant:
          (plant.photo?.framing?.zoom ?? 1) > 1
            ? ('display' as const)
            : ('thumbnail' as const),
        expiresAt: plant.access?.expires_at,
      })),
    [derivedPlants],
  );
  const photoPreload = usePlantPhotoPreload(photoTargets, !loading);
  const contentLoading = loading || photoPreload.loading;

  const isFilterActive = useMemo(
    () => Boolean(activeFilters.location || activeFilters.latin),
    [activeFilters.location, activeFilters.latin],
  );

  const showFAB =
    !editOpen &&
    !confirmDeleteId &&
    !sortOpen &&
    !filterOpen &&
    !searchOpen &&
    !qrVisible;

  const animMapRef = useRef<Map<string, Animated.Value>>(new Map());
  const getAnimForId = (id: string) => {
    const m = animMapRef.current;
    if (!m.has(id)) m.set(id, new Animated.Value(0));
    return m.get(id)!;
  };

  const primeAnimations = useCallback((ids: string[]) => {
    ids.forEach(id => {
      const v = getAnimForId(id);
      v.setValue(0);
    });
  }, []);

  const runStaggerIn = useCallback((ids: string[]) => {
    const sequences = ids.map((id, i) => {
      const v = getAnimForId(id);
      return Animated.timing(v, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        delay: i * 50,
      });
    });
    Animated.stagger(50, sequences).start();
  }, []);

  useEffect(() => {
    if (contentLoading || !headerReady) return;
    const ids = derivedPlants.map(p => p.id);
    primeAnimations(ids);
    const id = requestAnimationFrame(() => runStaggerIn(ids));
    return () => cancelAnimationFrame(id);
  }, [
    contentLoading,
    headerReady,
    derivedPlants.length,
    primeAnimations,
    runStaggerIn,
    derivedPlants,
  ]);

  const emptyAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (contentLoading || !headerReady) {
      emptyAnim.setValue(0);
      return;
    }
    if (derivedPlants.length === 0) {
      emptyAnim.setValue(0);
      Animated.timing(emptyAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      emptyAnim.setValue(0);
    }
  }, [contentLoading, headerReady, derivedPlants.length, emptyAnim]);

  const emptyTranslateY = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const emptyScale = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });
  const emptyOpacity = emptyAnim;

  if (contentLoading) {
    return (
      <View style={{ flex: 1 }}>
        <GlassHeader
          title={t('plants.header.title', { defaultValue: 'Plants' })}
          gradientColors={HEADER_GRADIENT_TINT}
          solidFallback={HEADER_SOLID_FALLBACK}
          rightIconName="qrcode-scan"
          onPressRight={() => nav.navigate('Scanner')}
          showSeparator={false}
        />
        <ScreenLoadingSpinner size={56} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title={t('plants.header.title', { defaultValue: 'Plants' })}
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate('Scanner')}
        showSeparator={false}
      />

      {menuOpenId && (
        <Pressable onPress={closeFloatingMenus} style={s.backdrop} />
      )}

      <AnimatedFlatList
        ref={searchListRef}
        style={{ flex: 1 }}
        data={derivedPlants}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        keyExtractor={p => p.id}
        renderItem={({ item, index }) => {
          const v = getAnimForId(item.id);
          const translateY = v.interpolate({
            inputRange: [0, 1],
            outputRange: [14, 0],
          });
          const scale = v.interpolate({
            inputRange: [0, 1],
            outputRange: [0.98, 1],
          });
          const opacity = v;

          const isOpen = menuOpenId === item.id;

          return (
            <AnimatedView
              // Fade the composed photo and panel together, keeping the
              // panel's translucency constant throughout entry in both themes.
              needsOffscreenAlphaCompositing
              style={[
                {
                  width: '48.5%',
                  opacity,
                  transform: [{ translateY }, { scale }],
                },
                isOpen && { zIndex: 50 },
              ]}
            >
              <PlantTile
                plant={item}
                menuAlign={index % 2 === 0 ? 'left' : 'right'}
                isMenuOpen={isOpen}
                onPressBody={closeFabMenu}
                onPressMenu={() => onToggleMenu(item.id)}
                onDetails={() => {
                  closeFloatingMenus();
                  nav.navigate('PlantDetails', { id: item.id });
                }}
                onEdit={() => openEditModal(item)}
                onChangeImage={() => {
                  closeFloatingMenus();
                  setImagePlantId(String(item.id));
                }}
                onReminders={() => {
                  closeFloatingMenus();
                  nav.navigate('Reminders', {
                    plantId: item.id,
                    plantName: item.name,
                  });
                }}
                onJournal={() => openJournal(item)}
                onDelete={() => askDelete(item)}
                onShowQr={() => openShowQr(item)}
              />
            </AnimatedView>
          );
        }}
        ListHeaderComponent={
          searchQuery ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={20}
                color="#FFFFFF"
              />
              <Text
                style={{ flex: 1, minWidth: 0, color: '#FFFFFF', fontSize: 14 }}
              >
                {t('plants.search.active', {
                  defaultValue: 'Search: {{query}}',
                  query: searchQuery,
                })}
              </Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => applySearch('')}
                accessibilityLabel={String(
                  t('plants.search.clear', { defaultValue: 'Clear search' }),
                )}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          ) : (
            <View style={{ height: 0 }} />
          )
        }
        ListFooterComponent={<View style={{ height: listFooterHeight }} />}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={closeFloatingMenus}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => loadError ? <ListLoadError message={String(t('plants.toast.loadFailed', { defaultValue: 'Failed to load plants' }))} onRetry={() => void onRefresh()} /> : (
          <AnimatedView
            style={[
              s.emptyWrap,
              {
                opacity: emptyOpacity,
                transform: [
                  { translateY: emptyTranslateY },
                  { scale: emptyScale },
                ],
              },
            ]}
          >
            <View style={s.emptyGlass}>
              <LinearGradient
                pointerEvents="none"
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
                locations={[0, 1]}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                pointerEvents="none"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                colors={[
                  'rgba(255, 255, 255, 0.06)',
                  'rgba(255, 255, 255, 0.02)',
                  'rgba(255, 255, 255, 0.08)',
                ]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
              />

              <View pointerEvents="none" style={s.emptyTint} />
              <View pointerEvents="none" style={s.emptyBorder} />

              <View style={s.emptyInner}>
                <MaterialCommunityIcons
                  name="flower-tulip-outline"
                  size={26}
                  color="#FFFFFF"
                  style={{ marginBottom: 10 }}
                />
                <Text style={s.emptyTitle}>
                  {searchQuery || isFilterActive
                    ? t('plants.search.noResults', {
                        defaultValue: 'No matching plants',
                      })
                    : t('plants.empty.title', {
                        defaultValue: 'No plants yet',
                      })}
                </Text>
                <View style={s.emptyDescBox}>
                  <Text style={s.emptyText}>
                    {searchQuery || isFilterActive ? (
                      t('plants.search.noResultsDescription', {
                        defaultValue:
                          'Try another search or change your filters.',
                      })
                    ) : (
                      <>
                        {t('plants.empty.desc1', {
                          defaultValue:
                            'Tap the “+” button in the bottom-right corner to add your first plant.',
                        })}{' '}
                        {t('plants.empty.desc2', {
                          defaultValue:
                            'The Create Plant Wizard will help you set up your plant and specify its parameters, as well as schedule reminders.',
                        })}
                        {'\n\n'}
                      </>
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedView>
        )}
      />

      {showFAB && (
        <View
          pointerEvents="box-none"
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponderCapture={() => {
            setMenuOpenId(null);
            return false;
          }}
        >
          <FAB
            bottomOffset={92}
            closeSignal={fabCloseSignal}
            position={settings.fabPosition}
            onInteraction={() => setMenuOpenId(null)}
            actions={[
              {
                key: 'create',
                icon: 'plus',
                label: t('plants.fab.create', { defaultValue: 'Create plant' }),
                onPress: openCreatePlantWizard,
              },
              {
                key: 'search',
                icon: 'magnify',
                label: t('plants.search.apply', { defaultValue: 'Search' }),
                onPress: () => {
                  closeFloatingMenus();
                  setSearchOpen(true);
                },
              },
              {
                key: 'sort',
                icon: 'sort',
                label: t('plants.fab.sort', { defaultValue: 'Sort' }),
                onPress: () => setSortOpen(true),
              },
              {
                key: 'filter',
                icon: 'filter-variant',
                label: t('plants.fab.filter', { defaultValue: 'Filter' }),
                onPress: () => setFilterOpen(true),
              },
              ...(isFilterActive
                ? [
                    {
                      key: 'clearFilter',
                      label: t('plants.fab.clearFilter', {
                        defaultValue: 'Clear filter',
                      }),
                      icon: 'filter-remove',
                      onPress: () => setActiveFilters({}),
                    } as const,
                  ]
                : []),
              {
                key: 'locations',
                icon: 'map-marker-outline',
                label: t('plants.fab.locations', {
                  defaultValue: 'Locations',
                }),
                onPress: () => {
                  closeFloatingMenus();
                  nav.navigate('PlantLocations');
                },
              },
            ]}
          />
        </View>
      )}

      <SearchPlantsModal
        visible={searchOpen}
        query={searchQuery}
        onCancel={() => setSearchOpen(false)}
        onApply={applySearch}
      />

      <EditPlantModal
        {...plantEditor.modalProps}
        latinCatalog={latinOptions}
        locations={locationOptions}
      />

      <ChangePlantImageModal
        visible={imagePlantId !== null}
        plantId={imagePlantId ?? ''}
        onClose={() => setImagePlantId(null)}
        onChanged={photo => {
          void load();
          showToast(
            photo
              ? t('plantDetails.toasts.photoUpdated', { defaultValue: 'Plant photo updated.' })
              : t('plantDetails.toasts.photoRemoved', { defaultValue: 'Plant photo removed.' }),
            'success',
          );
        }}
      />

      <ConfirmDeleteModal
        visible={!!confirmDeleteId}
        name={confirmDeleteName}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />

      <SortPlantsModal
        visible={sortOpen}
        sortKey={sortKey}
        sortDir={sortDir}
        onCancel={() => setSortOpen(false)}
        onApply={(key, dir) => {
          setSortKey(key);
          setSortDir(dir);
          setSortOpen(false);
        }}
        onReset={() => {
          setSortKey('plant');
          setSortDir('asc');
          setSortOpen(false);
        }}
      />

      <FilterPlantsModal
        visible={filterOpen}
        locations={locationOptions}
        latinOptions={latinOptions}
        filters={activeFilters}
        onCancel={() => setFilterOpen(false)}
        onApply={f => {
          setActiveFilters(f);
          setFilterOpen(false);
        }}
        onClearAll={() => setActiveFilters({})}
      />

      {(editLoading || saving) && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <CenteredSpinner size={46} color="#FFFFFF" />
        </View>
      )}

      <PlantQrModal
        visible={qrVisible}
        plantName={qrPlantName}
        qrValue={qrValue}
        onQrRef={ref => {
          qrModalRef.current = ref;
        }}
        onClose={() => {
          setQrVisible(false);
          setQrPlantId('');
          qrModalRef.current = null;
        }}
        onPressSave={async () => {
          try {
            await onSaveQr(qrModalRef.current);
            showToast(
              t('plants.toast.qrSaved', {
                defaultValue: 'QR code saved to your gallery.',
              }),
              'success',
            );
          } catch (err: any) {
            console.warn('[Plants] save QR failed:', err);
            showToast(
              t('plants.toast.qrSaveFailed', {
                defaultValue: 'Failed to save QR code.',
              }),
              'error',
            );
          }
        }}
        onPressEmail={async () => {
          try {
            await sendQrCodeByEmail(Number(qrPlantId), currentLanguage);
            showToast(
              t('plants.toast.qrEmailed', {
                defaultValue: 'QR code email sent.',
              }),
              'success',
            );
          } catch (err: any) {
            console.warn('[Plants] send QR email failed:', err);
            showToast(
              t('plants.toast.qrEmailFailed', {
                defaultValue: 'Failed to send QR code email.',
              }),
              'error',
            );
          }
        }}
      />

      <TopSnackbar
        visible={toastVisible}
        message={toastMsg}
        variant={toastVariant}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}
