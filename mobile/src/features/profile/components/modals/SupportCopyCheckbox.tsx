import React from 'react';
import { Pressable, Text, StyleSheet } from '../../../../shared/theme/native';
import Icon from '../../../../shared/theme/Icon';
import { useTranslation } from 'react-i18next';

export default function SupportCopyCheckbox({ checked, disabled, onToggle }: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const label = t('profileModals.support.copyToMe');
  return (
    <Pressable style={styles.row} onPress={onToggle} disabled={disabled}
      accessibilityRole="checkbox" accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}>
      <Icon name={checked ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
        size={20} color="#FFFFFF" style={styles.icon} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 0,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  icon: { marginTop: 1 },
  label: { color: '#FFFFFF', flex: 1, fontSize: 14, lineHeight: 20 },
});
