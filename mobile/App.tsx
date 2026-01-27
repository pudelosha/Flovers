// C:\Projekty\Python\Flovers\mobile\App.tsx
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import { AuthProvider } from "./src/app/providers/AuthContext";
import { SettingsProvider } from "./src/app/providers/SettingsProvider";
import { LanguageProvider } from "./src/app/providers/LanguageProvider";
import RootNavigator from "./src/app/navigation/RootNavigator";
import { I18nextProvider } from "react-i18next";
import i18n from "./src/i18n";

import { API_BASE_NORM } from "./src/config";

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#0B7285",
    secondary: "#66D9E8",
  },
  roundness: 20,
};

export default function App() {
  // One-time log to verify env wiring
  useEffect(() => {
    console.log("[App] API_BASE =", API_BASE_NORM);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <LanguageProvider>
              <SettingsProvider>
                <RootNavigator />
              </SettingsProvider>
            </LanguageProvider>
          </AuthProvider>
        </I18nextProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
