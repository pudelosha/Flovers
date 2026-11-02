import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  Text,
  RefreshControl,
  Pressable,
  Animated,
  StyleSheet, AnimatedView, AnimatedFlatList } from "../../../shared/theme/native";
import {
  useNavigation,
  useRoute,
  useIsFocused,
} from '@react-navigation/native';
import MaterialCommunityIcons from "../../../shared/theme/Icon";
import { useTranslation } from 'react-i18next';
import LinearGradient from "../../../shared/theme/Gradient";

import GlassHeader from '../../../shared/ui/GlassHeader';
import CenteredSpinner from '../../../shared/ui/CenteredSpinner';
import { plantAccess } from '../../../shared/utils/plantAccess';
import TopSnackbar from '../../../shared/ui/TopSnackbar';
import FAB from '../../../shared/ui/FAB';
import { usePlantPhotoPreload } from '../../../shared/hooks/usePlantPhotoPreload';

import { s } from '../styles/task-history.styles';
import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
} from '../constants/task-history.constants';
import TaskHistoryTile from '../components/TaskHistoryTile';
import UndoTaskCompletionModal from '../components/modals/UndoTaskCompletionModal';
import JournalPhotoTile from '../components/JournalPhotoTile';
import JournalPhotoModal from '../components/modals/JournalPhotoModal';
import ConfirmDeleteJournalPhotoModal from '../components/modals/ConfirmDeleteJournalPhotoModal';
import ViewJournalPhotoModal from '../components/modals/ViewJournalPhotoModal';
import {
  isJournalPhoto,
  journalEntryKey,
  type JournalEntry,
  type JournalPhotoItem,
  type TaskHistoryItem,
} from '../types/task-history.types';
import type { TaskType } from '../../home/types/home.types';
import {
  deleteJournalPhoto,
  type JournalPlantOption,
} from '../../../api/services/journal-photos.service';

// completed tasks via dedicated history service
import {
  fetchJournalPage,
  fetchJournalOptions,
  type JournalOptions,
  type JournalQuery,
  deleteHistoryEntry,
  bulkDeleteHistoryEntries,
  sendHistoryExportEmail,
  type HistoryExportEmailRequest,
} from '../../../api/services/history.service';

import SortHistoryTasksModal, {
  HistorySortDir,
  HistorySortKey,
} from '../components/modals/SortHistoryTasksModal';
import FilterHistoryTasksModal, {
  HistoryFilters as HistoryFilterShape,
} from '../components/modals/FilterHistoryTasksModal';
import DeleteHistoryTasksModal, {
  HistoryDeletePayload,
} from '../components/modals/DeleteHistoryTasksModal';
import SendHistoryExportModal from '../components/modals/SendHistoryExportModal';

import { useSettings } from '../../../app/providers/SettingsProvider';

type RouteParams = {
  plantId?: string; // optional: when passed, show history for one plant
};

type HistoryFilters = HistoryFilterShape;

const INITIAL_FILTERS: HistoryFilters = {
  types: [],
  plantId: undefined,
  location: undefined,
  completedFrom: undefined,
  completedTo: undefined,
};

// Empty-state gradient (match Home)
const TAB_GREEN_DARK = 'rgba(5, 31, 24, 0.9)';
const TAB_GREEN_LIGHT = 'rgba(16, 80, 63, 0.9)';

function journalTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw';
  } catch {
    return 'Europe/Warsaw';
  }
}

