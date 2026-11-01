import AppModalFrame, { appModalStyles } from '../../../../shared/ui/AppModalFrame';
import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';

import { s } from '../../styles/reminders.styles';

import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../../app/providers/LanguageProvider';

type Props = {
  visible: boolean;
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmDeleteReminderModal({ visible, name, onCancel, onConfirm }: Props) {
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

  if (!visible) return null;

  return (
    <>
      <AppModalFrame
        visible
        onClose={onCancel}
        closeLabel={tr('remindersModals.common.close', 'Close')}
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
            {tr('remindersModals.confirmDelete.title', 'Delete reminder')}
          </Text>

          <Text style={s.confirmText}>
            {tr(
              'remindersModals.confirmDelete.areYouSurePrefix',
              'Are you sure you want to delete',
            )}{' '}
            <Text style={{ fontWeight: '800', color: '#fff' }}>{name}</Text>
            {tr(
              'remindersModals.confirmDelete.areYouSureSuffix',
              '? This action cannot be undone.',
            )}
          </Text>

          <Text
            style={[
              s.confirmText,
              {
                color: '#FFB4B4',
                marginTop: 12,
              },
            ]}
          >
            {String(
              tr(
                'remindersModals.confirmDelete.historyWarning',
                'Deleting this reminder also permanently deletes all its tasks, including completed history and notes.',
              ),
            )}
          </Text>

          <View style={s.promptButtonsRow}>
            <Pressable style={s.promptBtn} onPress={onCancel}>
              <Text style={s.promptBtnText}>{tr('remindersModals.common.cancel', 'Cancel')}</Text>
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
                {tr('remindersModals.common.delete', 'Delete')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </AppModalFrame>
    </>
  );
}
