import { getDisplayTemperature } from '../../../shared/utils/temperature';
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from '../../../shared/theme/native';
import LinearGradient from '../../../shared/theme/Gradient';
import MaterialCommunityIcons from '../../../shared/theme/Icon';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../app/providers/LanguageProvider';
import { useSettings } from '../../../app/providers/SettingsProvider';

import { s } from '../styles/plant-details.styles';

import type {
  LatestReadings,
  PlantReadingSummary,
  PlantMetricKey,
  PlantSensorsConfig,
} from '../types/plant-details.types';

import {
  ICON_BG,
  METRIC_UNITS,
} from '../../readings/constants/readings.constants';

type Props = {
  embedded?: boolean;
  latestReadings: LatestReadings;
  summary24h?: PlantReadingSummary | null;
  sensors?: PlantSensorsConfig;
  onTileTouch?: () => void;
  onMetricPress: (metric: PlantMetricKey) => void;

  /**
   * Pump section is shown only when pumpIncluded is true.
   */
  pumpIncluded?: boolean;
  lastPumpLaunchDate?: string | null;
  hasPendingWatering?: boolean;
  onScheduleWatering?: () => void;
  isSchedulingWatering?: boolean;
};

const TAB_GREEN_DARK = 'rgba(5, 31, 24, 0.9)';
const TAB_GREEN_LIGHT = 'rgba(16, 80, 63, 0.9)';
const PUMP_BLUE = 'rgba(11,114,133,0.92)';

function formatDateBySettings(d: Date, settings?: any) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());

  const fmt = settings?.dateFormat;

  if (fmt === 'mdy' || fmt === 'MM/DD/YYYY' || fmt === 'MM-DD-YYYY') {
    const sep = fmt === 'MM-DD-YYYY' ? '-' : '/';
    return `${mm}${sep}${dd}${sep}${yyyy}`;
  }

  if (fmt === 'ymd' || fmt === 'YYYY-MM-DD' || fmt === 'YYYY/MM/DD') {
    const sep = fmt === 'YYYY/MM/DD' ? '/' : '-';
    return `${yyyy}${sep}${mm}${sep}${dd}`;
  }

  if (fmt === 'DD/MM/YYYY') return `${dd}/${mm}/${yyyy}`;
  if (fmt === 'DD-MM-YYYY') return `${dd}-${mm}-${yyyy}`;

  return `${dd}.${mm}.${yyyy}`;
}

function MetricColPressable({
  icon,
  color,
  value,
  unit,
  onPress,
  decimals,
}: {
  icon: string;
  color: string;
  value: number | null;
  unit: string;
  onPress: () => void;
  decimals?: number;
}) {
  return (
    <Pressable
      style={styles.col}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.10)' }}
    >
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color="#FFFFFF" />
      </View>

      <Text style={styles.metricValue}>
        {value === null || value === undefined
          ? '—'
          : `${
              typeof decimals === 'number' ? value.toFixed(decimals) : value
            }${unit}`}
      </Text>
    </Pressable>
  );
}

