import { useAppTheme } from '../../../shared/theme/ThemeContext';
import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
} from '../../../shared/theme/native';
import MaterialCommunityIcons from '../../../shared/theme/Icon';
import LinearGradient from '../../../shared/theme/Gradient';

import { s } from '../styles/reminders.styles';
import { ACCENT_BY_TYPE, ICON_BY_TYPE } from '../constants/reminders.constants';
import type { Reminder } from '../types/reminders.types';
import ReminderMenu from './ReminderMenu';
import { useNavigation } from '@react-navigation/native';
import {
  plantAccess,
  SHARED_PLANT_TINT,
} from '../../../shared/utils/plantAccess';

import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../app/providers/LanguageProvider';

function toDisplayType(t?: string) {
  const x = (t || '').toLowerCase();
  if (x === 'water' || x === 'watering') return 'watering';
  if (x === 'fertilize' || x === 'fertilising' || x === 'fertilizing')
    return 'fertilising';
  if (x === 'moisture' || x === 'misting') return 'moisture';
  if (x === 'care') return 'care';
  if (x === 'repot' || x === 'repotting') return 'repot';
  return 'care';
}

function hexToRgba(hex?: string, alpha = 1) {
  const fallback = `rgba(0,0,0,${alpha})`;
  if (!hex || typeof hex !== 'string') return fallback;
  let h = hex.trim();
  if (!h.startsWith('#')) h = `#${h}`;
  h = h.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  if (h.length !== 6) return fallback;
  const bigint = parseInt(h, 16);
  if (Number.isNaN(bigint)) return fallback;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

type Props = {
  reminder: Reminder;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onPressBody: () => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

// EXACT SAME green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = 'rgba(5, 31, 24, 0.9)';
const TAB_GREEN_LIGHT = 'rgba(16, 80, 63, 0.9)';

export default function ReminderTile({
  reminder,
  isMenuOpen,
  onToggleMenu,
  onPressBody,
  onToggleActive,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { isLight } = useAppTheme();
  const nav = useNavigation<any>();
  const access = plantAccess(reminder.access);

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split('.').pop() ?? key : txt;
    },
    [t, currentLanguage],
  );

  const displayType = toDisplayType(reminder.type as any);
  const accent = ACCENT_BY_TYPE[displayType as any];
  const icon = ICON_BY_TYPE[displayType as any] ?? 'calendar';

  const typeLabel = tr(
    `reminders.types.${displayType}`,
    displayType === 'fertilising'
      ? 'Fertilising'
      : displayType.charAt(0).toUpperCase() + displayType.slice(1),
  );

  const unitKey = reminder.intervalUnit === 'months' ? 'months' : 'days';

  const everyStr = useMemo(() => {
    if (!reminder.intervalValue || !reminder.intervalUnit) return '';
    return tr(
      `reminders.tile.repeatsEvery${unitKey === 'months' ? 'Months' : 'Days'}`,
      'Repeats every {{count}} {{unit}}',
      {
        count: reminder.intervalValue,
        unit: unitKey,
      },
    );
  }, [reminder.intervalValue, reminder.intervalUnit, tr, unitKey]);

  return (
    <View style={[s.cardWrap, { height: 66 }, isMenuOpen && s.cardWrapRaised]}>
      {/* CLIPPED SURFACE: gradients/tint/border/content */}
      <View style={s.cardGlass}>
        {/* Base green gradient: EXACT match to AuthCard */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        {/* Fog highlight: EXACT match to AuthCard */}
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

        {/* Accent wash: task-type color (left) -> AuthCard dark (right) */}
        <LinearGradient
          taskAccent={accent}
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={[
            hexToRgba(accent, 0.34),
            hexToRgba(accent, 0.18),
            hexToRgba(accent, 0.06),
            TAB_GREEN_DARK,
          ]}
          locations={[0, 0.28, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* MATCH Plant/Auth tint + thinner border (prevents inner shade) */}
        <View pointerEvents="none" style={s.cardTint} />
        {access.isShared && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: SHARED_PLANT_TINT },
            ]}
          />
        )}
        <View pointerEvents="none" style={s.cardBorder} />

        {/* Content */}
        <View style={s.cardRow}>
          <Pressable
            accessible={false}
            style={s.cardBodyPressable}
            onPress={() => {
              onPressBody();
              onToggleMenu();
            }}
          >
            <View style={[s.leftCol, { width: 38 }]}>
              <View
                style={[
                  s.leftIconBubble,
                  { width: 32, height: 32, borderRadius: 16 },
                  {
                    backgroundColor: isLight
                      ? hexToRgba(accent, 0.25)
                      : hexToRgba('#000000', 0.15),
                  },
                ]}
              >
                <MaterialCommunityIcons name={icon} size={20} color={accent} />
              </View>
            </View>

            <View style={[s.centerCol, { marginLeft: 10 }]}>
              <Text
                style={[s.plantName, { fontSize: 14, marginTop: 0 }]}
                numberOfLines={1}
              >
                {reminder.plant}
              </Text>

              {/* Added location with icon */}
              {reminder.location && (
                <View style={s.locationRow}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={12}
                    color="#FFFFFF"
                    style={s.locationIcon}
                  />
                  <Text
                    style={[s.location, { fontSize: 11 }]}
                    numberOfLines={1}
                  >
                    {reminder.location}
                  </Text>
                </View>
              )}
            </View>

            <View style={[s.rightCol, { width: '46%', minWidth: 136 }]}>
              <Text
                style={[
                  s.taskTypeLabel,
                  {
                    color: accent,
                    fontSize: 9,
                    textAlign: 'right',
                    marginBottom: 4,
                  },
                ]}
                numberOfLines={1}
              >
                {typeLabel}
              </Text>
              {reminder.isActive ? (
                <>
                  {!!everyStr && (
                    <Text
                      style={[
                        s.recurrenceText,
                        { fontSize: 11, lineHeight: 13, marginBottom: 0 },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      {everyStr}
                    </Text>
                  )}
                </>
              ) : (
                <View style={s.pausedRow}>
                  <MaterialCommunityIcons
                    name="pause-circle-outline"
                    size={13}
                    color="#F2C94C"
                  />
                  <Text style={s.pausedText} numberOfLines={1}>
                    {tr('reminders.tile.paused', 'Paused')}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>
      </View>

      {/* NOT CLIPPED: menu must be outside cardGlass (overflow: hidden) */}
      {isMenuOpen && (
        <ReminderMenu
          canEdit={access.canEdit}
          onPlantDetails={() => {
            onToggleMenu();
            nav.navigate('PlantDetails', { id: reminder.plantId });
          }}
          isActive={reminder.isActive}
          onToggleActive={onToggleActive}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </View>
  );
}
