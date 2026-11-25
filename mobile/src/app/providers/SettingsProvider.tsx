import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';
import {
  fetchProfileSettings,
  type ApiProfileSettings,
} from '../../api/services/profile.service';
import { DEFAULT_SETTINGS } from '../settings/settings.defaults';
import { normalizeTheme } from '../settings/themes';
import type { AppSettings } from '../settings/settings.types';
import i18n from '../../i18n';
import { useLanguage } from './LanguageProvider';

const LEGACY_SETTINGS_KEY = 'app:settings:v1';
const storageKey = (account: string) => `${LEGACY_SETTINGS_KEY}:${account}`;

type SettingsContextValue = {
  settings: AppSettings;
  /** Initial server synchronization, also used by the Profile form. */
  loading: boolean;
  /** Saved appearance/language are usable while a server refresh is pending. */
  hydrated: boolean;
  error: string | null;
  applyServerSettings: (api: ApiProfileSettings) => void;
  updateLocalSettings: (partial: Partial<AppSettings>) => void;
  reloadFromServer: () => Promise<void>;
};
const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

function normalizeTileTransparency(value: unknown): number {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? parseFloat(value)
      : NaN;
  return Number.isFinite(number)
    ? Math.max(0, Math.min(0.6, number))
    : DEFAULT_SETTINGS.tileTransparency;
}
function normalizeSettings(cached: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...cached,
    theme: normalizeTheme(cached.theme),
    background: 'bg5',
    tileTransparency: normalizeTileTransparency(cached.tileTransparency),
  };
}
function mapApiToAppSettings(
  api: ApiProfileSettings,
  fallback: AppSettings,
): AppSettings {
  return normalizeSettings({
    language: api.language,
    dateFormat: api.date_format,
    temperatureUnit: api.temperature_unit,
    measureUnit: api.measure_unit,
    tileTransparency: api.tile_transparency,
    tileMotive: api.tile_motive,
    theme: api.theme ?? fallback.theme,
    fabPosition: api.fab_position,
  });
}
async function persistSettings(
  account: string,
  settings: AppSettings,
): Promise<boolean> {
  if (account === 'authenticated') return false; // No stable account identity to scope a cache.
  try {
    await AsyncStorage.setItem(storageKey(account), JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
async function loadSettingsFromStorage(account: string, allowLegacy: boolean) {
  if (account === 'authenticated') return null;
  try {
    let raw = await AsyncStorage.getItem(storageKey(account));
    const legacy = !raw && allowLegacy;
    if (legacy) raw = await AsyncStorage.getItem(LEGACY_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return null;
    return { settings: normalizeSettings(parsed), legacy };
  } catch {
    return null;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, token, loading: authLoading } = useAuth();
  const account = user
    ? String(user.id ?? user.email ?? 'authenticated')
    : token
    ? 'authenticated'
    : 'guest';
  const accountRef = useRef(account);
  accountRef.current = account;
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  const [hydratedAccount, setHydratedAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const invalidateRequests = useCallback(() => {
    ++requestRef.current;
  }, []);
  const editRevision = useRef(0);
  const guestSeen = useRef(false);
  const languageSync = useRef(false);
  const { changeLanguage: changeAppLanguage } = useLanguage();

  const syncLanguage = useCallback(
    async (language: AppSettings['language']) => {
      if (language === i18n.language?.split('-')[0]) return;
      languageSync.current = true;
      try {
        await changeAppLanguage(language);
      } finally {
        languageSync.current = false;
      }
    },
    [changeAppLanguage],
  );

  const publish = useCallback(
    (owner: string, next: AppSettings, persist = true) => {
      if (accountRef.current !== owner) return;
      settingsRef.current = next;
      setSettings(next);
      if (persist) void persistSettings(owner, next);
    },
    [],
  );
  const applyServerSettings = useCallback(
    (api: ApiProfileSettings) => {
      if (accountRef.current !== account || authLoading) return;
      ++editRevision.current;
      publish(account, mapApiToAppSettings(api, settingsRef.current));
    },
    [account, authLoading, publish],
  );
  const updateLocalSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      if (accountRef.current !== account || authLoading) return;
      ++editRevision.current;
      publish(
        account,
        normalizeSettings({ ...settingsRef.current, ...partial }),
      );
    },
    [account, authLoading, publish],
  );

  const reloadFromServer = useCallback(async () => {
    const owner = account;
    if (owner === 'guest' || authLoading || accountRef.current !== owner)
      return;
    const request = ++requestRef.current;
    const revision = editRevision.current;
    const current = () =>
      accountRef.current === owner && requestRef.current === request;
    setLoading(true);
    setError(null);
    try {
      const api = await fetchProfileSettings({ auth: true, timeoutMs: 8000 });
      if (!current() || editRevision.current !== revision) return;
      const next = mapApiToAppSettings(api, settingsRef.current);
      await syncLanguage(next.language);
      if (!current() || editRevision.current !== revision) return;
      publish(owner, next);
      setHydratedAccount(owner);
    } catch {
      if (current()) setError('Failed to reload settings.');
    } finally {
      if (current()) setLoading(false);
    }
  }, [account, authLoading, syncLanguage, publish]);

  useEffect(() => {
    const handleLanguageChanged = (language: string) => {
      if (
        authLoading ||
        languageSync.current ||
        hydratedAccount !== accountRef.current
      )
        return;
      if (settingsRef.current.language === language) return;
      updateLocalSettings({ language: language as AppSettings['language'] });
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [authLoading, hydratedAccount, updateLocalSettings]);

  useEffect(() => {
    // An unresolved session is not a logout. Never overwrite preferences while
    // authentication is still being restored from secure storage.
    if (authLoading) return;
    let cancelled = false;
    const request = ++requestRef.current;
    const revision = editRevision.current;
    const current = () =>
      !cancelled &&
      accountRef.current === account &&
      requestRef.current === request;
    const unchanged = () => current() && editRevision.current === revision;
    setLoading(true);
    setError(null);
    settingsRef.current = DEFAULT_SETTINGS;
    setSettings(DEFAULT_SETTINGS);

    const init = async () => {
      try {
        if (account === 'guest') {
          guestSeen.current = true;
          return;
        }
        const cached = await loadSettingsFromStorage(
          account,
          !guestSeen.current,
        );
        if (!current()) return;
        if (cached) {
          await syncLanguage(cached.settings.language);
          if (!unchanged()) return;
          // Publish the cached appearance and translated labels together.
          publish(account, cached.settings, false);
          setHydratedAccount(account);
          if (
            cached.legacy &&
            (await persistSettings(account, cached.settings))
          ) {
            await AsyncStorage.removeItem(LEGACY_SETTINGS_KEY).catch(() => {});
          }
        }
        if (!current()) return;
        const api = await fetchProfileSettings({ auth: true, timeoutMs: 8000 });
        if (!unchanged()) return;
        const next = mapApiToAppSettings(api, settingsRef.current);
        await syncLanguage(next.language);
        if (!unchanged()) return;
        publish(account, next);
      } catch {
        if (current()) setError('Failed to load settings.');
      } finally {
        if (current()) {
          // Also release an offline first login using defaults, without writing
          // those defaults over any saved settings. The request is bounded.
          setHydratedAccount(account);
          setLoading(false);
        }
      }
    };
    void init();
    return () => {
      cancelled = true;
      invalidateRequests();
    };
  }, [account, authLoading, syncLanguage, publish, invalidateRequests]);

  const hydrated = !authLoading && hydratedAccount === account;
  const value: SettingsContextValue = {
    settings: hydratedAccount === account ? settings : DEFAULT_SETTINGS,
    loading: loading || !hydrated,
    hydrated,
    error,
    applyServerSettings,
    updateLocalSettings,
    reloadFromServer,
  };
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context)
    throw new Error('useSettings must be used within a SettingsProvider');
  return context;
}
