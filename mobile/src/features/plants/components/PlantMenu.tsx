import FloatingTileMenu from '../../../shared/ui/FloatingTileMenu';
import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from '../../../shared/theme/native';
import MaterialCommunityIcons from '../../../shared/theme/Icon';

import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../app/providers/LanguageProvider';

import { s } from '../styles/plants.styles';

type Props = {
  align?: 'left' | 'right';
  onDetails: () => void;
  onEdit: () => void;
  onReminders: () => void;
  onJournal: () => void;
  onDelete: () => void;
  onShowQr: () => void;
  onShare?: () => void;
  sharingActive?: boolean;
  canEdit?: boolean;
};

export default function PlantMenu({
  onDetails,
  onEdit,
  onReminders,
  onJournal,
  onDelete,
  onShowQr,
  onShare,
  sharingActive,
  canEdit = true,
  align = 'right',
}: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      if (typeof txt === 'string' && txt && txt !== key) return txt;
      return fallback ?? key.split('.').pop() ?? key;
    },
    [t, currentLanguage],
  );

  return (
    <FloatingTileMenu
      style={[
        s.menuSheet,
        {
          width: Math.max(0, width - 32),
          backgroundColor: 'transparent',
          paddingHorizontal: 0,
          paddingVertical: 0,
          left: align === 'left' ? 0 : undefined,
          right: align === 'right' ? 0 : undefined,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          s.menuSheet,
          {
            position: 'relative',
            top: 0,
            right: undefined,
            left: undefined,
            alignSelf: align === 'left' ? 'flex-start' : 'flex-end',
            maxWidth: '100%',
          },
        ]}
      >
        <MenuItem
          label={tr('plants.menu.details', 'Plant details')}
          icon="sprout-outline"
          onPress={onDetails}
        />

        {canEdit && (
          <MenuItem
            label={tr('plants.menu.edit', 'Edit plant')}
            icon="pencil-outline"
            onPress={onEdit}
          />
        )}

        {canEdit && onShare && (
          <MenuItem
            label={
              sharingActive
                ? tr('sharing.plants.manage', 'Manage sharing')
                : tr('sharing.plants.shareSinglePlant', 'Share plant')
            }
            icon="share-variant-outline"
            onPress={onShare}
          />
        )}

        {canEdit && (
          <MenuItem
            label={tr('plants.menu.reminders', 'Show reminders')}
            icon="bell-outline"
            onPress={onReminders}
          />
        )}

        {/* NEW: Journal */}
        <MenuItem
          label={tr('plants.menu.journal', 'Show Plant Journal')}
          icon="notebook-outline"
          onPress={onJournal}
        />

        {canEdit && (
          <MenuItem
            label={tr('plants.menu.showQr', 'Show QR code')}
            icon="qrcode"
            onPress={onShowQr}
          />
        )}

        {canEdit && (
          <MenuItem
            label={tr('plants.menu.delete', 'Delete plant')}
            icon="trash-can-outline"
            danger
            onPress={onDelete}
          />
        )}
      </View>
    </FloatingTileMenu>
  );
}

function MenuItem({
  label,
  icon,
  danger,
  onPress,
}: {
  label: string;
  icon: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={s.menuItem} onPress={onPress}>
      <MaterialCommunityIcons
        name={icon as any}
        size={16}
        color={danger ? '#FF6B6B' : '#FFFFFF'}
        style={{ marginRight: 8 }}
      />
      <Text style={[s.menuItemText, {flexShrink:1}, danger && { color: '#FF6B6B' }]}>
        {label}
      </Text>
    </Pressable>
  );
}
