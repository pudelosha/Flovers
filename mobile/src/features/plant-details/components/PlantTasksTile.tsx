import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from '../../../shared/theme/native';
import MaterialCommunityIcons from '../../../shared/theme/Icon';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../../app/providers/SettingsProvider';
import {
  ACCENT_BY_TYPE,
  ICON_BY_TYPE,
} from '../../reminders/constants/reminders.constants';
import {
  plantAccess,
  type ApiPlantAccess,
} from '../../../shared/utils/plantAccess';
import type {
  PlantActivity,
  PlantReminderSummary,
} from '../types/plant-details.types';
import PlantReminderMenu from './PlantReminderMenu';

function toDisplayType(t?: string) {
  const x = (t || '').toLowerCase();
  if (x === 'water' || x === 'watering') return 'watering';
  if (x === 'fertilize' || x === 'fertilising' || x === 'fertilizing')
    return 'fertilising';
  if (x === 'moisture' || x === 'misting') return 'moisture';
  if (x === 'pruning') return 'pruning';
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

function formatDateBySettings(
  d: string | Date | null | undefined,
  settings?: any,
): string {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(+dt)) return '';

  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = String(dt.getFullYear());

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

function getDueDiffDays(d: string | Date | null | undefined): number | null {
  if (!d) return null;
  const dt = d instanceof Date ? new Date(d) : new Date(d);
  if (Number.isNaN(+dt)) return null;

  dt.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((+dt - +today) / (1000 * 60 * 60 * 24));
}

type Props = {
  access?: ApiPlantAccess;
  reminders: PlantReminderSummary[];
  activity: PlantActivity[];
  collapseMenusSignal?: number;
  onMarkComplete: (id: string) => void;
  onPostpone: (id: string) => void;
  onEditReminder: (id: string) => void;
  onShowHistory: () => void;
};
export default function PlantTasksTile({
  access,
  reminders,
  activity,
  collapseMenusSignal,
  onMarkComplete,
  onPostpone,
  onEditReminder,
  onShowHistory,
}: Props) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [menuId, setMenuId] = useState<string | null>(null);
  useEffect(() => setMenuId(null), [collapseMenusSignal]);
  const tr = (key: string, fallback: string, values?: any) =>
    String(t(key, { ...values, defaultValue: fallback }));
  const pending = [...reminders]
    .filter(row => row.taskId && row.dueDate)
    .sort((a, b) => +new Date(a.dueDate!) - +new Date(b.dueDate!));
  const completed = [...activity]
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
    .slice(0, 10);
  const bubble = (type: string) => {
    const display = toDisplayType(type);
    const accent = ACCENT_BY_TYPE[display] || '#7DE2A7';
    return (
      <View style={styles.bubble}>
        <MaterialCommunityIcons
          name={ICON_BY_TYPE[display] || 'calendar'}
          size={22}
          color={accent}
        />
      </View>
    );
  };
  const title = (type: string) => {
    const display = toDisplayType(type);
    return (
      <Text
        style={[styles.type, { color: ACCENT_BY_TYPE[display] || '#7DE2A7' }]}
      >
        {tr(`plantDetails.reminders.type.${display}`, display).toUpperCase()}
      </Text>
    );
  };
  return (
    <View testID="plant-task-timeline">
      {pending.map(row => {
        const key = row.taskId!;
        const permissions = plantAccess(row.access ?? access);
        const diff = getDueDiffDays(row.dueDate);
        const due =
          diff === 0
            ? tr('home.due.today', 'Today')
            : diff === 1
            ? tr('home.due.tomorrow', 'Tomorrow')
            : diff != null && diff > 1
            ? tr('home.due.inDays', 'In {{count}} days', { count: diff })
            : diff != null && diff < 0
            ? tr('home.due.overdueByDays', 'Overdue by {{count}} days', {
                count: Math.abs(diff),
              })
            : row.when;
        return (
          <View
            key={'pending:' + key}
            testID="plant-pending-task"
            style={[styles.row, menuId === key && { zIndex: 50 }]}
          >
            <View style={styles.iconColumn}>{bubble(row.type)}</View>
            <View style={styles.content}>
              <View style={styles.text}>
                {title(row.type)}
                <Text style={styles.sub}>
                  {due} · {formatDateBySettings(row.dueDate, settings)}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={tr(
                  'plantDetails.tasks.menu',
                  'Task options',
                )}
                onPress={() => setMenuId(menuId === key ? null : key)}
                style={styles.menu}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="dots-horizontal"
                  size={22}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
            {menuId === key && (
              <PlantReminderMenu
                canEdit={permissions.canEdit}
                canComplete={permissions.canCompleteTasks}
                onMarkComplete={() => {
                  setMenuId(null);
                  onMarkComplete(row.taskId!);
                }}
                onPostpone={() => {
                  setMenuId(null);
                  onPostpone(row.taskId!);
                }}
                onEdit={() => {
                  setMenuId(null);
                  onEditReminder(row.id);
                }}
                onShowHistory={() => {
                  setMenuId(null);
                  onShowHistory();
                }}
              />
            )}
          </View>
        );
      })}
      {completed.map((item, index) => (
        <View
          key={'done:' + item.id}
          testID="plant-completed-task"
          style={styles.row}
        >
          <View style={styles.iconColumn}>
            {index > 0 && (
              <View
                testID="task-chain-before"
                style={[styles.chain, { top: 0, bottom: '50%' }]}
              />
            )}
            {index < completed.length - 1 && (
              <View
                testID="task-chain-after"
                style={[styles.chain, { top: '50%', bottom: 0 }]}
              />
            )}
            {bubble(item.type)}
          </View>
          <View style={styles.content}>
            <View style={styles.text}>
              {title(item.type)}
              <View style={styles.completedMeta}>
                <MaterialCommunityIcons
                  name="check"
                  size={13}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.sub}>
                  {formatDateBySettings(item.completedAt, settings)} ·{' '}
                  {item.actor ||
                    tr('taskHistory.tile.unknownUser', 'Unknown user')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}
      {!pending.length && !completed.length && (
        <Text style={styles.empty}>
          {tr(
            'plantDetails.tasks.empty',
            'No tasks to display for this plant yet.',
          )}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    position: 'relative',
    flexDirection: 'row',
    minHeight: 66,
    overflow: 'visible',
  },
  iconColumn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#244C40',
  },
  chain: {
    position: 'absolute',
    left: 19,
    width: 2,
    backgroundColor: 'rgba(190,225,205,0.75)',
  },
  content: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  text: { flex: 1, minWidth: 0 },
  type: { fontSize: 13, fontWeight: '800' },
  sub: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    flexShrink: 1,
  },
  completedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  menu: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 12,
  },
});
