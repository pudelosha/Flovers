import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsProvider, useSettings } from '../SettingsProvider';
import { fetchProfileSettings } from '../../../api/services/profile.service';
import { DEFAULT_SETTINGS } from '../../settings/settings.defaults';

jest.unmock('../SettingsProvider');
let mockAuth: any;
let mockLanguage = 'en';
const mockListeners = new Set<(language: string) => void>();
const mockChangeLanguage = jest.fn(async (language: string) => {
  mockLanguage = language;
  mockListeners.forEach(listener => listener(language));
  return true;
});
jest.mock('../useAuth', () => ({ useAuth: () => mockAuth }));
jest.mock('../LanguageProvider', () => ({
  useLanguage: () => ({ changeLanguage: mockChangeLanguage }),
}));
jest.mock('../../../i18n', () => ({
  __esModule: true,
  default: {
    get language() {
      return mockLanguage;
    },
    on: (_: string, listener: (language: string) => void) =>
      mockListeners.add(listener),
    off: (_: string, listener: (language: string) => void) =>
      mockListeners.delete(listener),
  },
}));
jest.mock('../../../api/services/profile.service', () => ({
  fetchProfileSettings: jest.fn(),
}));

let settings: ReturnType<typeof useSettings>;
function Probe() {
  settings = useSettings();
  return <Text>{String(settings.hydrated)}</Text>;
}
const api = {
  language: 'en',
  date_format: 'DD.MM.YYYY',
  temperature_unit: 'C',
  measure_unit: 'metric',
  tile_transparency: 0.12,
  tile_motive: 'light',
  background: 'bg5',
  fab_position: 'right',
  theme: 'light',
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}
const screen = () => (
  <SettingsProvider>
    <Probe />
  </SettingsProvider>
);
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockLanguage = 'en';
  mockListeners.clear();
  mockAuth = { loading: false, token: 'session-a', user: { id: 'a' } };
  (fetchProfileSettings as jest.Mock).mockReset().mockResolvedValue(api);
});

it('preserves a cached light theme during auth restoration and reveals it before a slow API response', async () => {
  const cached = { ...DEFAULT_SETTINGS, theme: 'light', language: 'pl' };
  await AsyncStorage.setItem('app:settings:v1', JSON.stringify(cached));
  mockAuth = { loading: true, token: null, user: null };
  const response = deferred<any>();
  (fetchProfileSettings as jest.Mock).mockReturnValue(response.promise);
  const view = render(screen());
  await act(async () => {
    await Promise.resolve();
  });
  expect(settings.hydrated).toBe(false);
  expect(fetchProfileSettings).not.toHaveBeenCalled();
  expect(
    JSON.parse((await AsyncStorage.getItem('app:settings:v1'))!).theme,
  ).toBe('light');

  mockAuth = { loading: false, token: 'session-a', user: { id: 'a' } };
  view.rerender(screen());
  await waitFor(() => expect(settings.hydrated).toBe(true));
  expect(settings.settings.theme).toBe('light');
  expect(settings.settings.language).toBe('pl');
  expect(mockLanguage).toBe('pl');
  expect(settings.loading).toBe(true);
  await waitFor(() =>
    expect(fetchProfileSettings).toHaveBeenCalledWith({
      auth: true,
      timeoutMs: 8000,
    }),
  );
  expect(await AsyncStorage.getItem('app:settings:v1:a')).not.toBeNull();
  expect(await AsyncStorage.getItem('app:settings:v1')).toBeNull();
  await act(async () => response.resolve({ ...api, language: 'pl' }));
  expect(settings.loading).toBe(false);
});

it('waits for server appearance on a first login without cached settings', async () => {
  const response = deferred<any>();
  (fetchProfileSettings as jest.Mock).mockReturnValue(response.promise);
  render(screen());
  await waitFor(() => expect(fetchProfileSettings).toHaveBeenCalled());
  expect(settings.hydrated).toBe(false);
  await act(async () => response.resolve(api));
  expect(settings.hydrated).toBe(true);
  expect(settings.settings.theme).toBe('light');
});

it('leaves the launch gate after an offline first login, without persisting fallback defaults', async () => {
  (fetchProfileSettings as jest.Mock).mockRejectedValue(new Error('offline'));
  render(screen());
  await waitFor(() => expect(settings.hydrated).toBe(true));
  expect(settings.loading).toBe(false);
  expect(settings.error).toBeTruthy();
  expect(settings.settings.theme).toBe('dark');
  expect(await AsyncStorage.getItem('app:settings:v1:a')).toBeNull();
});

it('keeps the local theme if the user changes it while startup settings refresh', async () => {
  await AsyncStorage.setItem(
    'app:settings:v1:a',
    JSON.stringify({ ...DEFAULT_SETTINGS, theme: 'light' }),
  );
  const response = deferred<any>();
  (fetchProfileSettings as jest.Mock).mockReturnValue(response.promise);
  render(screen());
  await waitFor(() => expect(settings.hydrated).toBe(true));
  act(() => settings.updateLocalSettings({ theme: 'dark' }));
  await act(async () => response.resolve(api));
  expect(settings.loading).toBe(false);
  expect(settings.settings.theme).toBe('dark');
});

