import React from 'react';
import { ImageBackground } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import RootNavigator from '../RootNavigator';
import CenteredSpinner from '../../../shared/ui/CenteredSpinner';
import { AppStartupProvider } from '../../providers/AppStartupProvider';
import { LIGHT_COLORS, DARK_COLORS } from '../../../shared/theme/palette';

let mockAuth: any;
let mockSettings: any;
let mockLight: boolean;
const mockFlushNavigation = jest.fn();
jest.mock('../../../shared/theme/native', () =>
  jest.requireActual('react-native'),
);
jest.mock('../../providers/useAuth', () => ({ useAuth: () => mockAuth }));
jest.mock('../../providers/SettingsProvider', () => ({
  useSettings: () => mockSettings,
}));
jest.mock('../../../shared/theme/ThemeContext', () => ({
  useAppTheme: () => ({
    isLight: mockLight,
    colors: mockLight
      ? require('../../../shared/theme/palette').LIGHT_COLORS
      : require('../../../shared/theme/palette').DARK_COLORS,
  }),
}));
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children, onReady }: any) => {
    const NativeView = require('react-native').View;
    return (
      <NativeView testID="startup-navigation" onReady={onReady}>
        {children}
      </NativeView>
    );
  },
}));
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: any) => {
      const React = require('react');
      return React.Children.toArray(children)[0];
    },
    Screen: ({ component: Component }: any) => <Component />,
  }),
}));
jest.mock('../navigationRef', () => ({
  navigationRef: {},
  flushPendingNavigation: () => mockFlushNavigation(),
}));
jest.mock('../AppTabs', () => ({
  __esModule: true,
  default: (props: any) => {
    const NativeView = require('react-native').View;
    return <NativeView testID="startup-app-shell" {...props} />;
  },
}));
jest.mock('../../../shared/theme/SystemBars', () => () => null);
jest.mock('../LogoutToast', () => () => null);
jest.mock('../../../api/services/push.service', () => ({
  startPushNotifications: jest.fn(async () => {}),
  stopPushNotifications: jest.fn(),
}));
jest.mock(
  '../../../features/auth/components/AuthCard',
  () =>
    ({ children }: any) =>
      children,
);
jest.mock('../../../features/auth/pages/LoginScreen', () => () => {
  const React = require('react');
  const { Text, TextInput, View } = require('react-native');
  const [value, setValue] = React.useState('');
  return (
    <View>
      <Text>Login shell</Text>
      <TextInput testID="login-email" value={value} onChangeText={setValue} />
    </View>
  );
});
jest.mock('../../../features/auth/pages/RegisterScreen', () => () => null);
jest.mock(
  '../../../features/auth/pages/ForgotPasswordScreen',
  () => () => null,
);
jest.mock(
  '../../../features/auth/pages/ResendActivationScreen',
  () => () => null,
);
jest.mock('../../../features/auth/pages/ConfirmEmailScreen', () => () => null);
jest.mock('../../../features/auth/pages/ResetPasswordScreen', () => () => null);
jest.mock(
  '../../../features/auth/pages/RegisterSuccessScreen',
  () => () => null,
);

