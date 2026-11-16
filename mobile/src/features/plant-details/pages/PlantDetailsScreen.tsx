import { useWateringSchedule } from '../../readings/hooks/useWateringSchedule';
import { usePlantEditor } from '../../plants/hooks/usePlantEditor';
import { ScreenLoadingSpinner } from '../../../shared/ui/HeaderPresentation';
import { taskCompletionToast } from '../../../shared/utils/taskCompletionToast';
import useStableScrollHeight from '../../../shared/hooks/useStableScrollHeight';
import { useRequestGuard } from '../../../shared/hooks/useRequestGuard';
import SlidingSegments from '../../../shared/ui/SlidingSegments';
import React, { useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, Alert, ScrollView, PermissionsAndroid, Platform, StyleSheet, AnimatedView, Pressable } from '../../../shared/theme/native';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  useIsFocused,
} from '@react-navigation/native';
import LinearGradient from '../../../shared/theme/Gradient';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../app/providers/LanguageProvider';

import GlassHeader from '../../../shared/ui/GlassHeader';

import {
  HEADER_GRADIENT_TINT,
  HEADER_SOLID_FALLBACK,
} from '../constants/plant-details.constants';
import { s } from '../styles/plant-details.styles';

import {
  fetchPlantDetailsById,
  fetchPlantDetailsByQr,
} from '../../../api/services/plant-details.service';
import { sendQrCodeByEmail } from '../../../api/services/qr-code.service';
import { fetchPlantProfile } from '../../../api/services/plant-definitions.service';

import type {
  PlantMetricKey,
  PlantDetailsComposite,
  LatestReadings,
} from '../types/plant-details.types';

import PlantLatestReadingsTile from '../components/PlantLatestReadingsTile';
import PlantTasksTile from '../components/PlantTasksTile';
import PlantQrModal from '../../plants/components/modals/PlantQrModal';
import PlantInfoTile from '../components/PlantInfoTile';

import { plantAccess } from '../../../shared/utils/plantAccess';

import PostponeTaskModal, {
  type PostponeTaskTarget,
} from '../../home/components/modals/PostponeTaskModal';
import CompleteTaskModal from '../../home/components/modals/CompleteTaskModal';
import { markHomeTaskComplete } from '../../../api/services/home.service';

import RNFS from 'react-native-fs';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

import TopSnackbar from '../../../shared/ui/TopSnackbar';
import CenteredSpinner from '../../../shared/ui/CenteredSpinner';
import { usePlantPhotoPreload } from '../../../shared/hooks/usePlantPhotoPreload';
import { useScreenEntryAnimation } from '../../../shared/hooks/useScreenEntryAnimation';

import PlantDefinitionModal from '../components/modals/PlantDefinitionModal';
import ChangePlantImageModal from '../components/modals/ChangePlantImageModal';
import EditPlantModal from '../../plants/components/modals/EditPlantModal';

import {
} from '../../../api/services/plant-instances.service';

import WateringScheduleModal from '../../readings/components/modals/WateringScheduleModal';
import {
} from '../../../api/services/readings.service';

import { PUBLIC_BASE_URL_NORM } from '../../../config';

const TAB_GREEN_DARK = 'rgba(5, 31, 24, 0.9)';
const TAB_GREEN_LIGHT = 'rgba(16, 80, 63, 0.9)';



function toYYYYMMDD(d: Date = new Date()) {
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  return `${Y}-${M}-${D}`;
}

