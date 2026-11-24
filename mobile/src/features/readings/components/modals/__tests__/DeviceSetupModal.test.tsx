import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import DeviceSetupModal from '../DeviceSetupModal';
import type { ApiReadingDevice } from '../../../types/readings.types';
import { devicePairingApi } from '../../../../../api/services/device-pairing.service';
jest.mock('../../../../../api/services/device-pairing.service', () => ({ devicePairingApi: { identity: jest.fn(), revoke: jest.fn() } }));

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, opts?: any) => {
  const resources = { ...require('../../../../../i18n/locales/en/readingsModals.json'), ...require('../../../../../i18n/locales/en/readings.json') };
  return key.split('.').reduce((value, part) => value?.[part], resources) ?? opts?.defaultValue ?? key;
} }) }));
jest.mock('@react-native-clipboard/clipboard', () => ({ __esModule: true, default: { setString: jest.fn() } }));
jest.mock('../../../../../shared/ui/AppModalFrame', () => ({ __esModule: true,
  default: ({ visible, loading, loadingTestID, children, onClose }: any) => visible
    ? require('react').createElement(require('react-native').View, null,
      require('react').createElement(require('react-native').Text, { onPress: onClose }, 'Dismiss'),
      loading ? require('react').createElement(require('react-native').Text, { testID: loadingTestID }, 'Loading') : children) : null,
}));

const device = { id: 12, device_key: 'SYNTHETIC', device_name: 'Board', plant: 1, plant_name: 'Fern',
  interval_hours: 4, pump_included: true, pump_duration_seconds: 20, pump_cooldown_minutes: 90,
  automatic_pump_launch: false, pump_threshold_pct: null, sensors: { moisture: true, temperature: true },
  last_read_at: '2026-11-23T12:00:00Z' } as ApiReadingDevice;
const props = { visible: true, device, onClose: jest.fn(), onSave: jest.fn(), onLoadLegacySecret: jest.fn(), onEmailCode: jest.fn() };
const pairedIdentity = { pairing: 'paired' as const, synchronization: 'applied' as const, hardware_id: 'FACTORY_TEST_0001',
  online: true, desired_config_version: 2, applied_config_version: 2 };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
beforeEach(() => {
  jest.clearAllMocks(); props.onSave.mockReset().mockResolvedValue(undefined);
  props.onLoadLegacySecret.mockReset().mockResolvedValue('synthetic-legacy-secret');
  jest.mocked(devicePairingApi.identity).mockReset().mockResolvedValue({ pairing: 'legacy-or-not-paired', synchronization: 'unknown' });
  jest.mocked(devicePairingApi.revoke).mockReset().mockResolvedValue(undefined);
});
async function save(view: ReturnType<typeof render>) {
  await act(async () => fireEvent.press(view.getByText('Save configuration')));
}

it('loads legacy hours as minutes and saves exact runtime fields without claiming synchronization', async () => {
  const view = render(<DeviceSetupModal {...props} />);
  expect(view.getByLabelText('Reading interval (minutes)').props.value).toBe('240');
  expect(view.getByLabelText('Pump run time (seconds)').props.value).toBe('20');
  expect(view.getByText('Legacy / pairing not reported')).toBeTruthy();
  expect(view.queryByText('Not paired')).toBeNull(); // A real reading is not pairing evidence.
  fireEvent.changeText(view.getByLabelText('Reading interval (minutes)'), '45');
  fireEvent.changeText(view.getByLabelText('Automatic watering cooldown (minutes)'), '120');
  await save(view);
  expect(props.onSave).toHaveBeenCalledWith({ interval_minutes: 45, pump_duration_seconds: 20,
    pump_cooldown_minutes: 120, automatic_pump_launch: false, pump_threshold_pct: null });
  await act(async () => fireEvent.press(view.getByText('Advanced / DIY integration')));
  expect(view.getByText('Saved in Flovers; device application not confirmed')).toBeTruthy();
  expect(view.queryByText('Applied by device')).toBeNull();
});

