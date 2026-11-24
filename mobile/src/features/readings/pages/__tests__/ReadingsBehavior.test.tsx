import React from 'react';
import { RefreshControl, Switch } from 'react-native';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import Screen from '../ReadingsScreen';
import * as api from '../../../../api/services/readings.service';
import { fetchPlantInstances } from '../../../../api/services/plant-instances.service';
import { ApiError } from '../../../../api/client';
import { devicePairingApi } from '../../../../api/services/device-pairing.service';

const mockT = (key: string) => key;
const mockNav = { navigate: jest.fn() };
let mockFocused = true;
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: mockT, i18n: { language: 'en' } }) }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNav,
  useFocusEffect: (effect: any) => require('react').useEffect(() => mockFocused ? effect() : undefined, [effect, mockFocused]),
}));
jest.mock('@react-native-clipboard/clipboard', () => ({ __esModule: true, default: { setString: jest.fn() } }));
jest.mock('../../../../api/services/plant-instances.service', () => ({ fetchPlantInstances: jest.fn() }));
jest.mock('../../../../api/services/device-pairing.service', () => ({ devicePairingApi: {
  identity: jest.fn(), revoke: jest.fn(),
} }));
jest.mock('../../../../api/services/readings.service', () => ({
  ...jest.requireActual('../../../../api/services/readings.service'),
  listReadingDevices: jest.fn(), getReadingDevice: jest.fn(), createReadingDevice: jest.fn(),
  updateReadingDevice: jest.fn(), deleteReadingDevice: jest.fn(), fetchDeviceSetup: jest.fn(), toggleAutoPump: jest.fn(),
}));
// Presentation shells only; real ReadingTile, ReadingMenu, forms, permission
// checks, request guards and refresh hook stay mounted throughout each scenario.
jest.mock('../../../../shared/ui/GlassHeader', () => () => null);
jest.mock('../../../../shared/ui/HeaderPresentation', () => ({ useHeaderContentReady: () => true,
  ScreenLoadingSpinner: () => require('react').createElement(require('react-native').Text, { testID: 'loading' }, 'Loading'),
}));
jest.mock('../../../../shared/ui/AppModalFrame', () => ({ __esModule: true, appModalStyles: {},
  default: ({ visible, loading, loadingTestID, children, onClose }: any) => visible
    ? require('react').createElement(require('react-native').View, null,
      require('react').createElement(require('react-native').Text, { testID: 'modal-dismiss', onPress: onClose }, 'Dismiss'),
      loading ? require('react').createElement(require('react-native').Text, { testID: loadingTestID }, 'Loading') : children) : null,
}));
jest.mock('../../../../shared/ui/FloatingTileMenu', () => ({ children }: any) => children);
jest.mock('../../../../shared/ui/FAB', () => ({ actions }: any) => require('react').createElement(require('react-native').View, null,
  actions.map((action: any) => require('react').createElement(require('react-native').Text,
    { key: action.key, onPress: action.onPress }, action.label))));
jest.mock('../../../../shared/ui/TopSnackbar', () => ({ visible, message }: any) => visible
  ? require('react').createElement(require('react-native').Text, { testID: 'toast' }, message) : null);

