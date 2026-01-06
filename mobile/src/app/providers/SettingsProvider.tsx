import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./useAuth";
import { fetchProfileSettings, type ApiProfileSettings } from "../../api/services/profile.service";
import { DEFAULT_SETTINGS } from "../settings/settings.defaults";
import type { AppSettings } from "../settings/settings.types";

// ✅ We use i18n ONLY to listen to language changes
import i18n from "../../i18n";

// ✅ Primary source of truth for changing language
import { useLanguage } from "./LanguageProvider";

const SETTINGS_STORAGE_KEY = "app:settings:v1";

type SettingsContextValue = {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  applyServerSettings: (api: ApiProfileSettings) => void;
  updateLocalSettings: (partial: Partial<AppSettings>) => void;
  reloadFromServer: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

// Ensure tile transparency is always a valid number between 0 and 0.6.
function normalizeTileTransparency(v: any): number {
  let n: number;
  if (typeof v === "number") {
    n = v;
  } else if (typeof v === "string") {
    const parsed = parseFloat(v);
    n = Number.isFinite(parsed) ? parsed : DEFAULT_SETTINGS.tileTransparency;
  } else {
    n = DEFAULT_SETTINGS.tileTransparency;
  }
  if (!Number.isFinite(n)) {
    n = DEFAULT_SETTINGS.tileTransparency;
  }
  if (n < 0) n = 0;
  if (n > 0.6) n = 0.6;
  return n;
}

function mapApiToAppSettings(api: ApiProfileSettings): AppSettings {
  return {
    language: api.language,
    dateFormat: api.date_format,
    temperatureUnit: api.temperature_unit,
    measureUnit: api.measure_unit,
    tileTransparency: normalizeTileTransparency((api as any).tile_transparency),
    tileMotive: api.tile_motive,
    background: api.background,
    fabPosition: api.fab_position,
  };
}

async function persistSettings(settings: AppSettings) {
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // non-fatal: ignore persistence errors
  }
}

async function loadSettingsFromStorage(): Promise<Partial<AppSettings> | null> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed as Partial<AppSettings>;
  } catch {
    return null;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Use LanguageProvider to apply language (single source of truth)
  const { changeLanguage: changeAppLanguage, currentLanguage } = useLanguage();

  const applyServerSettings = useCallback((api: ApiProfileSettings) => {
    setSettings((prev) => {
      const mapped = mapApiToAppSettings(api);
      const next: AppSettings = {
        ...prev,
        ...mapped,
      };
      // persist but don't block UI
      persistSettings(next);
      return next;
    });
  }, []);

  const updateLocalSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next: AppSettings = {
        ...prev,
        ...partial,
        tileTransparency: normalizeTileTransparency(
          (partial as any).tileTransparency ?? prev.tileTransparency
        ),
      };
      persistSettings(next);
      return next;
    });
  }, []);

  const reloadFromServer = useCallback(async () => {
    if (!user) {
      // no user => nothing to fetch
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const api = await fetchProfileSettings({ auth: true });
      applyServerSettings(api);

      // ✅ Apply server language via LanguageProvider (not i18n directly)
      if (api.language && api.language !== currentLanguage) {
        await changeAppLanguage(api.language);
      }
    } catch (e) {
      console.warn("Failed to reload profile settings", e);
      setError("Failed to reload settings.");
    } finally {
      setLoading(false);
    }
  }, [user, applyServerSettings, changeAppLanguage, currentLanguage]);

  // ✅ Mirror any i18n language changes into settings + persistence
  // This makes FAB changes persist even when SettingsProvider is mounted.
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setSettings((prev) => {
        if (prev.language === lng) return prev;
        const next = { ...prev, language: lng };
        persistSettings(next);
        return next;
      });
    };

    i18n.on("languageChanged", handleLanguageChanged);
    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, []);

  // Initial hydrate + react to auth changes
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      setError(null);

      // If user is not logged in, just use defaults and persist them
      if (!user) {
        const next = DEFAULT_SETTINGS;
        setSettings(next);
        await persistSettings(next);
        setLoading(false);
        return;
      }

      // 1) Load from storage as a cheap fallback
      const cached = await loadSettingsFromStorage();
      if (!cancelled && cached) {
        setSettings((prev) => ({
          ...prev,
          ...cached,
          tileTransparency: normalizeTileTransparency(
            (cached as any).tileTransparency ?? prev.tileTransparency
          ),
        }));
      }

      // 2) Always try to refresh from backend
      try {
        const api = await fetchProfileSettings({ auth: true });
        if (cancelled) return;

        const mapped = mapApiToAppSettings(api);

        const base: AppSettings = cached
          ? {
              ...DEFAULT_SETTINGS,
              ...cached,
              tileTransparency: normalizeTileTransparency(
                (cached as any).tileTransparency ?? DEFAULT_SETTINGS.tileTransparency
              ),
            }
          : DEFAULT_SETTINGS;

        const next: AppSettings = {
          ...base,
          ...mapped,
        };

        setSettings(next);
        await persistSettings(next);

        // ✅ Apply server language via LanguageProvider
        if (next.language && next.language !== currentLanguage) {
          await changeAppLanguage(next.language);
        }
      } catch (e) {
        console.warn("Failed to fetch profile settings", e);
        if (!cancelled) {
          setError("Failed to load settings.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [user, changeAppLanguage, currentLanguage]);

  const value: SettingsContextValue = {
    settings,
    loading,
    error,
    applyServerSettings,
    updateLocalSettings,
    reloadFromServer,
  };

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