let frames: FrameRequestCallback[];
beforeEach(() => {
  mockAuth = { loading: false, token: 'session' };
  mockSettings = { hydrated: true, loading: true };
  mockLight = true;
  frames = [];
  mockFlushNavigation.mockClear();
  jest
    .spyOn(globalThis, 'requestAnimationFrame')
    .mockImplementation(callback => {
      frames.push(callback);
      return frames.length;
    });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const screen = () => (
  <AppStartupProvider>
    <RootNavigator />
  </AppStartupProvider>
);

it('keeps the logo until saved appearance, navigation, header and background are ready', () => {
  mockAuth.loading = true;
  mockAuth.token = null;
  mockSettings.hydrated = false;
  const view = render(screen());
  const logo = view.getByTestId('app-launch-logo');
  expect(view.getByTestId('app-launch-screen')).toBeVisible();
  expect(view.queryByTestId('startup-app-shell')).toBeNull();
  expect(view.queryByTestId('startup-navigation')).toBeNull();
  expect(view.queryByText('Login shell')).toBeNull();
  mockAuth.loading = false;
  mockAuth.token = 'restored-session';
  view.rerender(screen());
  expect(view.getByTestId('app-launch-logo')).toBe(logo);
  expect(view.getByTestId('app-launch-screen')).toBeVisible();
  expect(view.queryByTestId('startup-app-shell')).toBeNull();
  expect(view.queryByTestId('startup-navigation')).toBeNull();

  mockSettings.hydrated = true;
  view.rerender(screen());
  expect(view.getByTestId('app-launch-logo')).toBe(logo);
  const shell = view.getByTestId('startup-app-shell');
  expect(shell.props.transitionReady).toBe(false);
  expect(
    view.UNSAFE_getByType(ImageBackground).props.style.backgroundColor,
  ).toBe(LIGHT_COLORS.background);
  fireEvent(view.getByTestId('startup-navigation'), 'ready');
  fireEvent(shell, 'prepared');
  expect(frames).toHaveLength(0);
  fireEvent(view.UNSAFE_getByType(ImageBackground), 'loadEnd');
  expect(view.getByTestId('app-launch-screen')).toBeVisible();
  act(() => frames.splice(0).forEach(frame => frame(0)));
  expect(view.queryByTestId('app-launch-screen')).toBeNull();
  expect(view.getByTestId('startup-app-shell')).toBe(shell);
  expect(shell.props.transitionReady).toBe(true);
  expect(mockFlushNavigation).toHaveBeenCalledTimes(1);

  // A slow settings refresh must neither remount nor hide the prepared shell.
  expect(mockSettings.loading).toBe(true);
  view.rerender(screen());
  expect(view.getByTestId('startup-app-shell')).toBe(shell);
  expect(view.queryByTestId('app-launch-screen')).toBeNull();
});

it('uses the saved dark appearance from the first background frame', () => {
  mockLight = false;
  const view = render(screen());
  expect(
    view.UNSAFE_getByType(ImageBackground).props.style.backgroundColor,
  ).toBe(DARK_COLORS.background);
  fireEvent(view.getByTestId('startup-navigation'), 'ready');
  fireEvent(view.UNSAFE_getByType(ImageBackground), 'loadEnd');
  expect(view.getByTestId('app-launch-screen')).toBeVisible();
  fireEvent(view.getByTestId('startup-app-shell'), 'prepared');
  act(() => frames.splice(0).forEach(frame => frame(0)));
  expect(view.queryByTestId('app-launch-screen')).toBeNull();
});

it('reveals the guest login shell without waiting for an authenticated header', () => {
  mockAuth.token = null;
  mockLight = false;
  const view = render(screen());
  expect(view.getByText('Login shell')).toBeTruthy();
  fireEvent(view.getByTestId('startup-navigation'), 'ready');
  fireEvent(view.UNSAFE_getByType(ImageBackground), 'loadEnd');
  act(() => frames.splice(0).forEach(frame => frame(0)));
  expect(view.queryByTestId('app-launch-screen')).toBeNull();
});

it('keeps the logo dismissed while login waits for account settings', () => {
  mockAuth.token = null;
  mockLight = false;
  const view = render(screen());
  fireEvent(view.getByTestId('startup-navigation'), 'ready');
  fireEvent(view.UNSAFE_getByType(ImageBackground), 'loadEnd');
  act(() => frames.splice(0).forEach(frame => frame(0)));
  const navigation = view.getByTestId('startup-navigation');
  expect(view.queryByTestId('app-launch-screen')).toBeNull();

  mockAuth.token = 'signed-in';
  mockSettings.hydrated = false;
  view.rerender(screen());
  expect(view.queryByTestId('app-launch-screen')).toBeNull();
  expect(view.UNSAFE_getAllByType(CenteredSpinner)).toHaveLength(1);
  expect(view.getByTestId('startup-navigation')).toBe(navigation);
  mockSettings.hydrated = true;
  view.rerender(screen());
  expect(view.queryByTestId('app-launch-screen')).toBeNull();
  expect(view.getByTestId('startup-app-shell').props.transitionReady).toBe(
    true,
  );
  expect(view.getByTestId('startup-navigation')).toBe(navigation);
});

it('goes directly from the app to Login on logout before guest settings settle', () => {
  const view = render(screen());
  fireEvent(view.getByTestId('startup-navigation'), 'ready');
  fireEvent(view.UNSAFE_getByType(ImageBackground), 'loadEnd');
  fireEvent(view.getByTestId('startup-app-shell'), 'prepared');
  act(() => frames.splice(0).forEach(frame => frame(0)));
  const navigation = view.getByTestId('startup-navigation');
  mockAuth.token = null;
  mockSettings.hydrated = false;
  mockLight = false;
  view.rerender(screen());
  expect(view.queryByTestId('app-launch-screen')).toBeNull();
  expect(view.queryByTestId('startup-app-shell')).toBeNull();
  expect(view.getByText('Login shell')).toBeVisible();
  expect(view.UNSAFE_queryByType(CenteredSpinner)).toBeNull();
  expect(view.getByTestId('startup-navigation')).toBe(navigation);
  mockSettings.hydrated = true;
  view.rerender(screen());
  expect(view.queryByTestId('app-launch-screen')).toBeNull();
  expect(view.getByText('Login shell')).toBeVisible();
});

it('preserves the Login form when startup or settings state rerenders the root', () => {
  mockAuth.token = null;
  mockLight = false;
  const view = render(screen());
  fireEvent(view.getByTestId('startup-navigation'), 'ready');
  fireEvent(view.UNSAFE_getByType(ImageBackground), 'loadEnd');
  act(() => frames.splice(0).forEach(frame => frame(0)));
  const input = view.getByTestId('login-email');
  fireEvent.changeText(input, 'test@example.com');
  mockSettings = { ...mockSettings, loading: false };
  view.rerender(screen());
  expect(view.getByTestId('login-email')).toBe(input);
  expect(input.props.value).toBe('test@example.com');
});