const list = jest.mocked(api.listReadingDevices);
const device = {
  id: 11, plant: 21, plant_name: 'Fern', plant_location: 'Kitchen', device_name: 'Fern board',
  is_active: true, interval_minutes: 60, pump_included: true, automatic_pump_launch: false,
  pump_duration_seconds: 20, pump_cooldown_minutes: 60, pump_threshold_pct: 30,
  sensors: { temperature: true, humidity: false, light: false, moisture: true },
  latest: { temperature: 22, humidity: null, light: null, moisture: 40 },
  created_at: '2026-11-19T12:00:00Z', last_read_at: '2026-11-19T12:00:00Z',
} as any;
const sharedAccess = { is_owner: false, is_shared: true, can_edit: false, can_complete_tasks: true,
  owner: { id: 'owner', name: 'Owner' }, expires_at: null };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-11-19T12:00:00Z'));
  jest.clearAllMocks(); mockNav.navigate.mockClear(); mockFocused = true;
  [list, api.createReadingDevice, api.updateReadingDevice, api.deleteReadingDevice, api.toggleAutoPump].forEach(fn => jest.mocked(fn).mockReset());
  list.mockResolvedValue([device]);
  jest.mocked(devicePairingApi.identity).mockResolvedValue({ pairing: 'legacy-or-not-paired', synchronization: 'unknown' });
  jest.mocked(api.getReadingDevice).mockReset().mockResolvedValue(device);
  jest.mocked(fetchPlantInstances).mockResolvedValue([{ id: 21, display_name: 'Fern' }] as any);
  jest.mocked(api.fetchDeviceSetup).mockResolvedValue({ secret: 'synthetic', endpoints: {} } as any);
});
afterEach(() => { cleanup(); act(() => jest.runOnlyPendingTimers()); jest.useRealTimers(); });
async function loaded() { const view = render(<Screen />); await act(async () => {}); return view; }
function menu(view: ReturnType<typeof render>) { fireEvent.press(view.getByText('dots-horizontal')); }
function refresh(view: ReturnType<typeof render>) { fireEvent(view.UNSAFE_getByType(RefreshControl), 'refresh'); }

it('waits for both devices and plants before exposing populated or empty UI', async () => {
  const devices = deferred<any[]>(); const plants = deferred<any[]>();
  list.mockReturnValueOnce(devices.promise); jest.mocked(fetchPlantInstances).mockReturnValueOnce(plants.promise);
  const view = render(<Screen />);
  expect(view.getByTestId('loading')).toBeTruthy(); expect(view.queryByText('No devices yet')).toBeNull();
  await act(async () => devices.resolve([]));
  expect(view.getByTestId('loading')).toBeTruthy();
  await act(async () => plants.resolve([]));
  expect(view.queryByTestId('loading')).toBeNull(); expect(view.getByText('No devices yet')).toBeTruthy();
});

it.each([401, 403, 500])('shows an actionable error rather than empty UI after HTTP %s and recovers on retry', async status => {
  list.mockRejectedValueOnce(new ApiError(status, {})).mockResolvedValueOnce([device]);
  const view = await loaded();
  expect(view.getByRole('alert')).toBeTruthy(); expect(view.queryByText('No devices yet')).toBeNull();
  await act(async () => fireEvent.press(view.getByText('inbox.retry')));
  expect(view.getByText('Fern board')).toBeTruthy(); expect(view.queryByRole('alert')).toBeNull();
});

it('adds a logical device without pairing or overwriting runtime defaults', async () => {
  jest.mocked(api.createReadingDevice).mockResolvedValueOnce({ ...device, device_name: 'New board' });
  const view = await loaded();
  await act(async () => fireEvent.press(view.getByText('Add device')));
  fireEvent.press(view.getByText('readingsModals.upsert.selectPlant'));
  fireEvent.press(view.getByText('Fern'));
  fireEvent.changeText(view.getByPlaceholderText('readingsModals.upsert.deviceNameRequired'), 'New board');
  list.mockResolvedValueOnce([{ ...device, device_name: 'New board' }]);
  await act(async () => fireEvent.press(view.getByText('readingsModals.common.save')));
  expect(api.createReadingDevice).toHaveBeenCalledWith(expect.objectContaining({ plant: 21, device_name: 'New board' }));
  expect(jest.mocked(api.createReadingDevice).mock.calls[0][0]).not.toHaveProperty('interval_minutes');
  expect(mockNav.navigate).not.toHaveBeenCalled();
  expect(view.getByText('New board')).toBeTruthy(); expect(view.getByTestId('toast').props.children).toBe('Device added');
});

