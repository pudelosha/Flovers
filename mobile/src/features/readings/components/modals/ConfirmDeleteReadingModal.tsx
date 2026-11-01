import AppModalFrame, { appModalStyles } from '../../../../shared/ui/AppModalFrame';
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';

import { useTranslation } from 'react-i18next';

// Reuse the same modal styles as Reminders
import { s } from '../../../reminders/styles/reminders.styles';

type Props = {
  visible: boolean;
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteReadingModal({ visible, name, onCancel, onConfirm }: Props) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <>
      <AppModalFrame
        visible
        onClose={onCancel}
        closeLabel={t('readingsModals.common.close', 'Close')}
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
          contentContainerStyle={[
            {
              gap: 12,
            },
            appModalStyles.scrollContent,
            appModalStyles.centeredContent,
          ]}
        >
          <Text style={s.promptTitle}>{t('readingsModals.confirmDelete.title')}</Text>

          <Text style={s.confirmText}>
            {t('readingsModals.confirmDelete.messageBefore')}{' '}
            <Text style={{ fontWeight: '800', color: '#fff' }}>{name}</Text>
            {t('readingsModals.confirmDelete.messageAfter')}
          </Text>

          <View style={s.promptButtonsRow}>
            <Pressable style={s.promptBtn} onPress={onCancel}>
              <Text style={s.promptBtnText}>{t('readingsModals.common.cancel')}</Text>
            </Pressable>

            <Pressable style={[s.promptBtn, s.promptDanger]} onPress={onConfirm}>
              <Text
                style={[
                  s.promptBtnText,
                  {
                    color: '#FF6B6B',
                    fontWeight: '800',
                  },
                ]}
              >
                {t('readingsModals.common.delete')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </AppModalFrame>
    </>
  );
}