export default function PlantDetailsScreen() {
  const requestGuard = useRequestGuard();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: Record<string, unknown>) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = typeof txt !== 'string' || !txt || txt === key;
      return (
        (isMissing ? undefined : txt) || fallback || key.split('.').pop() || key
      );
    },
    [t, currentLanguage],
  );

  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();

  const qrFromNav: string | undefined = route.params?.qrCode;
  const idFromNav: number | undefined =
    route.params?.plantId ?? route.params?.id;

  const stableScroll = useStableScrollHeight(
    String(idFromNav ?? qrFromNav ?? 'plant'),
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'reminders' | 'readings'>(
    'info',
  );
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [detailsRevision, setDetailsRevision] = useState(0);
  const [readyImageKey, setReadyImageKey] = useState<string | null>(null);
  const [details, setDetails] = useState<PlantDetailsComposite | null>(null);
  const [definitionData, setDefinitionData] = useState<{
    profile: Awaited<ReturnType<typeof fetchPlantProfile>> | null;
    error: string | null;
  }>({ profile: null, error: null });
  const [error, setError] = useState<string>('');

  const [postponeTask, setPostponeTask] = useState<PostponeTaskTarget | null>(
    null,
  );
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [completeReminderId, setCompleteReminderId] = useState<string | null>(
    null,
  );
  const [completeNote, setCompleteNote] = useState('');
  const [completeDate, setCompleteDate] = useState(toYYYYMMDD());

  const [completeIsOverdue, setCompleteIsOverdue] = useState(false);
  const [completeIntervalText, setCompleteIntervalText] = useState<string>('');

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVariant, setToastVariant] = useState<
    'default' | 'success' | 'error'
  >('default');

  const [refreshCounter, setRefreshCounter] = useState(0);
  const [dismissMenusTick, setDismissMenusTick] = useState(0);

  const dismissMenus = useCallback(() => {
    setDismissMenusTick(t => t + 1);
  }, []);

  const scrollRef = useRef<ScrollView | null>(null);
  const plantQrRef = useRef<any>(null);

  const [defModalVisible, setDefModalVisible] = useState(false);
  const [defPlantDefinitionId, setDefPlantDefinitionId] = useState<
    number | null
  >(null);

  const openDefinition = useCallback((plantDefinitionId: number) => {
    setDefPlantDefinitionId(plantDefinitionId);
    setDefModalVisible(true);
  }, []);

  const closeDefinition = useCallback(() => {
    setDefModalVisible(false);
    setDefPlantDefinitionId(null);
  }, []);

  const [changeImgVisible, setChangeImgVisible] = useState(false);
  const [changeImgPlantId, setChangeImgPlantId] = useState<string | null>(null);

  const [photoReloadSignal, setPhotoReloadSignal] = useState(0);

  const openChangeImage = useCallback(
    (plantId: string) => {
      if (!details || !plantAccess(details.plant.access).canEdit) return;
      setChangeImgPlantId(plantId);
      setChangeImgVisible(true);
    },
    [details],
  );

  const closeChangeImage = useCallback(() => {
    setChangeImgVisible(false);
    setChangeImgPlantId(null);
  }, []);



  const showToast = (
    message: string,
    variant: 'default' | 'success' | 'error' = 'default',
  ) => {
    setToastMsg(message);
    setToastVariant(variant);
    setToastVisible(true);
  };

  const startOfTodayMs = useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const normDateMs = useCallback((val: any) => {
    const d = val instanceof Date ? val : new Date(val);
    return d.getTime();
  }, []);

  const isReminderOverdue = useCallback(
    (r: any) => {
      const due = r?.dueDate;
      if (!due) return false;
      const ms = normDateMs(due);
      return Number.isFinite(ms) && ms < startOfTodayMs();
    },
    [normDateMs, startOfTodayMs],
  );

  const buildIntervalText = useCallback(
    (r: any) => {
      const v = r?.intervalValue;
      const u = r?.intervalUnit;
      if (!v || !u) return '';

      const maybe = t(`homeModals.interval.${u}`, { count: v });
      if (
        typeof maybe === 'string' &&
        maybe.startsWith('homeModals.interval.')
      ) {
        const unitLabel =
          u === 'days'
            ? v === 1
              ? 'day'
              : 'days'
            : v === 1
            ? 'month'
            : 'months';
        return `+${v} ${unitLabel}`;
      }
      return maybe;
    },
    [t],
  );

  const loadDetails = useCallback(async () => {
    const isCurrent = requestGuard.begin();
    if (!qrFromNav && !idFromNav) {
      throw new Error(
        tr('plantDetails.errors.noId', 'No plant id or QR code provided.'),
      );
    }

    const full = qrFromNav
      ? await fetchPlantDetailsByQr(qrFromNav)
      : await fetchPlantDetailsById(Number(idFromNav));
    let definition: typeof definitionData = { profile: null, error: null };
    const definitionId = full.plant.plant_definition?.id;
    if (definitionId) {
      try {
        definition.profile = await fetchPlantProfile(definitionId, {
          auth: true,
          lang: String(currentLanguage || 'en')
            .trim()
            .toLowerCase()
            .split('-')[0],
        });
      } catch (e: any) {
        definition.error =
          e?.message ||
          tr(
            'plantDetailsModals.definition.loadFailed',
            'Failed to load plant definition.',
          );
      }
    }
    if (!isCurrent()) return;
    setDefinitionData(definition);
    setDetails(full);
    setDetailsRevision(value => value + 1);
  }, [qrFromNav, idFromNav, tr, currentLanguage, requestGuard]);

  const qrCodeValue = useMemo(() => {
    const code = details?.plant.qr_code || qrFromNav || '';
    if (!code) return '';
    return `${PUBLIC_BASE_URL_NORM}/plant-instances/by-qr/?code=${encodeURIComponent(
      code,
    )}`;
  }, [details, qrFromNav]);

  const onSaveQr = async (svgRef: any) => {
    if (!svgRef?.toDataURL) {
      throw new Error(
        tr('plantDetails.qrErrors.rendererNotReady', 'QR renderer not ready.'),
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
          title: tr(
            'plantDetails.permissions.storage.title',
            'Storage permission',
          ),
          message: tr(
            'plantDetails.permissions.storage.message',
            'We need access to save the QR code to your gallery.',
          ),
          buttonPositive: tr('plantDetails.permissions.storage.ok', 'OK'),
        },
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error(
          tr(
            'plantDetails.permissions.storage.denied',
            'Storage permission denied.',
          ),
        );
      }
    }

    await CameraRoll.save(filePath, { type: 'photo' });
  };

  const goHistory = (metric?: PlantMetricKey) => {
    const deviceId = details?.readingDevice?.id;

    nav.navigate('ReadingsHistory', {
      metric: metric || 'temperature',
      range: 'day',
      id: deviceId ? String(deviceId) : undefined,
      name:
        details?.plant.display_name ||
        details?.plant.plant_definition?.name ||
        tr('plantDetails.common.plant', 'Plant'),
    });
  };

  const plantEditor = usePlantEditor({
    onBeforeOpen: dismissMenus,
    onSaved: async () => {
      await loadDetails();
      setRefreshCounter(counter => counter + 1);
      showToast(t('plants.toast.updated', { defaultValue: 'Plant updated' }), 'success');
    },
  });
  const { open: openEditModal, close: closeEdit, loading: editLoading, saving } = plantEditor;

  const watering = useWateringSchedule({
    translationScope: 'plantDetails',
    onBeforeOpen: dismissMenus,
    onNotify: showToast,
    onStatusChanged: (id, status) => {
      setDetails(previous => {
        if (!previous?.readingDevice || String(previous.readingDevice.id) !== id) return previous;
        return { ...previous, readingDevice: {
          ...previous.readingDevice, pumpIncluded: status.pump_included,
          lastPumpRunAt: status.last_pump_run_at ?? null,
          lastPumpRunSource: status.last_pump_run_source ?? null,
          pendingPumpTask: status.pending_pump_task ?? null,
        } };
      });
    },
  });
  const { open: openWateringSchedule, close: closeWateringSchedule, loading: wateringScheduleLoading } = watering;


  useFocusEffect(
    useCallback(() => {
      setActiveTab('info');
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      requestGuard.activate();

      const run = async () => {
        try {
          setDismissMenusTick(t => t + 1);
          setDetails(null);

          setLoading(true);
          setError('');

          await loadDetails();
          if (isActive) {
            setRefreshCounter(c => c + 1);
            requestAnimationFrame(() => {
              scrollRef.current?.scrollTo({ y: 0, animated: false });
            });
          }
        } catch (e: any) {
          if (!isActive) return;
          setError(
            e?.message ||
              tr('plantDetails.errors.failedToLoad', 'Failed to load plant.'),
          );
          setDetails(null);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      run();

      return () => {
        isActive = false;
        requestGuard.invalidate();

        setDismissMenusTick(t => t + 1);

        setToastVisible(false);
        setCompleteModalVisible(false);
        setPostponeTask(null);
        setCompleteReminderId(null);
        setCompleteNote('');

        setCompleteIsOverdue(false);
        setCompleteIntervalText('');

        closeDefinition();
        closeChangeImage();
        closeEdit();
        closeWateringSchedule();

        plantQrRef.current = null;
        setQrModalVisible(false);
      };
    }, [
      loadDetails,
      requestGuard,
      tr,
      closeDefinition,
      closeChangeImage,
      closeEdit,
      closeWateringSchedule,
    ]),
  );

  const latestRead = details?.latestReadings ?? null;
  const reminders = details?.reminders ?? [];

  const showLatestReadingsTile = !!details && details.deviceLinked;

  const latestReadSafe: LatestReadings = latestRead ?? {
    temperature: null,
    humidity: null,
    light: null,
    moisture: null,
    tsISO: null,
  };

  const latinOptions = useMemo(() => {
    const set = new Set<string>();
    const latin = details?.plant?.plant_definition?.latin;
    if (latin) set.add(latin);
    return Array.from(set);
  }, [details]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    const location = details?.plant?.location?.name;
    if (location) set.add(location);
    return Array.from(set);
  }, [details]);

  const openCompleteModal = (reminderId: string) => {
    if (!details || !plantAccess(details.plant.access).canCompleteTasks) return;
    setCompleteReminderId(reminderId);
    setCompleteNote('');
    setCompleteDate(toYYYYMMDD());

    const r = details?.reminders?.find(x => x.taskId === reminderId);
    const overdue = r ? isReminderOverdue(r) : false;
    setCompleteIsOverdue(overdue);
    setCompleteIntervalText(r ? buildIntervalText(r) : '');

    setCompleteModalVisible(true);
  };

  const closeCompleteModal = () => {
    setCompleteModalVisible(false);
    setCompleteReminderId(null);
    setCompleteNote('');
    setCompleteDate(toYYYYMMDD());

    setCompleteIsOverdue(false);
    setCompleteIntervalText('');
  };

  const handleConfirmComplete = async () => {
    if (!completeReminderId || !details) {
      closeCompleteModal();
      return;
    }

    try {
      setLoading(true);

      const r = details.reminders.find(x => x.taskId === completeReminderId);
      let xpGained = 0;
      if (r?.taskId) {
        xpGained = await markHomeTaskComplete(r.taskId, completeNote, completeDate);
      }

      closeCompleteModal();

      await loadDetails();
      setRefreshCounter(c => c + 1);

      showToast(
        taskCompletionToast(t, xpGained),
        'success',
      );
    } catch (e: any) {
      closeCompleteModal();
      Alert.alert(
        tr('plantDetails.alerts.completeFailed.title', 'Complete failed'),
        e?.message
          ? String(e.message)
          : tr(
              'plantDetails.alerts.completeFailed.msg',
              'Could not complete this reminder.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  const photoTargets = useMemo(
    () => [
      {
        photo: details?.plant.photo,
        variant: 'display' as const,
        expiresAt: details?.plant.access?.expires_at,
      },
    ],
    [details?.plant.photo, details?.plant.access?.expires_at],
  );
  const photoPreload = usePlantPhotoPreload(
    photoTargets,
    !loading && !error,
    photoReloadSignal,
  );
  const imageReadyKey = `${
    details?.plant.id ?? ''
  }:${detailsRevision}:${photoReloadSignal}`;
  const onImageReadyChange = useCallback(
    (ready: boolean) => {
      setReadyImageKey(ready ? imageReadyKey : null);
    },
    [imageReadyKey],
  );
  const isInitialLoading =
    !error &&
    (loading ||
      photoPreload.loading ||
      (!!details && readyImageKey !== imageReadyKey));
  const entryStyle = useScreenEntryAnimation(!isInitialLoading, isFocused);

  return (
    <View style={{ flex: 1 }}>
      <GlassHeader
        title={tr('plantDetails.headerTitle', 'Plant details')}
        gradientColors={HEADER_GRADIENT_TINT}
        solidFallback={HEADER_SOLID_FALLBACK}
        rightIconName="qrcode-scan"
        onPressRight={() => nav.navigate('Scanner')}
        showSeparator={false}
        segment={
          <SlidingSegments
            testID="plant-detail-header-segments"
            selectedIndex={['info', 'reminders', 'readings'].indexOf(activeTab)}
            style={styles.headerSegments}
          >
            {(['info', 'reminders', 'readings'] as const).map(tab => (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab }}
                onPress={() => {
                  dismissMenus();
                  setActiveTab(tab);
                }}
                style={styles.headerSegment}
              >
                <Text
                  style={styles.headerSegmentText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {tr(
                    `plantDetails.segments.${tab}`,
                    tab === 'info'
                      ? 'Info'
                      : tab === 'reminders'
                      ? 'Tasks'
                      : 'Readings',
                  )}
                </Text>
              </Pressable>
            ))}
          </SlidingSegments>
        }
      />

      <View style={{ flex: 1 }}>
        <AnimatedView
          testID="plant-details-content"
          pointerEvents={isInitialLoading ? 'none' : 'auto'}
          accessibilityElementsHidden={isInitialLoading}
          importantForAccessibility={
            isInitialLoading ? 'no-hide-descendants' : 'auto'
          }
          style={[{ flex: 1 }, entryStyle, isInitialLoading && { opacity: 0 }]}
        >
          {error ? (
            <View style={styles.centerBox}>
              <Text style={styles.title}>
                {tr('plantDetails.states.error.title', 'Error')}
              </Text>
              <Text style={styles.dim}>{error}</Text>
            </View>
          ) : !details ? (
            <View style={styles.centerBox}>
              <Text style={styles.title}>
                {tr('plantDetails.states.notFound.title', 'Not found')}
              </Text>
              <Text style={styles.dim}>
                {tr(
                  'plantDetails.states.notFound.msg',
                  'We couldn’t load this plant.',
                )}
              </Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              onContentSizeChange={stableScroll.onContentSizeChange}
              contentContainerStyle={{
                minHeight: stableScroll.minHeight,
                paddingBottom: 24,
                paddingHorizontal: 16,
                paddingTop: 21,
              }}
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={() => setDismissMenusTick(t => t + 1)}
            >
              <GlassFrame>
                {details?.plant ? (
                  <PlantInfoTile
                    segmentInHeader
                    plant={details.plant}
                    activeTab={activeTab}
                    tabContent={
                      activeTab === 'reminders' ? (
                        <PlantTasksTile
                          access={details.plant.access}
                          key={refreshCounter}
                          collapseMenusSignal={dismissMenusTick}
                          reminders={reminders}
                          activity={details.activity ?? []}
                          onMarkComplete={reminderId =>
                            openCompleteModal(reminderId)
                          }
                          onPostpone={reminderId => {
                            const reminder = details.reminders.find(
                              item => item.taskId === reminderId,
                            );
                            if (
                              !plantAccess(details.plant.access).canEdit ||
                              !reminder?.taskId ||
                              !reminder.dueDate
                            )
                              return;
                            dismissMenus();
                            setPostponeTask({
                              id: reminder.taskId,
                              dueDate: reminder.dueDate,
                              plant:
                                details.plant.display_name ||
                                details.plant.plant_definition?.name ||
                                '',
                            });
                          }}
                          onEditReminder={reminderId => {
                            nav.navigate('Reminders', {
                              editReminderId: String(reminderId),
                            });
                          }}
                          onShowHistory={() => {
                            nav.navigate('TaskHistory', {
                              plantId: String(details.plant.id),
                            });
                          }}
                        />
                      ) : activeTab === 'readings' ? (
                        <View style={{ gap: 16 }}>
                          {showLatestReadingsTile ? (
                            <PlantLatestReadingsTile
                              embedded
                              latestReadings={latestReadSafe}
                              summary24h={details.summary24h}
                              sensors={details.sensors}
                              onTileTouch={dismissMenus}
                              onMetricPress={metric => goHistory(metric)}
                              pumpIncluded={
                                Boolean(details.readingDevice?.pumpIncluded) &&
                                plantAccess(details.plant.access).isOwner
                              }
                              lastPumpLaunchDate={
                                details.readingDevice?.lastPumpRunAt ?? null
                              }
                              hasPendingWatering={Boolean(
                                details.readingDevice?.pendingPumpTask,
                              )}
                              onScheduleWatering={() =>
                                openWateringSchedule(
                                  details.readingDevice?.id ?? null,
                                )
                              }
                              isSchedulingWatering={wateringScheduleLoading}
                            />
                          ) : (
                            <View>
                              <Text style={styles.dim}>
                                {tr(
                                  'plantDetails.tabsEmpty.device',
                                  'No device is linked to this plant.',
                                )}
                              </Text>
                            </View>
                          )}
                          {!showLatestReadingsTile && (
                            <View style={{ gap: 12 }}>
                              <Text style={styles.readingsHelp}>
                                {tr(
                                  'plantDetails.readingsHelp.device',
                                  'In Readings, the plant owner can link an Arduino or ESP board and choose its sensors. Open the device menu, select Device details, then Email code to request sample code configured for that device.',
                                )}
                              </Text>
                              <Text style={styles.readingsHelp}>
                                {tr(
                                  'plantDetails.readingsHelp.charts',
                                  'Once readings arrive, tap a measurement icon or value to open its day, week or month chart.',
                                )}
                              </Text>
                              <Text style={styles.readingsHelp}>
                                {tr(
                                  'plantDetails.readingsHelp.pump',
                                  'With a connected pump and relay, the owner can schedule watering for a chosen duration or enable automatic watering below a soil-moisture threshold. Pump support, runtime and the automatic-watering cooldown are configured in the device settings.',
                                )}
                              </Text>
                            </View>
                          )}
                        </View>
                      ) : undefined
                    }
                    onTabChange={tab => {
                      dismissMenus();
                      setActiveTab(tab);
                    }}
                    onShowQr={() => setQrModalVisible(true)}
                    collapseMenusSignal={dismissMenusTick}
                    onTileTouch={dismissMenus}
                    photoReloadSignal={photoReloadSignal}
                    onImageReadyChange={onImageReadyChange}
                    onOpenDefinition={plantDefinitionId => {
                      setDismissMenusTick(t => t + 1);
                      openDefinition(plantDefinitionId);
                    }}
                    onOpenEditPlant={plantId => {
                      setDismissMenusTick(t => t + 1);
                      openEditModal(plantId);
                    }}
                    onOpenChangeImage={plantId => {
                      setDismissMenusTick(t => t + 1);
                      openChangeImage(plantId);
                    }}
                  />
                ) : (
                  <View>
                    <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>
                      {tr('plantDetails.info.loading', 'Loading…')}
                    </Text>
                  </View>
                )}
              </GlassFrame>

              {activeTab === 'info' && details.plant.plant_definition?.id && (
                <GlassFrame>
                  <PlantDefinitionModal
                    visible
                    embedded
                    definitionData={definitionData}
                    onClose={() => {}}
                    plantDefinitionId={details.plant.plant_definition.id}
                  />
                </GlassFrame>
              )}

              <View style={{ height: 120 }} />
            </ScrollView>
          )}
        </AnimatedView>
        {isInitialLoading && <ScreenLoadingSpinner overlay />}
      </View>

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

      {!!qrCodeValue &&
        details &&
        plantAccess(details.plant.access).isOwner && (
          <PlantQrModal
            visible={qrModalVisible}
            onClose={() => setQrModalVisible(false)}
            plantName={
              details.plant.display_name ||
              details.plant.plant_definition?.name ||
              ''
            }
            qrValue={qrCodeValue}
            onQrRef={ref => {
              plantQrRef.current = ref;
            }}
            onPressSave={async () => {
              try {
                await onSaveQr(plantQrRef.current);
                showToast(
                  tr(
                    'plantDetails.toasts.qrSaved',
                    'QR code saved to your gallery.',
                  ),
                  'success',
                );
              } catch (err: any) {
                console.warn('[PlantDetails] save QR failed:', err);
                showToast(
                  tr(
                    'plantDetails.toasts.qrSaveFailed',
                    'Failed to save QR code.',
                  ),
                  'error',
                );
              }
            }}
            onPressEmail={async () => {
              try {
                await sendQrCodeByEmail(
                  Number(details.plant.id),
                  currentLanguage,
                );
                showToast(
                  tr('plantDetails.toasts.qrEmailed', 'QR code email sent.'),
                  'success',
                );
              } catch (err: any) {
                console.warn('[PlantDetails] send QR email failed:', err);
                showToast(
                  tr(
                    'plantDetails.toasts.qrEmailFailed',
                    'Failed to send QR code email.',
                  ),
                  'error',
                );
              }
            }}
          />
        )}

      <PlantDefinitionModal
        visible={defModalVisible}
        onClose={closeDefinition}
        plantDefinitionId={defPlantDefinitionId}
      />

      <ChangePlantImageModal
        visible={changeImgVisible}
        onClose={closeChangeImage}
        plantId={changeImgPlantId}
        onChanged={photo => {
          setDetails(current =>
            current && String(current.plant.id) === String(changeImgPlantId)
              ? { ...current, plant: { ...current.plant, photo } }
              : current,
          );
          setPhotoReloadSignal(v => v + 1);
          showToast(
            photo
              ? t('plantDetails.toasts.photoUpdated', {
                  defaultValue: 'Plant photo updated.',
                })
              : t('plantDetails.toasts.photoRemoved', {
                  defaultValue: 'Plant photo removed.',
                }),
            'success',
          );
        }}
      />

      <EditPlantModal
        {...plantEditor.modalProps}
        latinCatalog={latinOptions}
        locations={locationOptions}
      />

      <PostponeTaskModal
        visible={isFocused && !!postponeTask}
        task={postponeTask}
        onClose={() => setPostponeTask(null)}
        onSaved={() => {
          showToast(
            String(
              t('homeModals.postpone.saved', {
                defaultValue: 'Task postponed.',
              }),
            ),
            'success',
          );
          void loadDetails()
            .then(() => setRefreshCounter(value => value + 1))
            .catch(() => {
              showToast(
                String(
                  t('plantDetails.errors.failedToLoad', {
                    defaultValue: 'Could not reload plant details.',
                  }),
                ),
                'error',
              );
            });
        }}
        onConflict={() => {
          showToast(
            String(
              t('homeModals.postpone.conflict', {
                defaultValue:
                  'This task changed. Reloading its latest details.',
              }),
            ),
            'error',
          );
          void loadDetails()
            .then(() => setRefreshCounter(value => value + 1))
            .catch(() => {
              showToast(
                String(
                  t('plantDetails.errors.failedToLoad', {
                    defaultValue: 'Could not reload plant details.',
                  }),
                ),
                'error',
              );
            });
        }}
      />

      <CompleteTaskModal
        visible={completeModalVisible}
        note={completeNote}
        onChangeNote={setCompleteNote}
        completionDate={completeDate}
        onChangeCompletionDate={setCompleteDate}
        onCancel={closeCompleteModal}
        onConfirm={handleConfirmComplete}
        mode="single"
        isOverdue={completeIsOverdue}
        intervalText={completeIntervalText}
      />

      <WateringScheduleModal {...watering.modalProps} />

      <TopSnackbar
        visible={toastVisible}
        message={toastMsg}
        variant={toastVariant}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}

function GlassFrame({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <View style={styles.frameWrap}>
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
            'rgba(255, 255, 255, 0.06)',
            'rgba(255, 255, 255, 0.02)',
            'rgba(255, 255, 255, 0.08)',
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View pointerEvents="none" style={s.cardTint} />
        <View pointerEvents="none" style={s.cardBorder} />
      </View>

      <View style={[styles.frameInner, center && { alignItems: 'center' }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerSegments: {
    flexDirection: 'row',
    backgroundColor: '#051F18',
    borderRadius: 20,
    padding: 3,
  },
  headerSegment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 17,
    alignItems: 'center',
  },
  headerSegmentActive: { backgroundColor: '#0B7285' },
  headerSegmentText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  readingsHelp: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    lineHeight: 18,
  },
  centerBox: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 6,
  },

  frameWrap: {
    borderRadius: 28,
    overflow: 'visible',
    position: 'relative',
    elevation: 8,
    marginBottom: 14,
  },
  frameInner: {
    padding: 16,
  },

  dim: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
  },
});
