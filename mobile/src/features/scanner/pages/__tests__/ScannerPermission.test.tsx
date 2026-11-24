import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import ScannerScreen from '../ScannerScreen';

const mockRequestPermission = jest.fn(async () => false);
const mockNavigation = { navigate: jest.fn() };
const mockRoute = { params: undefined as { deviceOnly?: boolean; deviceId?: number } | undefined };
let mockScan: (codes: { value: string }[]) => void;
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => {
      const resource = require('../../../../i18n/locales/en/scanner.json');
      return key.split('.').reduce((value: any, part: string) => value?.[part], resource)
        ?? options?.defaultValue ?? key;
    },
  }),
}));
jest.mock('../../../readings/components/modals/PairDeviceModal', () => ({
  __esModule: true, default: ({ qr }: any) => require('react').createElement(require('react-native').Text, null, qr.hardware_id),
}));
jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  useCameraDevice: () => undefined,
  useCameraPermission: () => ({ hasPermission: false, requestPermission: mockRequestPermission }),
  useCodeScanner: ({ onCodeScanned }: any) => { mockScan = onCodeScanned; return {}; },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
  useIsFocused: () => true,
  useFocusEffect: (callback: () => (() => void) | void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../../../shared/ui/GlassHeader', () => () => null);
beforeEach(() => { jest.clearAllMocks(); mockRoute.params = undefined; });

it('opens system settings when camera access has been denied', () => {
  const settings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  const view = render(<ScannerScreen />);
  fireEvent.press(view.getByText('Open Settings'));
  expect(settings).toHaveBeenCalledTimes(1);
  settings.mockRestore();
});
it('explains both QR types with the current plant menu path in a scrollable screen', () => {
  const view = render(<ScannerScreen />);
  expect(view.getByText('Plant QR codes')).toBeOnTheScreen();
  expect(view.getByText('Device QR codes')).toBeOnTheScreen();
  expect(view.getByText(/Find it in Plant details/)).toHaveTextContent(/Plants.*tile menu.*Show QR code/);
  expect(view.queryByText(/Or open Readings/)).toBeNull();
  expect(view.getByTestId('scanner-content')).toBeTruthy();
});
it('shows the same dual-purpose instructions when opened for pairing', () => {
  mockRoute.params = { deviceOnly: true, deviceId: 12 };
  const view = render(<ScannerScreen />);
  expect(view.getByText('Device QR codes')).toBeOnTheScreen();
  expect(view.getByText('Plant QR codes')).toBeOnTheScreen();
  expect(view.getByText('Scan a Flovers QR code to open a plant or set up a device.')).toBeOnTheScreen();
});
it('preserves plant QR navigation in universal scanner mode', () => {
  render(<ScannerScreen />);
  act(() => mockScan([{ value: 'PLANT_123' }]));
  expect(mockNavigation.navigate).toHaveBeenCalledWith('PlantDetails', { qrCode: 'PLANT_123' });
});
it('keeps device-only scanning in the pairing flow and rejects plant QRs', () => {
  mockRoute.params = { deviceOnly: true, deviceId: 12 };
  const view = render(<ScannerScreen />);
  act(() => mockScan([{ value: 'PLANT_123' }]));
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
  expect(view.getByRole('alert')).toBeTruthy();
});
it('opens device pairing without rendering or navigating with the PoP', () => {
  const qr = { version: 1, type: 'flovers-device', hardware_id: 'FACTORY_TEST_0001',
    name: 'FLOVERS_EST_0001', transport: 'ble', pop: 'P'.repeat(43) };
  const view = render(<ScannerScreen />);
  act(() => mockScan([{ value: JSON.stringify(qr) }]));
  expect(view.getByText(qr.hardware_id)).toBeTruthy();
  expect(view.queryByText(qr.pop)).toBeNull();
  expect(JSON.stringify(view.toJSON())).not.toContain(qr.pop);
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
});
