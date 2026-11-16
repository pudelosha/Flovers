import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import ScannerScreen from '../ScannerScreen';

const mockRequestPermission = jest.fn(async () => false);
const mockNavigation = { navigate: jest.fn() };
jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  useCameraDevice: () => undefined,
  useCameraPermission: () => ({ hasPermission: false, requestPermission: mockRequestPermission }),
  useCodeScanner: () => ({}),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useIsFocused: () => true,
  useFocusEffect: (callback: () => (() => void) | void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../../../shared/ui/GlassHeader', () => () => null);

it('opens system settings when camera access has been denied', () => {
  const settings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  const view = render(<ScannerScreen />);
  fireEvent.press(view.getByText('Open Settings'));
  expect(settings).toHaveBeenCalledTimes(1);
  settings.mockRestore();
});
