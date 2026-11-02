import React, { createContext, useContext, useMemo } from 'react';
import { LIGHT_COLORS, DARK_COLORS, type ThemeContrast } from './palette';
export const ThemeContext = createContext({
  isLight: false,
  colors: DARK_COLORS,
});
export const ContrastContext = createContext<ThemeContrast>('surface');
export function useAppTheme() {
  return useContext(ThemeContext);
}
export function ThemeContrastScope({
  kind,
  children,
}: {
  kind: ThemeContrast;
  children: React.ReactNode;
}) {
  return (
    <ContrastContext.Provider value={kind}>{children}</ContrastContext.Provider>
  );
}
