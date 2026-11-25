import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from '../../../../shared/theme/native';
import { useTranslation } from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import MaterialCommunityIcons from '../../../../shared/theme/Icon';
import AppModalFrame from '../../../../shared/ui/AppModalFrame';
import { useRequestGuard } from '../../../../shared/hooks/useRequestGuard';
import { prompts as pr } from '../../../profile/styles/profile.styles';
import { s } from '../../../reminders/styles/reminders.styles';
import type { ApiReadingDevice, ApiReadingDeviceUpdatePayload } from '../../types/readings.types';
import DeviceRuntimeSettings, { runtimeValuesValid, type DeviceRuntimeValues } from './DeviceRuntimeSettings';
import { devicePairingApi, type DeviceIdentity } from '../../../../api/services/device-pairing.service';
import type { PairingMode } from '../../pairing/pairingController';

/** Owner-only status evidence from the authenticated pairing API.
 * Missing evidence is legacy/unknown, never inferred from last_read_at.
 * Supplied status remains available for consumers which already loaded that evidence.
 */
export type DeviceSetupStatus = {
  pairing: 'not-paired' | 'pairing' | 'paired';
  online?: boolean;
  hardwareId?: string;
  firmwareVersion?: string;
  lastSeen?: string | null;
  synchronization: 'unknown' | 'pending' | 'applied' | 'rejected';
};

type Props = {
  visible: boolean;
  loading?: boolean;
  sending?: boolean;
  device: ApiReadingDevice | null;
  status?: DeviceSetupStatus;
  onClose: () => void;
  onSave: (payload: ApiReadingDeviceUpdatePayload) => Promise<void>;
  onLoadLegacySecret: () => Promise<string>;
  onEmailCode: () => Promise<void> | void;
  onPair?: (mode: PairingMode) => void;
};

function initialValues(device: ApiReadingDevice | null): DeviceRuntimeValues {
  return {
    intervalMinutes: String(device?.interval_minutes ?? (device?.interval_hours ?? 1) * 60),
    pumpDurationSeconds: String(device?.pump_duration_seconds ?? 20),
    pumpCooldownMinutes: String(device?.pump_cooldown_minutes ?? 60),
    pumpThresholdPct: String(device?.pump_threshold_pct ?? 30),
    automaticPumpLaunch: device?.automatic_pump_launch ?? false,
  };
}

