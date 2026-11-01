import AppModalFrame, { appModalStyles } from '../../../../shared/ui/AppModalFrame';
import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';

import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../../app/providers/LanguageProvider';

import { locStyles as s } from '../../styles/locations.styles';

type Props = {
  visible: boolean;
  name: string;
  plantCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteLocationModal({
  visible,
  name,
  plantCount,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split('.').pop() ?? key : txt;
    },
    [t, currentLanguage],
  );

  const blocked = plantCount > 0;

  const countLabel = useMemo(() => {
    const c = plantCount;

    if (currentLanguage === 'pl') {
      const mod10 = c % 10;
      const mod100 = c % 100;

      if (c === 1) return '1 roślina';

      if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
        return `${c} rośliny`;
      }

      return `${c} roślin`;
    }

    if (c === 1) return '1 plant';
    return `${c} plants`;
  }, [plantCount, currentLanguage]);

  if (!visible) return null;

  return (
    <>
      <AppModalFrame
        visible
        onClose={onCancel}
        closeLabel={tr('locationsModals.common.close', 'Close')}
        scrollable={false}
      >
        <ScrollView
          keyboardDismissMode="on-drag"
          nestedScrollEnabled
          style={[
            {
              flex: 1,
            },
            appModalStyles.scroll,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[appModalStyles.scrollContent, appModalStyles.centeredContent]}
        >
          <Text style={s.promptTitle}>
            {tr('locationsModals.confirmDelete.title', 'Delete location')}
          </Text>

          <Text style={s.confirmText}>
            {tr('locationsModals.confirmDelete.messagePrefix', 'Are you sure you want to delete')}{' '}
            <Text style={{ fontWeight: '800', color: '#fff' }}>{name}</Text>
            {tr('locationsModals.confirmDelete.messageSuffix', '? This action cannot be undone.')}
          </Text>

          {blocked && (
            <View style={s.blockedSection}>
              <Text style={s.blockedTitle}>
                {tr('locationsModals.confirmDelete.blockedTitle', 'Can’t delete this location')}
              </Text>

              <Text style={s.blockedText}>
                {tr(
                  'locationsModals.confirmDelete.blockedMessage',
                  'This location has {{countLabel}} assigned. Delete or move those plants first, then try again.',
                  { countLabel },
                )}
              </Text>
            </View>
          )}

          <View style={s.promptButtonsRow}>
            <Pressable style={s.promptBtn} onPress={onCancel}>
              <Text style={s.promptBtnText}>{tr('locationsModals.common.cancel', 'Cancel')}</Text>
            </Pressable>

            <Pressable
              style={[
                s.promptBtn,
                s.promptDanger,
                blocked && {
                  opacity: 0.45,
                },
              ]}
              onPress={onConfirm}
              disabled={blocked}
            >
              <Text
                style={[
                  s.promptBtnText,
                  {
                    color: '#FF6B6B',
                    fontWeight: '800',
                  },
                ]}
              >
                {tr('locationsModals.common.delete', 'Delete')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </AppModalFrame>
    </>
  );
}
