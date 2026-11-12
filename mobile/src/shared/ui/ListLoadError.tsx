import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from '../theme/native';

/** A failed request is not evidence that the collection is empty. */
export default function ListLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text accessibilityRole="alert" style={styles.message}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}>
        <Text style={styles.label}>{t('inbox.retry')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 22, alignItems: 'center', gap: 16 },
  message: { color: '#FFFFFF', fontSize: 14, textAlign: 'center' },
  retry: { backgroundColor: '#0B7285', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  label: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