it('edits an existing device, preserves minute and pump settings, and reloads server data', async () => {
  jest.mocked(api.updateReadingDevice).mockResolvedValueOnce({ ...device, device_name: 'Updated board' });
  const view = await loaded(); menu(view);
  await act(async () => fireEvent.press(view.getByText('readings.menu.editDevice')));
  fireEvent.changeText(view.getByDisplayValue('Fern board'), 'Updated board');
  list.mockResolvedValueOnce([{ ...device, device_name: 'Updated board' }]);
  await act(async () => fireEvent.press(view.getByText('readingsModals.common.save')));
  expect(api.updateReadingDevice).toHaveBeenCalledWith(11, expect.objectContaining({ device_name: 'Updated board' }));
  expect(jest.mocked(api.updateReadingDevice).mock.calls[0][1]).not.toHaveProperty('interval_minutes');
  expect(jest.mocked(api.updateReadingDevice).mock.calls[0][1]).not.toHaveProperty('pump_duration_seconds');
  expect(jest.mocked(api.updateReadingDevice).mock.calls[0][1]).not.toHaveProperty('pump_cooldown_minutes');
  expect(view.getByText('Updated board')).toBeTruthy(); expect(view.getByTestId('toast').props.children).toBe('Device updated');
});

it('reports permission failure on device update without displaying the unsaved name', async () => {
  jest.mocked(api.updateReadingDevice).mockRejectedValueOnce(new ApiError(404, {}));
  const view = await loaded(); menu(view);
  await act(async () => fireEvent.press(view.getByText('readings.menu.editDevice')));
  fireEvent.changeText(view.getByDisplayValue('Fern board'), 'Denied edit');
  await act(async () => fireEvent.press(view.getByText('readingsModals.common.save')));
  expect(view.queryByText('Denied edit')).toBeNull(); expect(view.getByText('Fern board')).toBeTruthy();
  expect(view.getByTestId('toast').props.children).toBe('Update failed');
});

it('does not remove a device when deletion is canceled or denied; removes it after accepted retry', async () => {
  jest.mocked(api.deleteReadingDevice).mockRejectedValueOnce(new ApiError(404, {})).mockResolvedValueOnce(undefined);
  const view = await loaded(); menu(view); fireEvent.press(view.getByText('readings.menu.deleteDevice'));
  fireEvent.press(view.getByText('readingsModals.common.cancel'));
  expect(api.deleteReadingDevice).not.toHaveBeenCalled();
  menu(view); fireEvent.press(view.getByText('readings.menu.deleteDevice'));
  await act(async () => fireEvent.press(view.getByText('readingsModals.common.delete')));
  expect(view.getByText('Fern board')).toBeTruthy(); expect(view.getByTestId('toast').props.children).toBe('Delete failed');
  menu(view); fireEvent.press(view.getByText('readings.menu.deleteDevice'));
  await act(async () => fireEvent.press(view.getByText('readingsModals.common.delete')));
  expect(api.deleteReadingDevice).toHaveBeenLastCalledWith(11);
  expect(view.queryByText('Fern board')).toBeNull(); expect(view.getByText('No devices yet')).toBeTruthy();
});

it('rolls back an optimistic pump toggle after permission failure and reports the failure', async () => {
  const pending = deferred<any>(); jest.mocked(api.toggleAutoPump).mockReturnValueOnce(pending.promise);
  const view = await loaded();
  fireEvent(view.UNSAFE_getByType(Switch), 'valueChange', true);
  expect(view.UNSAFE_getByType(Switch).props.value).toBe(true);
  await act(async () => pending.reject(new ApiError(403, {})));
  expect(view.UNSAFE_getByType(Switch).props.value).toBe(false);
  expect(view.getByTestId('toast').props.children).toBe('Failed to update automatic pump setting');
});

it('shared devices allow navigation but hide owner mutation controls and secrets', async () => {
  list.mockResolvedValueOnce([{ ...device, access: sharedAccess }]);
  const view = await loaded(); menu(view);
  expect(view.queryByText('readings.menu.editDevice')).toBeNull();
  expect(view.queryByText('readings.menu.deviceDetails')).toBeNull();
  expect(view.queryByText('readings.menu.deleteDevice')).toBeNull();
  expect(view.UNSAFE_queryByType(Switch)).toBeNull();
  fireEvent.press(view.getByText('readings.menu.plantDetails'));
  expect(mockNav.navigate).toHaveBeenCalledWith('PlantDetails', { id: '21' });
  menu(view); fireEvent.press(view.getByText('readings.menu.history'));
  expect(mockNav.navigate).toHaveBeenCalledWith('ReadingsHistory', { id: '11' });
});