export default function DeviceSetupModal({ visible, loading = false, sending = false, device, status: suppliedStatus,
  onClose, onSave, onLoadLegacySecret, onEmailCode, onPair }: Props) {
  const { t } = useTranslation();
  const [values, setValues] = useState(() => initialValues(device));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [secret, setSecret] = useState('');
  const [secretLoading, setSecretLoading] = useState(false);
  const [secretError, setSecretError] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const saveRequests = useRequestGuard();
  const secretRequests = useRequestGuard();
  const savingRef = useRef(false);
  const [identity, setIdentity] = useState<DeviceIdentity>();
  const [identityRefresh, setIdentityRefresh] = useState(0);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [identityLoadedFor, setIdentityLoadedFor] = useState<number>();
  const identityDeviceId = device?.id;
  const pairingAvailable = !!onPair;
  useEffect(() => {
    if (!visible || !identityDeviceId || !pairingAvailable) return;
    let current = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const value = await devicePairingApi.identity(identityDeviceId);
        if (current) setIdentity(value);
      } catch { /* Older API: keep the explicit legacy/unknown state. Never infer pairing. */ }
      if (current) setIdentityLoadedFor(identityDeviceId);
      if (current) timer = setTimeout(() => { void poll(); }, 10000);
    };
    void poll();
    return () => { current = false; clearTimeout(timer); };
  }, [visible, identityDeviceId, identityRefresh, pairingAvailable]);
  useEffect(() => { setIdentity(undefined); setIdentityLoadedFor(undefined); }, [identityDeviceId, visible]);
  const identityReady = !pairingAvailable || identityLoadedFor === identityDeviceId;
  const status = suppliedStatus ?? (identity?.hardware_id ? {
    pairing: identity.pairing === 'paired' ? 'paired' as const : 'not-paired' as const,
    online: identity.online, hardwareId: identity.hardware_id, firmwareVersion: identity.firmware_version ?? undefined,
    lastSeen: identity.last_seen_at, synchronization: identity.synchronization,
  } : undefined);
  useEffect(() => {
    saveRequests.activate(); secretRequests.activate();
    setValues(initialValues(device));
    setDirty(false); setSaved(false); setSaving(false); setError(false);
    setConfirmRevoke(false);
    setAdvanced(false); setSecret(''); setSecretLoading(false); setSecretError(false); setRevealed(false);
    savingRef.current = false;
    return () => { saveRequests.invalidate(); secretRequests.invalidate(); };
  }, [visible, device, saveRequests, secretRequests]);

  const legacy = !status;
  const pumpIncluded = !!device?.pump_included;
  const valid = runtimeValuesValid(values, pumpIncluded) &&
    (!pumpIncluded || !values.automaticPumpLaunch || device?.sensors.moisture !== false);
  const pairingLabel = !status ? 'legacy' : status.pairing === 'paired' && !status.online ? 'offline' : status.pairing;
  // A PATCH is not a device acknowledgement. Only later server evidence may say applied.
  const syncLabel = saved && legacy ? 'legacySaved' : saved && !identity ? 'pending' : status?.synchronization ?? 'unknown';
  const text = (key: string) => String(t(`readingsModals.configuration.${key}`));
  const revoke = async () => {
    if (!device || savingRef.current || !confirmRevoke) return;
    savingRef.current = true; setSaving(true); setError(false);
    const current = saveRequests.begin();
    try {
      await devicePairingApi.revoke(device.id);
      if (current()) { setIdentity(undefined); setConfirmRevoke(false); setIdentityRefresh(value => value + 1); }
    } catch { if (current()) setError(true); }
    finally { if (current()) { savingRef.current = false; setSaving(false); } }
  };
  const close = () => { if (!savingRef.current) { saveRequests.cancelPending(); secretRequests.cancelPending(); onClose(); } };
  const change = (next: DeviceRuntimeValues) => { setValues(next); setDirty(true); setSaved(false); setError(false); };
  const save = async () => {
    if (!device || !valid || !dirty || savingRef.current) return;
    savingRef.current = true; setSaving(true); setError(false);
    const isCurrent = saveRequests.begin();
    const payload: ApiReadingDeviceUpdatePayload = { interval_minutes: Number(values.intervalMinutes) };
    if (pumpIncluded) Object.assign(payload, {
      pump_duration_seconds: Number(values.pumpDurationSeconds),
      pump_cooldown_minutes: Number(values.pumpCooldownMinutes),
      automatic_pump_launch: values.automaticPumpLaunch,
      pump_threshold_pct: values.automaticPumpLaunch ? Number(values.pumpThresholdPct) : null,
    });
    try {
      await onSave(payload);
      if (isCurrent()) {
        setDirty(false); setSaved(true);
        setIdentity(previous => previous ? { ...previous, synchronization: 'pending' } : previous);
        setIdentityRefresh(value => value + 1);
      }
    } catch {
      if (isCurrent()) setError(true);
    } finally {
      if (isCurrent()) { savingRef.current = false; setSaving(false); }
    }
  };
  const loadSecret = async () => {
    if (!legacy || secretLoading || secret) return;
    const isCurrent = secretRequests.begin();
    setSecretLoading(true); setSecretError(false);
    try {
      const value = await onLoadLegacySecret();
      if (isCurrent()) setSecret(value);
    } catch {
      if (isCurrent()) setSecretError(true);
    } finally {
      if (isCurrent()) setSecretLoading(false);
    }
  };
  const toggleAdvanced = () => {
    setAdvanced(value => !value);
    setRevealed(false);
    if (!advanced && legacy) void loadSecret();
  };
  if (!visible) return null;
  return <AppModalFrame visible loading={loading || (!!device && !identityReady)} loadingTestID="device-setup-loading" onClose={close}
    closeLabel={t('readingsModals.common.close')}>
    {!loading && identityReady && device && <>
      {/* Keep the established automation identifier while renaming the visible UI. */}
      <Text testID="device-details-title" style={pr.promptTitle}>{text('title')}</Text>
      <View style={{ gap: 16, marginHorizontal: 16 }}>
        <InfoRow label={t('readingsModals.deviceDetails.deviceName')} value={device.device_name} />
        <InfoRow label={text('pairingStatus')} value={text(pairingLabel)} />
        <DeviceRuntimeSettings values={values} onChange={change} pumpIncluded={pumpIncluded}
          moistureEnabled={device.sensors.moisture !== false} disabled={saving} />
        {legacy && <Text style={[s.confirmText, { paddingHorizontal: 0, marginBottom: 0 }]}>{text('legacyConfigurationHint')}</Text>}
        {error && <Text accessibilityRole="alert" style={{ color: '#FF9090' }}>{text('saveFailed')}</Text>}
        <Pressable accessibilityRole="button" disabled={!valid || !dirty || saving}
          accessibilityState={{ disabled: !valid || !dirty || saving }}
          onPress={() => { void save(); }} style={[pr.promptBtn, pr.promptPrimary, { alignItems: 'center', opacity: !valid || !dirty || saving ? 0.5 : 1 }]}>
          <Text style={pr.promptPrimaryText}>{saving ? text('saving') : status?.pairing === 'paired' && status.online
            ? t('readingsModals.pairing.saveSync') : text('saveConfiguration')}</Text>
        </Pressable>

        {!onPair && <Text style={[s.confirmText, { paddingHorizontal: 0, marginBottom: 0 }]}>{text('pairingUnavailable')}</Text>}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !onPair || saving }} disabled={!onPair || saving}
          onPress={() => onPair?.(status?.pairing === 'paired' ? 'wifi' : 'pair')} style={[pr.promptBtn, { alignItems: 'center', opacity: !onPair || saving ? 0.5 : 1 }]}>
          <Text style={pr.promptBtnText}>{text(status?.pairing === 'pairing' ? 'continuePairing' : status?.pairing === 'paired' ? 'reconfigureWifi' : 'pairDevice')}</Text>
        </Pressable>
        {status?.pairing === 'paired' && <Pressable accessibilityRole="button" accessibilityState={{ disabled: !onPair || saving }} disabled={!onPair || saving}
          onPress={() => onPair?.('replace')} style={[pr.promptBtn, { alignItems: 'center', opacity: !onPair || saving ? 0.5 : 1 }]}>
          <Text style={pr.promptBtnText}>{text('replaceHardware')}</Text>
        </Pressable>}
        {status?.hardwareId && onPair && <>
          {confirmRevoke && <Text accessibilityRole="alert">{t('readingsModals.pairing.revokeHint')}</Text>}
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => {
            if (confirmRevoke) void revoke(); else setConfirmRevoke(true);
          }} style={pr.promptBtn}>
            <Text style={pr.promptBtnText}>{t(`readingsModals.pairing.${confirmRevoke ? 'confirmRevoke' : 'revoke'}`)}</Text>
          </Pressable>
          {confirmRevoke && <Pressable accessibilityRole="button" disabled={saving} onPress={() => setConfirmRevoke(false)} style={pr.promptBtn}>
            <Text style={pr.promptBtnText}>{t('readingsModals.common.cancel')}</Text>
          </Pressable>}
        </>}

        <>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: advanced }} onPress={toggleAdvanced}
            style={[pr.promptBtn, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text style={[pr.promptBtnText, { flex: 1 }]}>{text('advanced')}</Text>
            <MaterialCommunityIcons name={advanced ? 'chevron-up' : 'chevron-down'} size={22} color="#fff" />
          </Pressable>
          {advanced && <View testID="device-setup-advanced" style={{ gap: 14 }}>
        <InfoRow label={t('readingsModals.deviceDetails.deviceKey')} value={device.device_key || '—'}
          onCopy={device.device_key ? () => Clipboard.setString(device.device_key) : undefined}
          copyAccessibilityLabel={t('readingsModals.deviceDetails.copyDeviceKey')} />
        <InfoRow label={text('hardwareId')} value={status?.hardwareId || text('notReported')} />
        <InfoRow label={text('firmwareVersion')} value={status?.firmwareVersion || text('notReported')} />
        <InfoRow label={text('lastSeen')} value={status?.lastSeen || text('notReported')} />
        <InfoRow label={t('readings.tile.lastReadPrefix')} value={device.last_read_at || '—'} />
        <InfoRow label={text('synchronization')} value={text(syncLabel)} />
            {legacy && <>
            <Text style={[s.confirmText, { paddingHorizontal: 0, marginBottom: 0 }]}>{text('legacySecretHint')}</Text>
            <InfoRow label={t('readingsModals.deviceDetails.accountSecret')}
              value={revealed && secret ? secret : '••••••••••••••'} smallValueText
              onCopy={secret ? () => Clipboard.setString(secret) : undefined}
              copyAccessibilityLabel={t('readingsModals.deviceDetails.copyAuthSecret')}
              onToggleReveal={secret ? () => setRevealed(value => !value) : undefined}
              revealAccessibilityLabel={t(revealed ? 'readingsModals.deviceDetails.hideAuthSecret' : 'readingsModals.deviceDetails.showAuthSecret')}
              isRevealActive={revealed} />
            {secretLoading && <Text>{text('loadingSecret')}</Text>}
            {secretError && <Pressable accessibilityRole="button" onPress={() => { void loadSecret(); }}>
              <Text accessibilityRole="alert" style={pr.promptBtnText}>{text('retrySecret')}</Text>
            </Pressable>}
            <Block label={t('readingsModals.deviceDetails.sensors')}>
              {(['temperature', 'humidity', 'light', 'moisture'] as const).filter(key => device.sensors[key]).map(key =>
                <Text key={key} style={s.dropdownValue}>{t(`readingsModals.deviceDetails.sensor${key === 'moisture' ? 'Moisture' : key[0].toUpperCase() + key.slice(1)}`)}</Text>)}
            </Block>
            {dirty && <Text style={[s.confirmText, { paddingHorizontal: 0, marginBottom: 0 }]}>{text('saveBeforeCode')}</Text>}
            <Pressable accessibilityRole="button" onPress={onEmailCode} disabled={sending || saving || dirty || !device.device_key}
              style={[pr.promptBtn, pr.promptPrimary, { alignItems: 'center', opacity: sending || saving || dirty || !device.device_key ? 0.5 : 1 }]}>
              <Text style={pr.promptPrimaryText}>{t(sending ? 'readingsModals.deviceDetails.emailingCode' : 'readingsModals.deviceDetails.emailCode')}</Text>
            </Pressable>
            </>}
          </View>}
        </>
        <Pressable accessibilityRole="button" style={[pr.promptBtn, { alignItems: 'center' }]} onPress={close} disabled={saving}>
          <Text style={pr.promptBtnText}>{t('readingsModals.common.close')}</Text>
        </Pressable>
      </View>
    </>}
  </AppModalFrame>;
}