it.each(['', '0', '1441', '1.5', '1e3', '-2'])('blocks invalid reading interval %s', async value => {
  const view = render(<DeviceSetupModal {...props} />);
  fireEvent.changeText(view.getByLabelText('Reading interval (minutes)'), value); await save(view);
  expect(props.onSave).not.toHaveBeenCalled();
  expect(view.getByText('Enter a whole number from 1 to 1440.')).toBeTruthy();
});
it.each(['', '0', '32768', '1.5', '1e3'])('blocks invalid cooldown %s', async value => {
  const view = render(<DeviceSetupModal {...props} />);
  fireEvent.changeText(view.getByLabelText('Automatic watering cooldown (minutes)'), value); await save(view);
  expect(props.onSave).not.toHaveBeenCalled();
  expect(view.getByText('Enter a whole number from 1 to 32767.')).toBeTruthy();
});
it.each(['', '0', '301', '-1', '1.5', '2e2', 'abc'])('blocks invalid pump duration %s', async value => {
  const view = render(<DeviceSetupModal {...props} />);
  fireEvent.changeText(view.getByLabelText('Pump run time (seconds)'), value); await save(view);
  expect(props.onSave).not.toHaveBeenCalled();
  expect(view.getByText('Enter a whole number from 1 to 300.')).toBeTruthy();
});
it.each([1, 90, 1440])('preserves valid minute interval %s', async interval => {
  const view = render(<DeviceSetupModal {...props} device={{ ...device, interval_minutes: interval }} />);
  expect(view.getByLabelText('Reading interval (minutes)').props.value).toBe(String(interval));
  fireEvent.changeText(view.getByLabelText('Pump run time (seconds)'), '1'); await save(view);
  expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ interval_minutes: interval, pump_duration_seconds: 1 }));
});
it.each([1, 300])('accepts pump duration boundary %s', async duration => {
  const view = render(<DeviceSetupModal {...props} />);
  fireEvent.changeText(view.getByLabelText('Pump run time (seconds)'), String(duration)); await save(view);
  expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ pump_duration_seconds: duration }));
});
it('uses defaults of 60/20/60 without enabling automatic watering', () => {
  const view = render(<DeviceSetupModal {...props} device={{ ...device, interval_hours: 1, pump_cooldown_minutes: undefined }} />);
  expect(view.getByLabelText('Reading interval (minutes)').props.value).toBe('60');
  expect(view.getByLabelText('Pump run time (seconds)').props.value).toBe('20');
  expect(view.getByLabelText('Automatic watering cooldown (minutes)').props.value).toBe('60');
  expect(view.getByRole('switch').props.value).toBe(false);
});
it('shows disabled pump controls and never writes pump settings for a sensor-only device', async () => {
  const view = render(<DeviceSetupModal {...props} device={{ ...device, pump_included: false }} />);
  expect(view.getByLabelText('Pump run time (seconds)').props.editable).toBe(false);
  expect(view.getByLabelText('Automatic watering cooldown (minutes)').props.editable).toBe(false);
  expect(view.getByLabelText('Automatic watering threshold (%)').props.editable).toBe(false);
  expect(view.getByRole('switch').props.disabled).toBe(true);
  fireEvent.changeText(view.getByLabelText('Reading interval (minutes)'), '60'); await save(view);
  expect(props.onSave).toHaveBeenCalledWith({ interval_minutes: 60 });
});
it('updates the existing automatic-watering threshold field and rejects invalid thresholds', async () => {
  const view = render(<DeviceSetupModal {...props} />);
  fireEvent(view.getByRole('switch'), 'valueChange', true);
  fireEvent.changeText(view.getByLabelText('Automatic watering threshold (%)'), '101'); await save(view);
  expect(props.onSave).not.toHaveBeenCalled();
  fireEvent.changeText(view.getByLabelText('Automatic watering threshold (%)'), '35'); await save(view);
  expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ automatic_pump_launch: true, pump_threshold_pct: 35 }));
});
it('keeps the threshold below its toggle and disables editing until automatic watering is enabled', () => {
  const view = render(<DeviceSetupModal {...props} />);
  const threshold = view.getByLabelText('Automatic watering threshold (%)');
  expect(threshold.props.editable).toBe(false);
  const json = JSON.stringify(view.toJSON());
  expect(json.indexOf('device-automatic-pump')).toBeLessThan(json.indexOf('device-field-pumpThresholdPct'));
  fireEvent(view.getByRole('switch'), 'valueChange', true);
  expect(view.getByLabelText('Automatic watering threshold (%)').props.editable).toBe(true);
  fireEvent.changeText(view.getByLabelText('Automatic watering threshold (%)'), '28');
  fireEvent(view.getByRole('switch'), 'valueChange', false);
  expect(view.getByLabelText('Automatic watering threshold (%)').props.value).toBe('28');
  expect(view.getByLabelText('Automatic watering threshold (%)').props.editable).toBe(false);
});
it('keeps plant and technical metadata out of the main form', async () => {
  const view = render(<DeviceSetupModal {...props} />);
  expect(view.queryByText('Fern')).toBeNull();
  expect(view.queryByText('SYNTHETIC')).toBeNull();
  expect(view.queryByText(device.last_read_at!)).toBeNull();
  expect(view.getByLabelText('Reading interval (minutes)')).toBeTruthy();
  await act(async () => fireEvent.press(view.getByText('Advanced / DIY integration')));
  expect(view.getByText('SYNTHETIC')).toBeTruthy();
  expect(view.getByText(device.last_read_at!)).toBeTruthy();
});
it('preserves a valid fractional threshold already accepted by Django', async () => {
  const view = render(<DeviceSetupModal {...props} device={{ ...device, automatic_pump_launch: true, pump_threshold_pct: 25.5 }} />);
  fireEvent.changeText(view.getByLabelText('Reading interval (minutes)'), '70'); await save(view);
  expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ pump_threshold_pct: 25.5 }));
});
it('retains unsaved values on failure, permits retry and blocks duplicate saves', async () => {
  const pending = deferred<void>(); props.onSave.mockRejectedValueOnce(new Error('403')).mockReturnValueOnce(pending.promise);
  const view = render(<DeviceSetupModal {...props} />);
  fireEvent.changeText(view.getByLabelText('Reading interval (minutes)'), '75'); await save(view);
  expect(view.getByRole('alert')).toBeTruthy();
  expect(view.getByLabelText('Reading interval (minutes)').props.value).toBe('75');
  await save(view); fireEvent.press(view.getByText('Saving…'));
  expect(props.onSave).toHaveBeenCalledTimes(2);
  await act(async () => pending.resolve());
  expect(view.queryByRole('alert')).toBeNull();
});
it('retrieves the legacy secret only after explicit expansion and clears it on close', async () => {
  const view = render(<DeviceSetupModal {...props} />);
  expect(props.onLoadLegacySecret).not.toHaveBeenCalled();
  expect(view.queryByText('synthetic-legacy-secret')).toBeNull();
  await act(async () => fireEvent.press(view.getByText('Advanced / DIY integration')));
  fireEvent.press(view.getByLabelText('Show Auth Secret Key'));
  expect(view.getByText('synthetic-legacy-secret')).toBeTruthy();
  fireEvent.press(view.getByLabelText('Copy Auth Secret Key'));
  expect(Clipboard.setString).toHaveBeenCalledWith('synthetic-legacy-secret');
  view.rerender(<DeviceSetupModal {...props} visible={false} />);
  view.rerender(<DeviceSetupModal {...props} />);
  expect(view.queryByText('synthetic-legacy-secret')).toBeNull();
});
it('shows technical details in Advanced but never exposes legacy credentials for a paired device', async () => {
  const view = render(<DeviceSetupModal {...props} status={{ pairing: 'paired', online: false, synchronization: 'pending', hardwareId: 'hw-test' }} />);
  expect(view.getByText('Paired · Offline')).toBeTruthy();
  expect(view.queryByText('hw-test')).toBeNull();
  await act(async () => fireEvent.press(view.getByText('Advanced / DIY integration')));
  expect(view.getByText('hw-test')).toBeTruthy();
  expect(view.queryByLabelText('Show Auth Secret Key')).toBeNull();
  expect(props.onLoadLegacySecret).not.toHaveBeenCalled();
});
it('does not let a late secret response leak into another device setup visit', async () => {
  const pending = deferred<string>(); props.onLoadLegacySecret.mockReturnValueOnce(pending.promise);
  const view = render(<DeviceSetupModal {...props} />);
  await act(async () => fireEvent.press(view.getByText('Advanced / DIY integration')));
  view.rerender(<DeviceSetupModal {...props} visible={false} />);
  view.rerender(<DeviceSetupModal {...props} device={{ ...device, id: 13 }} />);
  await act(async () => pending.resolve('late-secret-from-old-device'));
  expect(view.queryByText('late-secret-from-old-device')).toBeNull();
  expect(view.queryByLabelText('Show Auth Secret Key')).toBeNull();
});
it('keeps pairing, Wi-Fi reconfiguration and replacement disabled until real integrations exist', () => {
  const view = render(<DeviceSetupModal {...props} status={{ pairing: 'paired', online: true, synchronization: 'unknown' }} />);
  expect(view.getByRole('button', { name: 'Reconfigure Wi-Fi' }).props.accessibilityState.disabled).toBe(true);
  expect(view.getByRole('button', { name: 'Replace / re-pair device' }).props.accessibilityState.disabled).toBe(true);
});
it('blocks emailing stale code until the configuration is saved', async () => {
  const view = render(<DeviceSetupModal {...props} />);
  await act(async () => fireEvent.press(view.getByText('Advanced / DIY integration')));
  fireEvent.changeText(view.getByLabelText('Reading interval (minutes)'), '61');
  fireEvent.press(view.getByText('Email code')); expect(props.onEmailCode).not.toHaveBeenCalled();
  await save(view);
  await act(async () => fireEvent.press(view.getByText('Email code')));
  expect(props.onEmailCode).toHaveBeenCalledTimes(1);
});
it('shows only the shared spinner until device data has loaded', () => {
  const view = render(<DeviceSetupModal {...props} loading device={null} />);
  expect(view.getByTestId('device-setup-loading')).toBeTruthy();
  expect(view.queryByText('Device setup')).toBeNull();
  expect(view.queryByLabelText('Reading interval (minutes)')).toBeNull();
});
it('waits for authenticated identity evidence and wires real pairing actions', async () => {
  const pending = deferred<typeof pairedIdentity>();
  jest.mocked(devicePairingApi.identity).mockReturnValue(pending.promise);
  const onPair = jest.fn(); const view = render(<DeviceSetupModal {...props} onPair={onPair} />);
  expect(view.getByTestId('device-setup-loading')).toBeTruthy();
  expect(view.queryByText('Device setup')).toBeNull();
  await act(async () => pending.resolve(pairedIdentity));
  expect(view.queryByText('Applied by device')).toBeNull();
  expect(view.getByText('Save & sync')).toBeTruthy();
  fireEvent.press(view.getByText('Advanced / DIY integration'));
  expect(view.getByText('Applied by device')).toBeTruthy();
  fireEvent.press(view.getByText('Reconfigure Wi-Fi')); expect(onPair).toHaveBeenCalledWith('wifi');
  fireEvent.press(view.getByText('Replace / re-pair device')); expect(onPair).toHaveBeenCalledWith('replace');
  expect(props.onLoadLegacySecret).not.toHaveBeenCalled();
});
it('requires explicit confirmation to revoke access and preserves device settings', async () => {
  jest.mocked(devicePairingApi.identity).mockResolvedValueOnce(pairedIdentity);
  const view = render(<DeviceSetupModal {...props} onPair={jest.fn()} />);
  await waitFor(() => expect(view.getByText('Revoke board access')).toBeTruthy());
  fireEvent.press(view.getByText('Revoke board access'));
  expect(devicePairingApi.revoke).not.toHaveBeenCalled();
  await act(async () => fireEvent.press(view.getByText('Confirm revocation')));
  expect(devicePairingApi.revoke).toHaveBeenCalledWith(device.id);
  expect(props.onSave).not.toHaveBeenCalled();
  expect(props.onLoadLegacySecret).not.toHaveBeenCalled();
});
