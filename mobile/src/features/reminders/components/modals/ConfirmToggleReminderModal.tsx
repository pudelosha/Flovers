import AppModalFrame, { appModalStyles } from '../../../../shared/ui/AppModalFrame';
import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';

import { s } from '../../styles/reminders.styles';

import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../../app/providers/LanguageProvider';

type Props = {
  visible: boolean;
  name: string;
  isActive: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmToggleReminderModal({
  visible,
  name,
  isActive,
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

  if (!visible) return null;

  const title = isActive
    ? tr('remindersModals.toggle.pauseTitle', 'Pause reminder')
    : tr('remindersModals.toggle.resumeTitle', 'Resume reminder');
  const body = isActive
    ? tr(
        'remindersModals.toggle.pauseBody',
        'Pause this reminder for {{name}}? Its due task will be hidden until you resume it.',
        { name },
      )
    : tr(
        'remindersModals.toggle.resumeBody',
        'Resume this reminder for {{name}}? Its next due task will appear again.',
        { name },
      );
  const action = isActive
    ? tr('remindersModals.common.pause', 'Pause')
    : tr('remindersModals.common.resume', 'Resume');

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
          <Text style={s.promptTitle}>{title}</Text>

          <Text style={s.confirmText}>{body}</Text>

          <View style={s.promptButtonsRow}>
            <Pressable style={s.promptBtn} onPress={onCancel}>
              <Text style={s.promptBtnText}>{tr('remindersModals.common.cancel', 'Cancel')}</Text>
            </Pressable>

            <Pressable style={[s.promptBtn, s.promptPrimary]} onPress={onConfirm}>
              <Text style={s.promptPrimaryText}>{action}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </AppModalFrame>
    </>
  );
}
