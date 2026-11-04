import { useAppTheme } from '../../../shared/theme/ThemeContext';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  Animated,
  Easing,
} from '../../../shared/theme/native';
import MaterialCommunityIcons from '../../../shared/theme/Icon';
import LinearGradient from '../../../shared/theme/Gradient';

import { s } from '../styles/home.styles';
import { ACCENT_BY_TYPE, ICON_BY_TYPE } from '../constants/home.constants';
import type { Task } from '../types/home.types';
import TaskMenu from './TaskMenu';
import SharedPlantBadge from '../../../shared/ui/SharedPlantBadge';
import {
  plantAccess,
  SHARED_PLANT_TINT,
} from '../../../shared/utils/plantAccess';
import { useSettings } from '../../../app/providers/SettingsProvider';
import { useTranslation } from 'react-i18next';

import { relativeDueLabel, formatDateWithPattern } from '../utils/taskGrouping';

type Props = {
  compact?: boolean;
  calendar?: boolean;
  task: Task;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onMarkComplete: () => void;
  onPostpone?: () => void;
  onEdit: () => void;
  onGoToPlant: () => void;
  onShowHistory?: () => void;
  onPressBody?: () => void;
  // Intentionally omit onDelete to remove the Delete action from the menu on Home
};

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Exact green tones
const TAB_GREEN_DARK = 'rgba(5, 31, 24, 0.9)';
const TAB_GREEN_LIGHT = 'rgba(16, 80, 63, 0.9)';

export default function TaskTile({
  task,
  compact = false,
  calendar = false,
  isMenuOpen,
  onMarkComplete,
  onPostpone,
  onEdit,
  onGoToPlant,
  onShowHistory,
  onPressBody,
}: Props) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { isLight } = useAppTheme();
  const access = plantAccess(task.access);

  const accent = ACCENT_BY_TYPE[task.type];
  const icon = ICON_BY_TYPE[task.type];

  const dueText =
    typeof task.dueDiffDays === 'number'
      ? task.dueDiffDays === 0
        ? t('home.due.today')
        : task.dueDiffDays === 1
        ? t('home.due.tomorrow')
        : task.dueDiffDays > 1 && task.dueDiffDays < 7
        ? t('home.due.inDays', { count: task.dueDiffDays })
        : task.dueDiffDays < 0
        ? t('home.due.overdueByDays', { count: Math.abs(task.dueDiffDays) })
        : t('home.due.nextWeek')
      : task.due;

  const isOverdue =
    typeof task.dueDiffDays === 'number'
      ? task.dueDiffDays < 0
      : typeof task.due === 'string' &&
        task.due.toLowerCase().includes('overdue');

  const formattedDate = formatDateWithPattern(
    task.dueDate,
    settings.dateFormat,
  );

  // Pulse animation for overdue state
  const pulse = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    pulseLoopRef.current?.stop();
    pulseLoopRef.current = null;

    if (!isOverdue) {
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoopRef.current = loop;
    loop.start();

    return () => loop.stop();
  }, [isOverdue, pulse]);

  const overdueOverlayColors = useMemo(
    () => [
      'rgba(255, 59, 48, 0.55)',
      'rgba(255, 59, 48, 0.18)',
      'rgba(255, 59, 48, 0.00)',
    ],
    [],
  );

  return (
    <View
      style={[
        s.cardWrap,
        compact && { height: access.isShared ? 78 : 66 },
        isMenuOpen && s.cardWrapRaised,
      ]}
    >
      {/* Glass stack with gradients */}
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
        {isOverdue && (
          <AnimatedLinearGradient
            pointerEvents="none"
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            colors={overdueOverlayColors}
            locations={[0, 0.28, 0.7]}
            style={[StyleSheet.absoluteFill, { opacity: pulse }]}
          />
        )}
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
      </View>

      {/* Content row */}
      <Pressable
        accessible={false}
        style={[s.cardRow, s.cardBodyPressable, { paddingVertical: 4 }]}
        onPress={onPressBody}
      >
        {/* Left: icon only */}
        <View style={[s.leftCol, compact && { width: 38 }]}>
          <View
            style={[
              s.leftIconBubble,
              compact && { width: 32, height: 32, borderRadius: 16 },
              {
                backgroundColor: isLight
                  ? hexToRgba(accent, 0.25)
                  : hexToRgba('#000000', 0.15),
              },
            ]}
          >
            <MaterialCommunityIcons
              name={icon}
              size={compact ? 20 : 24}
              color={accent}
            />
          </View>
        </View>

        {/* Center: task type label, plant name, location */}
        <View style={[s.centerCol, compact && { marginLeft: 10 }]}>
          {!compact && (
            <Text style={[s.taskTypeLabel, { color: accent }]}>
              {t(`home.taskTypes.${task.type}`)}
            </Text>
          )}
          <Text
            style={[s.plantName, compact && { fontSize: 14, marginTop: 0 }]}
            numberOfLines={1}
          >
            {task.plant}
          </Text>

          {task.location ? (
            <View style={s.locationRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={12}
                color="#FFFFFF"
                style={s.locationIcon}
              />
              <Text
                style={[s.location, compact && { fontSize: 11 }]}
                numberOfLines={1}
              >
                {task.location}
              </Text>
            </View>
          ) : null}
        </View>

        {!compact && <View style={s.separator} />}

        {/* Right: due text and date */}
        <View style={s.rightCol} testID="task-due">
          {compact ? (
            <>
              <Text
                style={[
                  s.taskTypeLabel,
                  {
                    color: accent,
                    textAlign: 'right',
                    fontSize: 9,
                    marginBottom: 4,
                  },
                ]}
                numberOfLines={1}
              >
                {t(`home.taskTypes.${task.type}`)}
              </Text>
              <Text
                style={[s.dueWhen, isOverdue && s.dueOverdue]}
                numberOfLines={2}
              >
                {calendar ? formattedDate : relativeDueLabel(task.dueDate, t)}
              </Text>
            </>
          ) : (
            <>
              <Text
                style={[s.dueWhen, isOverdue && s.dueOverdue]}
                numberOfLines={2}
              >
                {dueText}
              </Text>
              <Text
                style={[s.dueDateText, isOverdue && s.dueOverdue]}
                numberOfLines={1}
              >
                {formattedDate}
              </Text>
            </>
          )}
          <SharedPlantBadge access={task.access} compact alignRight />
        </View>
      </Pressable>

      {/* Floating menu */}
      {isMenuOpen && (
        <TaskMenu
          canComplete={access.canCompleteTasks}
          canEdit={access.canEdit}
          onMarkComplete={onMarkComplete}
          onPostpone={onPostpone}
          onEdit={onEdit}
          onGoToPlant={onGoToPlant}
          onShowHistory={onShowHistory}
          showDelete={false}
        />
      )}
    </View>
  );
}

/* helpers */
function hexToRgba(hex?: string, alpha = 1) {
  const fallback = `rgba(0,0,0,${alpha})`;
  if (!hex || typeof hex !== 'string') return fallback;

  let h = hex.trim();
  if (!h.startsWith('#')) h = `#${h}`;
  h = h.replace('#', '');

  if (h.length === 3) {
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  }

  if (h.length !== 6) return fallback;

  const bigint = parseInt(h, 16);
  if (Number.isNaN(bigint)) return fallback;

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r},${g},${b},${alpha})`;
}