function InfoRow({
  label,
  value,
  onCopy,
  copyAccessibilityLabel,
  onToggleReveal,
  revealAccessibilityLabel,
  isRevealActive,
  smallValueText = false,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copyAccessibilityLabel?: string;
  onToggleReveal?: () => void;
  revealAccessibilityLabel?: string;
  isRevealActive?: boolean;
  smallValueText?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.dropdownValue}>{label}</Text>

      <View
        style={{
          padding: 12,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.10)',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Text
          style={[
            s.codeBlockText,
            {
              fontVariant: ['tabular-nums'],
              flex: 1,
              minWidth: 0,
              fontSize: smallValueText ? 10 : undefined,
              lineHeight: smallValueText ? 20 : undefined,
            },
          ]}
          selectable
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value}
        </Text>

        {!!onToggleReveal && (
          <Pressable
            onPress={onToggleReveal}
            accessibilityRole="button"
            accessibilityLabel={revealAccessibilityLabel}
            hitSlop={10}
            style={{ padding: 4 }}
          >
            <MaterialCommunityIcons
              name={isRevealActive ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#fff"
            />
          </Pressable>
        )}

        {!!onCopy && (
          <Pressable
            onPress={onCopy}
            accessibilityRole="button"
            accessibilityLabel={copyAccessibilityLabel}
            hitSlop={10}
            style={{ padding: 4 }}
          >
            <MaterialCommunityIcons name="content-copy" size={20} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.dropdownValue}>{label}</Text>
      {children}
    </View>
  );
}
