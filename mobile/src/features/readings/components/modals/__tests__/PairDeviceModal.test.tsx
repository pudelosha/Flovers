import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import PairDeviceModal from '../PairDeviceModal';
import { listReadingDevices } from '../../../../../api/services/readings.service';
import { PairingController } from '../../../pairing/pairingController';
import type { DeviceQr } from '../../../pairing/deviceQr';
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => {
  const resources = require('../../../../../i18n/locales/en/readingsModals.json');
  return key.split('.').reduce((value, part) => value?.[part], resources) ?? key;
} }) }));
jest.mock('../../../../../api/services/readings.service', () => ({ listReadingDevices: jest.fn() }));
jest.mock('../../../pairing/bleTransport', () => ({ EspressifBleTransport: jest.fn() }));
jest.mock('../../../pairing/pairingController', () => ({
  ...jest.requireActual('../../../pairing/pairingController'), PairingController: jest.fn(),
}));
jest.mock('../../../../../shared/ui/AppModalFrame', () => ({ __esModule: true,
  default: ({ loading, children }: any) => loading
    ? require('react').createElement(require('react-native').Text, null, 'Loading') : children,
}));
const qr: DeviceQr = { version: 1, type: 'flovers-device', hardware_id: 'FACTORY_TEST_0001',
  name: 'FLOVERS_EST_0001', transport: 'ble', pop: 'P'.repeat(43) };
const own = { id: 12, device_name: 'My board', plant_name: 'Fern' };
const shared = { id: 13, device_name: 'Shared board', access: { is_owner: false, is_shared: true,
  can_edit: false, can_complete_tasks: true, owner: { id: '1', name: 'Owner' }, expires_at: null } };
const mockRun = jest.fn(); const mockCancel = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(listReadingDevices).mockResolvedValue([own, shared] as any);
  mockRun.mockResolvedValue({}); mockCancel.mockResolvedValue(true);
  jest.mocked(PairingController).mockImplementation(() => ({ run: mockRun, cancel: mockCancel } as any));
});
it('loads owner entries before rendering controls and excludes shared devices', async () => {
  const view = render(<PairDeviceModal qr={qr} onClose={jest.fn()} />);
  expect(view.getByText('Loading')).toBeTruthy(); expect(view.queryByText('Wi-Fi name (SSID)')).toBeNull();
  await waitFor(() => expect(view.getByText('Choose a device')).toBeTruthy());
  fireEvent.press(view.getByText('Choose a device'));
  expect(view.getByText('My board — Fern')).toBeTruthy(); expect(view.queryByText('Shared board')).toBeNull();
  expect(JSON.stringify(view.toJSON())).not.toContain(qr.pop);
});
it('does not permit device-only pairing for a non-owner device', async () => {
  const view = render(<PairDeviceModal qr={qr} deviceId={13} onClose={jest.fn()} />);
  await waitFor(() => expect(view.getByText('Could not load your devices.')).toBeTruthy());
  expect(view.queryByText('Connect')).toBeNull(); expect(mockRun).not.toHaveBeenCalled();
});
it('validates Wi-Fi and requires explicit replacement confirmation', async () => {
  const view = render(<PairDeviceModal qr={qr} deviceId={12} mode="replace" onClose={jest.fn()} />);
  await waitFor(() => expect(view.getByLabelText('Wi-Fi name (SSID)')).toBeTruthy());
  fireEvent.changeText(view.getByLabelText('Wi-Fi name (SSID)'), 'Synthetic network');
  fireEvent.changeText(view.getByLabelText('Wi-Fi password'), 'synthetic-password');
  fireEvent.press(view.getByRole('button', { name: 'Connect' })); expect(mockRun).not.toHaveBeenCalled();
  fireEvent(view.getByLabelText('Replace the current board and revoke its access. Existing readings and pump cooldown remain.'), 'valueChange', true);
  await act(async () => fireEvent.press(view.getByRole('button', { name: 'Connect' })));
  expect(mockRun).toHaveBeenCalledWith(expect.objectContaining({ deviceId: 12, mode: 'replace', replacementConfirmed: true }), expect.any(Function));
  expect(view.getByLabelText('Wi-Fi password').props.value).toBe('');
});
it('keeps load failures retryable without starting BLE', async () => {
  jest.mocked(listReadingDevices).mockRejectedValueOnce(new Error('offline'));
  const view = render(<PairDeviceModal qr={qr} onClose={jest.fn()} />);
  await waitFor(() => expect(view.getByText('Could not load your devices.')).toBeTruthy());
  await act(async () => fireEvent.press(view.getByText('Try again')));
  expect(view.getByText('Choose a device')).toBeTruthy(); expect(mockRun).not.toHaveBeenCalled();
});