it.each(['resolve', 'reject'] as const)('ignores stale list requests that later %s', async outcome => {
  const view = await loaded(); const old = deferred<any[]>(); const latest = deferred<any[]>();
  list.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise);
  act(() => refresh(view)); act(() => refresh(view));
  await act(async () => latest.resolve([{ ...device, device_name: 'Latest board' }]));
  await act(async () => outcome === 'resolve' ? old.resolve([{ ...device, device_name: 'Stale board' }]) : old.reject(new Error('Stale error')));
  expect(view.getByText('Latest board')).toBeTruthy(); expect(view.queryByText('Stale board')).toBeNull(); expect(view.queryByRole('alert')).toBeNull();
});

it('does not publish a previous visit response after blur and return', async () => {
  const old = deferred<any[]>(); list.mockReturnValueOnce(old.promise).mockResolvedValueOnce([{ ...device, device_name: 'Return visit' }]);
  const view = render(<Screen />);
  mockFocused = false; view.rerender(<Screen />); mockFocused = true; view.rerender(<Screen />);
  await act(async () => {}); await act(async () => old.resolve([{ ...device, device_name: 'Previous visit' }]));
  expect(view.getByText('Return visit')).toBeTruthy(); expect(view.queryByText('Previous visit')).toBeNull();
});


it('loads Device Setup before showing controls and fetches secrets only on explicit DIY expansion', async () => {
  const pending = deferred<any>(); jest.mocked(api.getReadingDevice).mockReturnValueOnce(pending.promise);
  const view = await loaded(); menu(view);
  await act(async () => fireEvent.press(view.getByText('readings.menu.deviceDetails')));
  expect(view.getByTestId('device-setup-loading')).toBeTruthy();
  expect(view.queryByTestId('reading-interval-minutes')).toBeNull();
  expect(api.fetchDeviceSetup).not.toHaveBeenCalled();
  await act(async () => pending.resolve(device));
  expect(view.getByTestId('reading-interval-minutes').props.value).toBe('60');
  await act(async () => fireEvent.press(view.getByText('readingsModals.configuration.advanced')));
  expect(api.fetchDeviceSetup).toHaveBeenCalledTimes(1);
});

it('saves runtime settings with the existing PATCH API without touching other device fields', async () => {
  jest.mocked(api.updateReadingDevice).mockResolvedValueOnce({ ...device, interval_minutes: 80 });
  const view = await loaded(); menu(view);
  await act(async () => fireEvent.press(view.getByText('readings.menu.deviceDetails')));
  fireEvent.changeText(view.getByTestId('reading-interval-minutes'), '80');
  await act(async () => fireEvent.press(view.getByText('readingsModals.configuration.saveConfiguration')));
  expect(api.updateReadingDevice).toHaveBeenCalledWith(11, { interval_minutes: 80,
    pump_duration_seconds: 20, pump_cooldown_minutes: 60, automatic_pump_launch: false, pump_threshold_pct: null });
  expect(view.getByText('readingsModals.configuration.legacySaved')).toBeTruthy();
  expect(view.queryByText('readingsModals.configuration.applied')).toBeNull();
});

it('ignores Device Setup responses after the user closes its loading modal', async () => {
  const pending = deferred<any>(); jest.mocked(api.getReadingDevice).mockReturnValueOnce(pending.promise);
  const view = await loaded(); menu(view);
  await act(async () => fireEvent.press(view.getByText('readings.menu.deviceDetails')));
  fireEvent.press(view.getByTestId('modal-dismiss'));
  await act(async () => pending.resolve(device));
  expect(view.queryByTestId('device-details-title')).toBeNull();
  expect(view.queryByTestId('reading-interval-minutes')).toBeNull();
});

it('handles an owner permission failure without rendering configuration or secrets', async () => {
  jest.mocked(api.getReadingDevice).mockRejectedValueOnce(new ApiError(404, {}));
  const view = await loaded(); menu(view);
  await act(async () => fireEvent.press(view.getByText('readings.menu.deviceDetails')));
  expect(view.getByTestId('toast').props.children).toBe('Failed to load device setup');
  expect(view.queryByTestId('reading-interval-minutes')).toBeNull();
  expect(api.fetchDeviceSetup).not.toHaveBeenCalled();
});
