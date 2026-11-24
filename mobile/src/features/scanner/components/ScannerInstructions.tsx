import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text } from '../../../shared/theme/native';
import Icon from '../../../shared/theme/Icon';
import { scannerStyles as styles } from '../styles/scanner.styles';

export default function ScannerInstructions({ deviceOnly = false }: { deviceOnly?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.infoInner}>
      <Text style={styles.infoTitle}>{t('scanner.howItWorks.title')}</Text>
      {!deviceOnly && <Text style={styles.infoText}>{t('scanner.guide.intro')}</Text>}
      {(!deviceOnly ? ['plant', 'device'] : ['device']).map((kind, index) => (
        <View key={kind} style={[styles.guideRow, index > 0 && styles.guideDivider]}>
          <View style={styles.guideIcon}>
            <Icon name={kind === 'plant' ? 'sprout' : 'chip'} size={21} />
          </View>
          <View style={styles.guideCopy}>
            <Text style={styles.guideTitle}>{t(`scanner.guide.${kind}.title`)}</Text>
            <Text style={styles.infoText}>{t(`scanner.guide.${kind}.body`)}</Text>
            <Text style={styles.guidePath}>{t(`scanner.guide.${kind}.path`)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
