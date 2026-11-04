import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from '../../../shared/theme/native';
import Gradient from '../../../shared/theme/Gradient';
import Icon from '../../../shared/theme/Icon';
import FloatingTileMenu from '../../../shared/ui/FloatingTileMenu';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../../app/providers/SettingsProvider';
import { activityDateLabel } from '../../plant-details/components/PlantActivityTile';
import type { InboxItem } from '../../../api/services/inbox.service';
export default function NotificationTile({
  item,
  open,
  onToggle,
  onDelete,
}: {
  item: InboxItem;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const known = [
    'contact_invitation',
    'contact_accepted',
    'tasks_due',
    'tasks_followup',
    'shared_task_completed',
    'missing_readings',
    'moisture_alert',
    'watering_completed',
  ].includes(item.kind);
  const title = String(
    t(known ? `inbox.events.${item.kind}.title` : 'inbox.title'),
  );
  const body = String(
    t(known ? `inbox.events.${item.kind}.body` : 'inbox.generic', {
      ...item.payload,
      actor: item.payload.actor || t('inbox.someone'),
      plant: item.payload.plant || t('inbox.sharedPlant'),
      device: item.payload.device || t('inbox.device'),
      value: item.payload.value ?? '',
      threshold: item.payload.threshold ?? '',
    }),
  );
  return (
    <View style={[s.wrap, open && { zIndex: 30 }]}>
      <Pressable
        style={s.clip}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
      >
        <Gradient
          pointerEvents="none"
          colors={['rgba(16,80,63,0.9)', 'rgba(5,31,24,0.9)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.row}>
          <View style={s.circle}>
            <Icon
              name={
                {
                  task: 'checkbox-marked-circle-outline',
                  pump: 'water-pump',
                  device: 'access-point',
                  user: 'account-outline',
                }[item.source]
              }
              size={17}
              color="#FFFFFF"
            />
          </View>
          <View style={s.content}>
            <Text style={s.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={s.body} numberOfLines={2}>
              {body}
            </Text>
            <View style={s.meta}>
              <Text style={s.small} numberOfLines={1}>
                {activityDateLabel(
                  item.createdAt,
                  settings.dateFormat || 'DD.MM.YYYY',
                )}
                {' � '}
                {t('inbox.sources.' + item.source)}
                {' � '}
                {t('inbox.channels.' + item.channel)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
      {open && (
        <FloatingTileMenu style={s.menu}>
          <Pressable
            accessibilityRole="button"
            style={s.menuItem}
            onPress={onDelete}
          >
            <Icon name="trash-can-outline" size={18} color="#FF6B6B" />
            <Text style={s.menuText}>{t('inbox.delete')}</Text>
          </Pressable>
        </FloatingTileMenu>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { borderRadius: 24, overflow: 'visible', position: 'relative' },
  clip: { borderRadius: 24, overflow: 'hidden' },
  row: { padding: 9, flexDirection: 'row', gap: 8, alignItems: 'center' },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, minWidth: 0 },
  title: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  body: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  meta: { marginTop: 3 },
  small: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: '600' },
  menu: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  menuText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
