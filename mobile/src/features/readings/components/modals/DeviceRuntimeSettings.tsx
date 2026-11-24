import React from 'react';
import { View, Text, TextInput, Switch } from '../../../../shared/theme/native';
import { useTranslation } from 'react-i18next';
import { prompts as pr } from '../../../profile/styles/profile.styles';

export type DeviceRuntimeValues = {
  intervalMinutes: string;
  pumpDurationSeconds: string;
  pumpCooldownMinutes: string;
  pumpThresholdPct: string;
  automaticPumpLaunch: boolean;
};

export function wholeNumberInRange(value: string, min: number, max: number) {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max;
}

function validThreshold(value: string) {
  return /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
}

export function runtimeValuesValid(values: DeviceRuntimeValues, pumpIncluded: boolean) {
  return wholeNumberInRange(values.intervalMinutes, 1, 1440) && (!pumpIncluded || (
    wholeNumberInRange(values.pumpDurationSeconds, 1, 300) &&
    wholeNumberInRange(values.pumpCooldownMinutes, 1, 32767) &&
    (!values.automaticPumpLaunch || validThreshold(values.pumpThresholdPct))
  ));
}

export default function DeviceRuntimeSettings({ values, onChange, pumpIncluded, moistureEnabled, disabled = false }: {
  values: DeviceRuntimeValues;
  onChange: (values: DeviceRuntimeValues) => void;
  pumpIncluded: boolean;
  moistureEnabled: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const fields: Array<{ key: keyof Omit<DeviceRuntimeValues, 'automaticPumpLaunch'>; label: string; min: number; max: number; error: string }> = [
    { key: 'intervalMinutes', label: t('readingsModals.upsert.intervalMinutes', { defaultValue: 'Reading interval (minutes)' }), min: 1, max: 1440,
      error: t('readingsModals.upsert.intervalMinutesValidation', { defaultValue: 'Enter a whole number from 1 to 1440.' }) },
    ...(pumpIncluded ? [
      { key: 'pumpDurationSeconds' as const, label: t('readingsModals.upsert.pumpDurationLabel', { defaultValue: 'Pump run time (seconds)' }), min: 1, max: 300,
        error: t('readingsModals.upsert.pumpDurationInvalid', { defaultValue: 'Enter a whole number from 1 to 300.' }) },
      { key: 'pumpCooldownMinutes' as const, label: t('readingsModals.upsert.pumpCooldownMinutes', { defaultValue: 'Automatic watering cooldown (minutes)' }), min: 1, max: 32767,
        error: t('readingsModals.upsert.pumpCooldownInvalid', { defaultValue: 'Enter a whole number from 1 to 32767.' }) },
    ] : []),
    ...(pumpIncluded && values.automaticPumpLaunch ? [
      { key: 'pumpThresholdPct' as const, label: t('readingsModals.configuration.threshold'), min: 0, max: 100,
        error: t('readingsModals.configuration.thresholdInvalid') },
    ] : []),
  ];
  return <View style={{ gap: 14 }}>
    {fields.map(field => <View key={field.key} style={{ gap: 6 }}>
      <Text style={pr.promptBtnText}>{field.label}</Text>
      <TextInput
        testID={field.key === 'intervalMinutes' ? 'reading-interval-minutes' : `device-${field.key}`}
        style={[pr.input, { marginHorizontal: 0, width: '100%' }]}
        accessibilityLabel={field.label}
        keyboardType={field.key === 'pumpThresholdPct' ? 'decimal-pad' : 'number-pad'}
        value={values[field.key]}
        editable={!disabled}
        onChangeText={value => onChange({ ...values, [field.key]: value })}
      />
      {!(field.key === 'pumpThresholdPct' ? validThreshold(values[field.key]) : wholeNumberInRange(values[field.key], field.min, field.max)) &&
        <Text accessibilityRole="alert" style={{ color: '#FF9090' }}>{field.error}</Text>}
    </View>)}
    {pumpIncluded && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={[pr.promptBtnText, { flex: 1 }]}>{t('readingsModals.upsert.automaticPumpLaunch')}</Text>
      <Switch accessibilityLabel={t('readingsModals.upsert.automaticPumpLaunch')}
        value={values.automaticPumpLaunch}
        disabled={disabled || !moistureEnabled}
        onValueChange={value => onChange({ ...values, automaticPumpLaunch: value })} />
    </View>}
  </View>;
}