it('does not let a previous account response change the current account or its cache', async () => {
  const first = deferred<any>();
  const second = deferred<any>();
  (fetchProfileSettings as jest.Mock)
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const view = render(screen());
  await waitFor(() => expect(fetchProfileSettings).toHaveBeenCalledTimes(1));
  mockAuth = { loading: false, token: 'session-b', user: { id: 'b' } };
  view.rerender(screen());
  expect(settings.hydrated).toBe(false);
  await waitFor(() => expect(fetchProfileSettings).toHaveBeenCalledTimes(2));
  await act(async () => second.resolve({ ...api, theme: 'dark' }));
  await act(async () => first.resolve(api));
  expect(settings.settings.theme).toBe('dark');
  expect(settings.hydrated).toBe(true);
  expect(
    JSON.parse((await AsyncStorage.getItem('app:settings:v1:b'))!).theme,
  ).toBe('dark');
});

it('retains the saved appearance after logout and ignores a late response', async () => {
  await AsyncStorage.setItem(
    'app:settings:v1:a',
    JSON.stringify({ ...DEFAULT_SETTINGS, theme: 'light' }),
  );
  const response = deferred<any>();
  (fetchProfileSettings as jest.Mock).mockReturnValue(response.promise);
  const view = render(screen());
  await waitFor(() => expect(settings.hydrated).toBe(true));
  mockAuth = { loading: false, token: null, user: null };
  view.rerender(screen());
  await waitFor(() => expect(settings.hydrated).toBe(true));
  await act(async () => response.resolve(api));
  expect(settings.settings.theme).toBe('dark');
  expect(
    JSON.parse((await AsyncStorage.getItem('app:settings:v1:a'))!).theme,
  ).toBe('light');
});

it('does not restart settings bootstrap when the same user object is refreshed', async () => {
  const response = deferred<any>();
  (fetchProfileSettings as jest.Mock).mockReturnValue(response.promise);
  const view = render(screen());
  await waitFor(() => expect(fetchProfileSettings).toHaveBeenCalledTimes(1));
  mockAuth = {
    ...mockAuth,
    token: 'refreshed-access',
    user: { id: 'a', first_name: 'Anna' },
  };
  view.rerender(screen());
  expect(fetchProfileSettings).toHaveBeenCalledTimes(1);
  await act(async () => response.resolve(api));
});

it('applies a background language update without treating its event as a newer local edit', async () => {
  await AsyncStorage.setItem(
    'app:settings:v1:a',
    JSON.stringify(DEFAULT_SETTINGS),
  );
  const response = deferred<any>();
  (fetchProfileSettings as jest.Mock).mockReturnValue(response.promise);
  render(screen());
  await waitFor(() => expect(settings.hydrated).toBe(true));
  await act(async () => response.resolve({ ...api, language: 'pl' }));
  expect(settings.settings.language).toBe('pl');
  expect(settings.settings.theme).toBe('light');
  expect(settings.loading).toBe(false);
});

it('waits for cached translations before publishing the saved appearance', async () => {
  await AsyncStorage.setItem(
    'app:settings:v1:a',
    JSON.stringify({
      ...DEFAULT_SETTINGS,
      theme: 'light',
      language: 'pl',
    }),
  );
  const language = deferred<boolean>();
  const response = deferred<any>();
  mockChangeLanguage.mockImplementationOnce(() => language.promise);
  (fetchProfileSettings as jest.Mock).mockReturnValue(response.promise);
  render(screen());
  await waitFor(() => expect(mockChangeLanguage).toHaveBeenCalledWith('pl'));
  expect(settings.hydrated).toBe(false);
  await act(async () => {
    mockLanguage = 'pl';
    language.resolve(true);
  });
  await waitFor(() => expect(settings.hydrated).toBe(true));
  expect(settings.settings.theme).toBe('light');
  await act(async () => response.resolve({ ...api, language: 'pl' }));
});

it('rejects an old account settings-save callback after switching accounts', async () => {
  const view = render(screen());
  await waitFor(() => expect(settings.loading).toBe(false));
  const oldSave = settings.applyServerSettings;
  (fetchProfileSettings as jest.Mock).mockResolvedValue({
    ...api,
    theme: 'dark',
  });
  mockAuth = { loading: false, token: 'session-b', user: { id: 'b' } };
  view.rerender(screen());
  await waitFor(() => expect(settings.loading).toBe(false));
  act(() => oldSave(api as any));
  expect(settings.settings.theme).toBe('dark');
});

it('does not reuse an account cache when a legacy session has no stable user identity', async () => {
  await AsyncStorage.setItem(
    'app:settings:v1',
    JSON.stringify({ ...DEFAULT_SETTINGS, theme: 'light' }),
  );
  mockAuth = { loading: false, token: 'legacy-session', user: null };
  const response = deferred<any>();
  (fetchProfileSettings as jest.Mock).mockReturnValue(response.promise);
  render(screen());
  await waitFor(() => expect(fetchProfileSettings).toHaveBeenCalled());
  expect(settings.hydrated).toBe(false);
  await act(async () => response.resolve(api));
  expect(settings.hydrated).toBe(true);
  expect(
    await AsyncStorage.getItem('app:settings:v1:authenticated'),
  ).toBeNull();
});
