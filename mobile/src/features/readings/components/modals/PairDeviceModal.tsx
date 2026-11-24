import React, { useEffect, useRef, useState } from 'react';
import { AppState, View as NativeView, Text as NativeText } from 'react-native';
import { View, Text, TextInput, Pressable, Switch } from '../../../../shared/theme/native';
import { useTranslation } from 'react-i18next';
import AppModalFrame from '../../../../shared/ui/AppModalFrame';
import CenteredSpinner from '../../../../shared/ui/CenteredSpinner';
import { prompts as pr } from '../../../profile/styles/profile.styles';
import { devicePairingApi } from '../../../../api/services/device-pairing.service';
import { listReadingDevices } from '../../../../api/services/readings.service';
import { onAuthSessionChanged } from '../../../../api/client';
import { plantAccess } from '../../../../shared/utils/plantAccess';
import type { ApiReadingDevice } from '../../types/readings.types';
import type { DeviceQr } from '../../pairing/deviceQr';
import { PairingController, PairingFailure, validWifi, type PairingMode, type PairingStage } from '../../pairing/pairingController';
import { EspressifBleTransport } from '../../pairing/bleTransport';

export default function PairDeviceModal({ qr, deviceId, mode = 'pair', onClose }: {
  qr: DeviceQr; deviceId?: number; mode?: PairingMode; onClose: () => void;
}) {
  const { t } = useTranslation();
  const tr = (key: string) => String(t(`readingsModals.pairing.${key}`));
  const [devices, setDevices] = useState<ApiReadingDevice[]>([]);
  const [selected, setSelected] = useState(deviceId);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [stage, setStage] = useState<PairingStage>();
  const [error, setError] = useState('');
  const [closing, setClosing] = useState(false);
  const controller = useRef<PairingController | null>(null);
  const mounted = useRef(true);
  const cancelled = useRef(false);
  const working = stage !== undefined && stage !== 'complete';
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError(false);
    listReadingDevices().then(rows => {
      if (!active) return;
      const owned = rows.filter(row => plantAccess(row.access).canEdit);
      setDevices(owned);
      if (deviceId && !owned.some(row => row.id === deviceId)) setLoadError(true);
    }, () => { if (active) setLoadError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deviceId, reload]);
  useEffect(() => {
    mounted.current = true;
    const stop = () => {
      if (!controller.current) return;
      cancelled.current = true;
      void controller.current.cancel();
      if (mounted.current) { setStage(undefined); setError('interrupted'); setPassword(''); }
    };
    const app = AppState.addEventListener('change', state => { if (state === 'background') stop(); });
    const removeAuth = onAuthSessionChanged(() => { stop(); onClose(); });
    return () => { mounted.current = false; app.remove(); removeAuth(); void controller.current?.cancel(); };
  }, [onClose]);

  const close = async () => {
    if (closing) return;
    if (controller.current && working) {
      setClosing(true); cancelled.current = true;
      const safelyCancelled = await controller.current.cancel();
      if (!mounted.current) return;
      setClosing(false); setStage(undefined); setPassword('');
      // A queued Wi-Fi operation or bound claim may finish after the dialog closes.
      if (!safelyCancelled) { setError('interrupted'); controller.current = null; return; }
    }
    onClose();
  };
  const start = async () => {
    if (!selected || working || closing || !validWifi(ssid, password) ||
      !devices.some(row => row.id === selected) || (mode === 'replace' && !confirmed)) return;
    cancelled.current = false;
    const operation = new PairingController(devicePairingApi, new EspressifBleTransport());
    controller.current = operation; setError(''); setStage('connecting');
    const wifiPassword = password; setPassword('');
    try {
      await operation.run({ deviceId: selected, qr, mode, ssid, password: wifiPassword, replacementConfirmed: confirmed },
        next => { if (mounted.current && !cancelled.current) setStage(next); });
    } catch (failure) {
      if (mounted.current && !cancelled.current) {
        setStage(undefined);
        setError(failure instanceof PairingFailure ? failure.code : 'network');
      }
    } finally { if (controller.current === operation) controller.current = null; }
  };
  return <AppModalFrame visible loading={loading} onClose={() => { void close(); }} closeLabel={t('readingsModals.common.close')}>
    <Text style={pr.promptTitle}>{tr(mode === 'wifi' ? 'wifiTitle' : mode === 'replace' ? 'replaceTitle' : 'title')}</Text>
    <View style={{ gap: 16, marginHorizontal: 16 }}>
      <Text>{tr('description')}</Text>
      <Text>{qr.hardware_id}</Text>
      {loadError ? <><Text accessibilityRole="alert">{tr('loadFailed')}</Text>
        <Pressable style={pr.promptBtn} onPress={() => setReload(value => value + 1)}><Text style={pr.promptBtnText}>{tr('retry')}</Text></Pressable></> : <>
        <Text>{tr('device')}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded, disabled: !!deviceId || working }} disabled={!!deviceId || working}
          style={pr.promptBtn} onPress={() => setExpanded(value => !value)}>
          <Text style={pr.promptBtnText}>{devices.find(row => row.id === selected)?.device_name ?? tr('choose')}</Text>
        </Pressable>
        {expanded && <NativeView style={{ backgroundColor: '#101715', borderRadius: 12 }}>
          {devices.map(row => <Pressable key={row.id} style={{ padding: 14 }} accessibilityRole="button"
            onPress={() => { setSelected(row.id); setExpanded(false); }}>
            <NativeText style={{ color: '#fff' }}>{row.device_name} — {row.plant_name}</NativeText>
          </Pressable>)}
        </NativeView>}
        {!devices.length && <Text>{tr('noDevices')}</Text>}
        {stage !== 'complete' && <>
          <Text>{tr('wifiHint')}</Text>
          <TextInput accessibilityLabel={tr('ssid')} placeholder={tr('ssid')} value={ssid} onChangeText={setSsid}
            editable={!working && !closing} autoCapitalize="none" autoCorrect={false} style={[pr.input, { marginHorizontal: 0 }]} />
          <TextInput accessibilityLabel={tr('password')} placeholder={tr('password')} value={password} onChangeText={setPassword}
            editable={!working && !closing} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="none" style={[pr.input, { marginHorizontal: 0 }]} />
          {mode === 'replace' && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Switch accessibilityLabel={tr('replacement')} value={confirmed} onValueChange={setConfirmed} disabled={working} />
            <Text style={{ flex: 1 }}>{tr('replacement')}</Text>
          </View>}
        </>}
        {working && <View style={{ height: 48 }}><CenteredSpinner size={28} /></View>}
        {stage && <Text accessibilityRole="alert" testID="pairing-progress">{tr(stage)}</Text>}
        {error !== '' && <Text accessibilityRole="alert">{tr(`errors.${error}`)}</Text>}
        {stage !== 'complete' && <Pressable accessibilityRole="button"
          disabled={!selected || working || closing || !validWifi(ssid, password) || (mode === 'replace' && !confirmed)}
          onPress={() => { void start(); }} style={[pr.promptBtn, pr.promptPrimary, { alignItems: 'center' }]}>
          <Text style={pr.promptPrimaryText}>{tr('start')}</Text>
        </Pressable>}
      </>}
      <Pressable accessibilityRole="button" disabled={closing} onPress={() => { void close(); }} style={[pr.promptBtn, { alignItems: 'center' }]}>
        <Text style={pr.promptBtnText}>{t('readingsModals.common.close')}</Text>
      </Pressable>
    </View>
  </AppModalFrame>;
}