export default function PlantLatestReadingsTile({
  latestReadings,
  summary24h,
  embedded = false,
  sensors,
  onTileTouch,
  onMetricPress,
  pumpIncluded = false,
  lastPumpLaunchDate = null,
  hasPendingWatering = false,
  onScheduleWatering,
  isSchedulingWatering = false,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;

      const txt = t(key, {
        ...(values || {}),
        defaultValue: fallback ?? key.split('.').pop() ?? key,
      });

      return txt || fallback || key.split('.').pop() || key;
    },
    [t, currentLanguage],
  );

  const { temperature, humidity, light, moisture, tsISO } = latestReadings;

  const showTemp = sensors ? !!sensors.temperature : true;
  const showHum = sensors ? !!sensors.humidity : true;
  const showLight = sensors ? !!sensors.light : true;
  const showMoist = sensors ? !!sensors.moisture : true;

  const metrics = ([
    { key: 'temperature', icon: 'thermometer', color: ICON_BG.temperature, shown: showTemp },
    { key: 'humidity', icon: 'water-percent', color: ICON_BG.humidity, shown: showHum },
    { key: 'light', icon: 'white-balance-sunny', color: ICON_BG.light, shown: showLight },
    { key: 'moisture', icon: 'water', color: ICON_BG.moisture, shown: showMoist },
  ] as const).filter(metric => metric.shown);
  const summaryValue = (metric: PlantMetricKey, stat: 'avg' | 'min' | 'max') => {
    const value = summary24h?.metrics[metric]?.[stat];
    if (value == null || !Number.isFinite(value)) return '\u2014';
    if (metric === 'temperature') {
      const converted = getDisplayTemperature(value, settings);
      return `${converted.value?.toFixed(converted.decimals)}${converted.unit}`;
    }
    return `${Number(value.toFixed(metric === 'light' ? 0 : 1))}${METRIC_UNITS[metric]}`;
  };

  const displayTemperature = useMemo(() => {
    return getDisplayTemperature(temperature, settings);
  }, [temperature, settings]);

  const lastText = useMemo(() => {
    if (!tsISO) {
      return `${tr(
        'plantDetails.latestReadings.lastReadPrefix',
        'Last read',
      )}: —`;
    }

    const dt = new Date(tsISO);
    const date = formatDateBySettings(dt, settings);
    const time = dt.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${tr(
      'plantDetails.latestReadings.lastReadPrefix',
      'Last read',
    )}: ${date} ${time}`;
  }, [tsISO, settings, tr]);

  const lastPumpText = useMemo(() => {
    if (!lastPumpLaunchDate) {
      return `${tr(
        'plantDetails.latestReadings.lastPumpRunPrefix',
        'Last pump run',
      )}: —`;
    }

    const dt = new Date(lastPumpLaunchDate);
    const date = formatDateBySettings(dt, settings);
    const time = dt.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${tr(
      'plantDetails.latestReadings.lastPumpRunPrefix',
      'Last pump run',
    )}: ${date} ${time}`;
  }, [lastPumpLaunchDate, settings, tr]);

  return (
    <View
      style={[styles.cardWrap, embedded && styles.embedded]}
      onTouchStart={onTileTouch}
    >
      {!embedded && (
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
      )}

      <View style={[styles.body, embedded && { paddingTop: 8 }]}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{tr('plantDetails.latestReadings.latestResults', 'Latest results')}</Text>
        </View>

        <View style={styles.metricsRow}>
          {showTemp && (
            <MetricColPressable
              icon="thermometer"
              color={ICON_BG.temperature}
              value={displayTemperature.value}
              unit={displayTemperature.unit}
              decimals={displayTemperature.decimals}
              onPress={() => onMetricPress('temperature')}
            />
          )}

          {showHum && (
            <MetricColPressable
              icon="water-percent"
              color={ICON_BG.humidity}
              value={humidity}
              unit={METRIC_UNITS.humidity}
              decimals={1}
              onPress={() => onMetricPress('humidity')}
            />
          )}

          {showLight && (
            <MetricColPressable
              icon="white-balance-sunny"
              color={ICON_BG.light}
              value={light}
              unit={METRIC_UNITS.light}
              onPress={() => onMetricPress('light')}
            />
          )}

          {showMoist && (
            <MetricColPressable
              icon="water"
              color={ICON_BG.moisture}
              value={moisture}
              unit={METRIC_UNITS.moisture}
              onPress={() => onMetricPress('moisture')}
            />
          )}
        </View>

        <View style={styles.lastReadRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color="rgba(255,255,255,0.88)"
            style={styles.infoIcon}
          />
          <Text style={styles.lastText}>{lastText}</Text>
        </View>
        <View style={styles.hintRow}>
          <MaterialCommunityIcons name="information-outline" size={14} color="rgba(255,255,255,0.88)" />
          <Text style={styles.hint}>{tr('plantDetails.latestReadings.historyHint', 'Tap any reading to see its history and details.')}</Text>
        </View>
        <View style={styles.line} />
        <View style={styles.topRow}>
          <Text style={styles.title}>{tr('plantDetails.latestReadings.last24Hours', 'Last 24 hours')}</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={styles.statLabel} />
            {metrics.map(metric => (
              <Pressable key={metric.key} style={styles.statCell} onPress={() => onMetricPress(metric.key)}>
                <View style={[styles.smallCircle, { backgroundColor: metric.color }]}>
                  <MaterialCommunityIcons name={metric.icon} size={16} color="#FFFFFF" />
                </View>
              </Pressable>
            ))}
          </View>
          {(['avg', 'min', 'max'] as const).map(stat => (
            <View key={stat} style={styles.tableRow}>
              <Text style={styles.statLabel}>{tr(`plantDetails.latestReadings.${stat}`, stat === 'avg' ? 'Avg' : stat === 'min' ? 'Min' : 'Max')}</Text>
              {metrics.map(metric => (
                <Text key={metric.key} style={styles.statValue}>{summaryValue(metric.key, stat)}</Text>
              ))}
            </View>
          ))}
        </View>
        {!summary24h && <Text style={styles.summaryNotice}>{tr('plantDetails.latestReadings.summaryUnavailable', 'The 24-hour summary is currently unavailable.')}</Text>}
      </View>

      {pumpIncluded && (
        <>
          <View style={styles.line} />

          <View style={styles.topRow}>
            <Text style={styles.title}>{tr('plantDetails.latestReadings.watering', 'Watering')}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.launchButton,
              hasPendingWatering && styles.unscheduleButton,
              pressed && styles.launchButtonPressed,
            ]}
            onPress={onScheduleWatering}
            disabled={!onScheduleWatering || isSchedulingWatering}
          >
            <Text style={styles.launchButtonText}>
              {isSchedulingWatering
                ? tr('plantDetails.latestReadings.opening', 'Opening...')
                : hasPendingWatering
                ? tr(
                    'plantDetails.latestReadings.unscheduleWatering',
                    'Unschedule watering',
                  )
                : tr(
                    'plantDetails.latestReadings.scheduleWatering',
                    'Schedule watering',
                  )}
            </Text>
          </Pressable>
          <View style={styles.lastPumpRow}>
            <MaterialCommunityIcons
              name="timer-cog-outline"
              size={14}
              color="rgba(255,255,255,0.88)"
              style={styles.infoIcon}
            />
            <Text style={styles.lastPumpText}>{lastPumpText}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
    marginBottom: 14,
  },

  embedded: {
    marginHorizontal: -16,
    marginBottom: 0,
    borderRadius: 0,
    elevation: 0,
    overflow: 'visible',
  },
  body: {
    paddingTop: 16,
  },

  hintRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 12 },
  hint: { flex: 1, fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,0.88)' },
  table: { paddingHorizontal: 16, paddingBottom: 10, gap: 4 },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 20 },
  statLabel: { width: 36, fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  statValue: { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 11, color: '#FFFFFF' },
  smallCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  summaryNotice: { fontSize: 12, paddingHorizontal: 18, paddingBottom: 10, color: 'rgba(255,255,255,0.88)' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },

  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
  },

  col: {
    flex: 1,
    alignItems: 'center',
  },

  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  metricValue: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    marginTop: 6,
  },

  lastReadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },

  infoIcon: {
    marginRight: 8,
  },

  lastText: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    fontSize: 12,
  },

  line: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 18,
    marginVertical: 6,
  },

  lastPumpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 6,
  },

  lastPumpText: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    fontSize: 12,
  },

  launchButton: {
    backgroundColor: PUMP_BLUE,
    borderRadius: 14,
    paddingVertical: 12,
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 14,
    alignItems: 'center',
  },

  unscheduleButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  launchButtonPressed: {
    opacity: 0.85,
  },

  launchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
