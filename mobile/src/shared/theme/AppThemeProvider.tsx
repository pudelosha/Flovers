import React, { useMemo } from 'react';
import { useSettings } from '../../app/providers/SettingsProvider';
import { useAuth } from '../../app/providers/useAuth';
import { ThemeContext } from './ThemeContext';
import { LIGHT_COLORS, DARK_COLORS } from './palette';
export function AppThemeProvider({ children }: React.PropsWithChildren) {
  const { settings } = useSettings();
  const { token } = useAuth();
  const isLight = !!token && settings.theme === 'light';
  const value = useMemo(
    () => ({ isLight, colors: isLight ? LIGHT_COLORS : DARK_COLORS }),
    [isLight],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
