import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { AuthProvider } from './src/app/providers/AuthContext';
import { SettingsProvider } from './src/app/providers/SettingsProvider';
import { LanguageProvider } from './src/app/providers/LanguageProvider';
import { FloatingTileMenuProvider } from './src/shared/ui/FloatingTileMenu';
import { useAppTheme } from './src/shared/theme/ThemeContext';
import { AppThemeProvider } from './src/shared/theme/AppThemeProvider';
import RootNavigator from './src/app/navigation/RootNavigator';
import { I18nextProvider } from 'react-i18next';
import i18n from './src/i18n';

import { API_BASE_NORM } from './src/config';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0B7285',
    secondary: '#66D9E8',
  },
  roundness: 20,
};

function ThemedApplication() {
  const { isLight, colors } = useAppTheme();
  const paperTheme = isLight
    ? {
        ...theme,
        colors: {
          ...theme.colors,
          primary: colors.primary,
          background: colors.background,
          surface: colors.surface,
          onSurface: colors.text,
          onBackground: colors.text,
        },
      }
    : theme;
  return (
    <PaperProvider theme={paperTheme}>
      <FloatingTileMenuProvider>
        <RootNavigator />
      </FloatingTileMenuProvider>
    </PaperProvider>
  );
}

export default function App() {
  useEffect(() => {
    console.log('[App] API_BASE =', API_BASE_NORM);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <LanguageProvider>
            <SettingsProvider>
              <AppThemeProvider>
                <ThemedApplication />
              </AppThemeProvider>
            </SettingsProvider>
          </LanguageProvider>
        </AuthProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}