export default function TaskHistoryScreen() {
  const { t, i18n } = useTranslation();
  const isFocused = useIsFocused();
  const focusedRef = useRef(isFocused);
  focusedRef.current = isFocused;

  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route?.params || {}) as RouteParams;
  const plantIdFilter = params.plantId;

  const { settings } = useSettings();
  const fabPosition = settings.fabPosition || 'right';

  const [items, setItems] = useState<JournalEntry[]>([]);
  const [options, setOptions] = useState<JournalOptions | null>(null);
  const optionsRef = useRef<JournalOptions | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageError, setPageError] = useState(false);
  const moreRequest = useRef<string | null>(null);
  const [canManageTasks, setCanManageTasks] = useState(false);
  const [ownedPlants, setOwnedPlants] = useState<JournalPlantOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVariant, setToastVariant] = useState<
    'default' | 'success' | 'error'
  >('default');

  const listRef = useRef<AnimatedFlatList<JournalEntry>>(null);
  const loadRequestRef = useRef(0);

  const showToast = (
    message: string,
    variant: 'default' | 'success' | 'error' = 'default',
  ) => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };

  // --- SORT / FILTER / DELETE / EXPORT STATE ---
  const [filters, setFilters] = useState<HistoryFilters>(INITIAL_FILTERS);
  const [sortKey, setSortKey] = useState<HistorySortKey>('completedAt');
  const [sortDir, setSortDir] = useState<HistorySortDir>('desc');
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<JournalPhotoItem | null>(
    null,
  );
  const [viewingPhoto, setViewingPhoto] = useState<JournalPhotoItem | null>(
    null,
  );
  const [deletingPhoto, setDeletingPhoto] = useState<JournalPhotoItem | null>(
    null,
  );
  const [photoDeleting, setPhotoDeleting] = useState(false);
  const [undoTask,setUndoTask]=useState<TaskHistoryItem|null>(null);

  const isFilterActive = useMemo(
    () =>
      Boolean(
        (filters.types && filters.types.length > 0) ||
          filters.plantId ||
          filters.location ||
          filters.completedFrom ||
          filters.completedTo,
      ),
    [filters],
  );

  // --- MENU STATE (only one open at a time, like Home / Reminders) ---
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [fabCloseSignal, setFabCloseSignal] = useState(0);

  const closeFloatingMenus = useCallback(() => {
    setOpenMenuId(null);
    setFabCloseSignal(value => value + 1);
  }, []);

  const closeFabMenu = useCallback(() => {
    setFabCloseSignal(value => value + 1);
  }, []);

  const onToggleMenu = useCallback((id: string) => {
    setFabCloseSignal(value => value + 1);
    setOpenMenuId(curr => (curr === id ? null : id));
  }, []);

  const query = useMemo<JournalQuery>(
    () => ({
      plantId: plantIdFilter || filters.plantId || undefined,
      location: filters.location || undefined,
      types: filters.types?.length ? filters.types : undefined,
      completedFrom: filters.completedFrom || undefined,
      completedTo: filters.completedTo || undefined,
      sortKey,
      sortDir,
      timezone: journalTimezone(),
    }),
    [plantIdFilter, filters, sortKey, sortDir],
  );

  const load = useCallback(
    async (refreshOptions = true) => {
      const requestId = ++loadRequestRef.current;
      moreRequest.current = null;
      setLoading(true);
      setLoadingMore(false);
      setPageError(false);
      setNextCursor(null);
      try {
        const [page, metadata] = await Promise.all([
          fetchJournalPage(query),
          refreshOptions || !optionsRef.current
            ? fetchJournalOptions()
            : Promise.resolve(optionsRef.current),
        ]);
        if (requestId !== loadRequestRef.current || !focusedRef.current) return;
        optionsRef.current = metadata;
        setOptions(metadata);
        setOwnedPlants(metadata.ownedPlants);
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setCanManageTasks(page.canManageTasks);
      } catch (error: any) {
        if (requestId !== loadRequestRef.current || !focusedRef.current) return;
        showToast(
          error?.message || t('taskHistory.toasts.failedToLoad'),
          'error',
        );
        setItems([]);
        setPageError(true);
        setCanManageTasks(false);
      } finally {
        if (requestId === loadRequestRef.current) setLoading(false);
      }
    },
    [query, t],
  );

  // A focus refresh reloads metadata too. Criteria changes only fetch the feed.
  useEffect(() => {
    if (!isFocused) return;
    closeFloatingMenus();
    setSortOpen(false);
    setFilterOpen(false);
    setDeleteOpen(false);
    setExportOpen(false);
    setPhotoOpen(false);
    setEditingPhoto(null);
    setViewingPhoto(null);
    setDeletingPhoto(null);
    setUndoTask(null);
    optionsRef.current = null;
    return () => {
      loadRequestRef.current += 1;
      moreRequest.current = null;
    };
  }, [isFocused, closeFloatingMenus]);
  useEffect(() => {
    if (!isFocused) return;
    void load(false);
    return () => {
      loadRequestRef.current += 1;
      moreRequest.current = null;
    };
  }, [isFocused, load]);

  const loadMore = useCallback(
    async (retry = false) => {
      if (
        !isFocused ||
        loading ||
        moreRequest.current ||
        !nextCursor ||
        (pageError && !retry)
      )
        return;
      const generation = loadRequestRef.current;
      const token = `${generation}:${nextCursor}`;
      moreRequest.current = token;
      setLoadingMore(true);
      setPageError(false);
      try {
        const page = await fetchJournalPage(query, nextCursor);
        if (generation !== loadRequestRef.current || !focusedRef.current)
          return;
        setItems(previous => {
          const seen = new Set(previous.map(journalEntryKey));
          return [
            ...previous,
            ...page.items.filter(item => !seen.has(journalEntryKey(item))),
          ];
        });
        setNextCursor(page.nextCursor);
        setCanManageTasks(page.canManageTasks);
      } catch {
        if (generation === loadRequestRef.current && focusedRef.current)
          setPageError(true);
      } finally {
        if (moreRequest.current === token) {
          moreRequest.current = null;
          setLoadingMore(false);
        }
      }
    },
    [isFocused, loading, nextCursor, pageError, query],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    closeFloatingMenus();
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [closeFloatingMenus, load]);

  const plantOptions = options?.plants ?? [];
  const locationOptions = options?.locations ?? [];

  const effectiveExportFilters = useMemo<HistoryExportEmailRequest>(() => {
    return {
      plantId: plantIdFilter || filters.plantId || undefined,
      location: filters.location || undefined,
      types: filters.types?.filter((type): type is TaskType => type !== 'photo')
        .length
        ? filters.types.filter((type): type is TaskType => type !== 'photo')
        : undefined,
      completedFrom: filters.completedFrom || undefined,
      completedTo: filters.completedTo || undefined,
      sortKey,
      sortDir,
    };
  }, [filters, plantIdFilter, sortKey, sortDir]);

  const exportPlantName = useMemo(() => {
    const effectivePlantId = effectiveExportFilters.plantId;
    if (!effectivePlantId) return undefined;

    const fromOptions = plantOptions.find(p => p.id === effectivePlantId)?.name;
    if (fromOptions) return fromOptions;

    const fromItems = items.find(
      item => String((item as any).plantId || '') === String(effectivePlantId),
    )?.plant;
    if (fromItems) return fromItems;

    return undefined;
  }, [effectiveExportFilters.plantId, plantOptions, items]);

  // Filtering and ordering are authoritative across the whole server feed.
  const derivedItems = items;

  const photoTargets = useMemo(
    () =>
      derivedItems
        .slice(0, 30)
        .filter(isJournalPhoto)
        .map(item => ({
          photo: item.photo,
          variant: 'display' as const,
          expiresAt: item.access?.expires_at,
        })),
    [derivedItems],
  );
  const photoPreload = usePlantPhotoPreload(photoTargets, !loading);
  const contentLoading = loading || photoPreload.loading;

  // ---------- ENTRANCE ANIMATION (tiles) ----------
  const animatedIds = useRef(new Set<string>());
  const animMapRef = useRef<Map<string, Animated.Value>>(new Map());
  const getAnimForId = (id: string) => {
    const m = animMapRef.current;
    if (!m.has(id)) m.set(id, new Animated.Value(0));
    return m.get(id)!;
  };

  useEffect(() => {
    if (contentLoading) return;
    const ids = derivedItems.map(journalEntryKey);
    const freshIds = ids.filter(id => !animatedIds.current.has(id));
    freshIds.forEach(id => animatedIds.current.add(id));

    const seq = freshIds.map((id, i) =>
      Animated.timing(getAnimForId(id), {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
        delay: Math.min(i, 5) * 50,
      }),
    );
    Animated.stagger(50, seq).start();
  }, [contentLoading, derivedItems]);

  // ---------- EMPTY-STATE FRAME ANIMATION ----------
  const emptyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (contentLoading) {
      emptyAnim.setValue(0);
      return;
    }

    if (derivedItems.length === 0) {
      emptyAnim.setValue(0);
      Animated.timing(emptyAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else {
      emptyAnim.setValue(0);
    }
  }, [contentLoading, derivedItems.length, emptyAnim]);

  const emptyTranslateY = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const emptyScale = emptyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });
  const emptyOpacity = emptyAnim;

  const showFAB =
    !contentLoading &&
    !sortOpen &&
    !filterOpen &&
    !deleteOpen &&
    !exportOpen &&
    !undoTask && !photoOpen &&
    !deletingPhoto &&
    !viewingPhoto;

  // FAB actions
  const canManageVisibleHistory = canManageTasks;
  const activePlantId = plantIdFilter || filters.plantId;
  const canAddPhoto =
    ownedPlants.length > 0 &&
    (!activePlantId ||
      ownedPlants.some(plant => plant.id === String(activePlantId)));
  const baseFabActions = [
    ...(canAddPhoto
      ? [
          {
            key: 'addPhoto',
            label: t('taskHistory.photo.add', { defaultValue: 'Add photo' }),
            icon: 'camera-plus-outline',
            onPress: () => {
              closeFloatingMenus();
              setEditingPhoto(null);
              setPhotoOpen(true);
            },
          },
        ]
      : []),
    {
      key: 'sort',
      label: t('taskHistory.fab.sort'),
      icon: 'sort',
      onPress: () => setSortOpen(true),
    },
    {
      key: 'filter',
      label: t('taskHistory.fab.filter'),
      icon: 'filter-variant',
      onPress: () => setFilterOpen(true),
    },
    ...(canManageVisibleHistory
      ? [
          {
            key: 'sendExport',
            label: t('taskHistory.fab.sendExport'),
            icon: 'email-send-outline',
            onPress: () => {
              setOpenMenuId(null);
              setExportOpen(true);
            },
          },
          {
            key: 'delete',
            label: t('taskHistory.fab.delete'),
            icon: 'delete-outline',
            onPress: () => setDeleteOpen(true),
          },
        ]
      : []),
    ...(isFilterActive
      ? [
          {
            key: 'clearFilter',
            label: t('taskHistory.fab.clearFilter'),
            icon: 'filter-remove',
            onPress: () => setFilters(INITIAL_FILTERS),
          } as const,
        ]
      : []),
  ];

  const fabActions = [
    ...baseFabActions,
    ...(plantIdFilter
      ? [
          {
            key: 'showAllHistory',
            label: t('taskHistory.fab.showAllHistory'),
            icon: 'filter-remove',
            onPress: () => {
              // clear any in-screen filters and remove the route-level plant filter
              setFilters(INITIAL_FILTERS);
              setOpenMenuId(null);
              nav.navigate('TaskHistory' as never);
            },
          } as const,
        ]
      : []),
  ];

  const handleConfirmDelete = async (payload: HistoryDeletePayload) => {
    setDeleteOpen(false);
    setOpenMenuId(null);

    try {
      setLoading(true);
      setItems([]);
      await bulkDeleteHistoryEntries(payload as any);
      await load();
      showToast(t('taskHistory.toasts.historyDeleted'), 'success');
    } catch (e: any) {
      setLoading(false);
      showToast(
        e?.message || t('taskHistory.toasts.failedToDeleteHistory'),
        'error',
      );
    }
  };

  const handleSendExport = async (includePending: boolean) => {
    if (!canManageVisibleHistory) return;
    setOpenMenuId(null);

    try {
      setExporting(true);

      await sendHistoryExportEmail({
        ...effectiveExportFilters,
        includePending,
        lang: i18n.language,
      });

      setExportOpen(false);
      showToast(t('taskHistory.toasts.exportSent'), 'success');
    } catch (e: any) {
      if (e?.status === 404) {
        showToast(t('taskHistory.toasts.exportNotAvailableYet'), 'error');
      } else {
        showToast(
          e?.message || t('taskHistory.toasts.failedToSendExport'),
          'error',
        );
      }
    } finally {
      setExporting(false);
    }
  };

  // Tile menu actions
  const handleDeleteItem = async (item: TaskHistoryItem) => {
    if (!plantAccess(item.access).canEdit) return;
    setOpenMenuId(null);
    try {
      setLoading(true);
      setItems([]);
      await deleteHistoryEntry(item.id);
      await load();
      showToast(t('taskHistory.toasts.historyTaskDeleted'), 'success');
    } catch (e: any) {
      setLoading(false);
      showToast(
        e?.message || t('taskHistory.toasts.failedToDeleteHistoryTask'),
        'error',
      );
    }
  };

  const handleEditHistoryReminder = (item: TaskHistoryItem) => {
    setOpenMenuId(null);
    const reminderId = item.reminderId;

    if (reminderId && reminderId.trim() !== '') {
      nav.navigate(
        'Reminders' as never,
        { editReminderId: reminderId.trim() } as never,
      );
    } else {
      nav.navigate('Reminders' as never);
    }
  };

  const handleGoToPlant = (item: JournalEntry) => {
    setOpenMenuId(null);

    const plantId = item.plantId;
    if (!plantId) {
      showToast(t('taskHistory.toasts.taskNotLinkedToPlant'), 'error');
      return;
    }

    nav.navigate('PlantDetails' as never, { id: String(plantId) } as never);
  };

  const handleEditPhoto = (item: JournalPhotoItem) => {
    if (!plantAccess(item.access).canEdit) return;
    closeFloatingMenus();
    setEditingPhoto(item);
    setPhotoOpen(true);
  };

  const handleConfirmDeletePhoto = async () => {
    const target = deletingPhoto;
    if (!target || photoDeleting || !plantAccess(target.access).canEdit) return;
    setPhotoDeleting(true);
    try {
      await deleteJournalPhoto(target);
      setDeletingPhoto(null);
      await load();
      showToast(
        t('taskHistory.photo.deleted', { defaultValue: 'Photo deleted.' }),
        'success',
      );
    } catch (error: any) {
      showToast(
        error?.message ||
          t('taskHistory.photo.deleteFailed', {
            defaultValue: 'Could not delete the photo. Try again.',
          }),
        'error',
      );
    } finally {
      setPhotoDeleting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title={t('taskHistory.header.title')}
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        showSeparator={false}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate('Scanner' as never)}
      />

      {/* Keep editors mounted when camera/gallery foregrounding revalidates photos. */}
      {contentLoading ? (
        <CenteredSpinner size={56} color="#FFFFFF" />
      ) : (
        <>
          {/* Backdrop to dismiss menus (kept under FlatList so menus stay above) */}
          {openMenuId && (
            <View
              style={s.backdrop}
              pointerEvents="auto"
              onStartShouldSetResponder={() => {
                closeFloatingMenus();
                return true;
              }}
            />
          )}

          <AnimatedFlatList
            ref={listRef}
            style={{ flex: 1 }}
            data={derivedItems}
            onEndReached={() => {
              void loadMore();
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              <View style={{ paddingBottom: 180 }}>
                {loadingMore ? (
                  <View style={{ height: 60 }}>
                    <CenteredSpinner size={28} />
                  </View>
                ) : pageError ? (
                  <Pressable
                    accessibilityRole="button"
                    style={{ padding: 20 }}
                    onPress={() => {
                      if (nextCursor) void loadMore(true);
                      else void load();
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>
                      {t('taskHistory.photo.retry', {
                        defaultValue: 'Try again',
                      })}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            }
            keyExtractor={journalEntryKey}
            renderItem={({ item }) => {
              const entryKey = journalEntryKey(item);
              const v = getAnimForId(entryKey);
              const translateY = v.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              });
              const scale = v.interpolate({
                inputRange: [0, 1],
                outputRange: [0.98, 1],
              });
              const opacity = v;

              const isOpen = openMenuId === entryKey;

              return (
                <AnimatedView
                  style={[
                    { opacity, transform: [{ translateY }, { scale }] },
                    isOpen && { zIndex: 50, elevation: 50 },
                  ]}
                >
                  {isJournalPhoto(item) ? (
                    <JournalPhotoTile
                      item={item}
                      isMenuOpen={isOpen}
                      onToggleMenu={() => onToggleMenu(entryKey)}
                      onViewPhoto={() => {
                        closeFloatingMenus();
                        setViewingPhoto(item);
                      }}
                      onEdit={() => handleEditPhoto(item)}
                      onPlantDetails={() => handleGoToPlant(item)}
                      onDelete={() => {
                        closeFloatingMenus();
                        if (plantAccess(item.access).canEdit)
                          setDeletingPhoto(item);
                      }}
                    />
                  ) : (
                    <TaskHistoryTile
                      item={item}
                      isMenuOpen={isOpen}
                      onToggleMenu={() => onToggleMenu(entryKey)}
                      onPressBody={closeFabMenu}
                      onUndo={target=>{if(!plantAccess(target.access).canEdit || !target.undoCompletion)return;closeFloatingMenus();setUndoTask(target);}}
                      onDelete={handleDeleteItem}
                      onEditReminder={handleEditHistoryReminder}
                      onGoToPlant={handleGoToPlant}
                    />
                  )}
                </AnimatedView>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListHeaderComponent={<View style={{ height: 0 }} />}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onScrollBeginDrag={() => {
              closeFloatingMenus();
            }}
            ListEmptyComponent={
              !loading ? (
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
                        name="history"
                        size={26}
                        color="#FFFFFF"
                        style={{ marginBottom: 10 }}
                      />
                      <Text style={s.emptyTitle}>
                        {t('taskHistory.empty.title')}
                      </Text>
                      <View style={s.emptyDescBox}>
                        <Text style={s.emptyText}>
                          {t('taskHistory.empty.descBeforeBold')}{' '}
                          <Text style={s.inlineBold}>
                            {t('taskHistory.empty.bold')}
                          </Text>{' '}
                          {t('taskHistory.empty.descAfterBold')}
                          {'\n\n'}
                          {plantIdFilter
                            ? t('taskHistory.empty.filteredToPlantId', {
                                plantId: plantIdFilter,
                              })
                            : t('taskHistory.empty.openFromTaskHint')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </AnimatedView>
              ) : null
            }
          />

          {/* FAB: Sort / Filter / Send export / Delete / Clear filter / Show all history (when plantIdFilter) */}
        </>
      )}
      {showFAB && (
        <View
          onStartShouldSetResponderCapture={() => {
            setOpenMenuId(null);
            return false;
          }}
        >
          <FAB
            actions={fabActions}
            closeSignal={fabCloseSignal}
            position={fabPosition}
            onInteraction={() => setOpenMenuId(null)}
          />
        </View>
      )}

      {/* Sort modal */}
      <SortHistoryTasksModal
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
          setSortKey('completedAt');
          setSortDir('desc');
          setSortOpen(false);
        }}
      />

      {/* Filter modal */}
      <FilterHistoryTasksModal
        visible={filterOpen}
        plants={plantOptions}
        locations={locationOptions}
        filters={filters}
        onCancel={() => setFilterOpen(false)}
        onClearAll={() => setFilters(INITIAL_FILTERS)}
        onApply={nextFilters => {
          setFilters(nextFilters);
          setFilterOpen(false);
        }}
      />

      {/* Export modal */}
      <SendHistoryExportModal
        visible={exportOpen}
        effectiveFilters={effectiveExportFilters}
        plantName={exportPlantName}
        sending={exporting}
        onCancel={() => {
          if (!exporting) setExportOpen(false);
        }}
        onSend={handleSendExport}
      />

      {/* Delete modal */}
      <DeleteHistoryTasksModal
        visible={deleteOpen}
        plantOptions={options?.deletePlants ?? []}
        locationOptions={options?.deleteLocations ?? []}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      <UndoTaskCompletionModal visible={isFocused && !!undoTask} item={undoTask}
        onClose={()=>setUndoTask(null)}
        onSaved={()=>{showToast(String(t('taskHistory.undo.saved',{defaultValue:'Completion undone. The task is back in Home.'})),'success');void load();}}
        onConflict={()=>{showToast(String(t('taskHistory.undo.unavailable',{defaultValue:'This task changed and can no longer be undone. Reloading the journal.'})),'error');void load();}}/>

      <JournalPhotoModal
        visible={photoOpen}
        entry={editingPhoto}
        plantOptions={ownedPlants}
        preferredPlantId={plantIdFilter || filters.plantId}
        onClose={(refresh?: boolean) => {
          setPhotoOpen(false);
          setEditingPhoto(null);
          if (refresh) void load();
        }}
        onSaved={() => {
          setPhotoOpen(false);
          setEditingPhoto(null);
          void load().then(() =>
            showToast(
              t('taskHistory.photo.saved', {
                defaultValue: 'Photo saved to the journal.',
              }),
              'success',
            ),
          );
        }}
      />

      <ConfirmDeleteJournalPhotoModal
        visible={!!deletingPhoto}
        busy={photoDeleting}
        onClose={() => {
          if (!photoDeleting) setDeletingPhoto(null);
        }}
        onConfirm={handleConfirmDeletePhoto}
      />

      <ViewJournalPhotoModal
        visible={!!viewingPhoto}
        entry={viewingPhoto}
        onClose={() => setViewingPhoto(null)}
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
