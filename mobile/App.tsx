import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import { AuthProvider } from "./src/app/providers/AuthContext";
import { SettingsProvider } from "./src/app/providers/SettingsProvider";
import RootNavigator from "./src/app/navigation/RootNavigator";
import "./src/i18n";

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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <SettingsProvider>
            <RootNavigator />
          </SettingsProvider>
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
