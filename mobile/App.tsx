// App.tsx
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import { AuthProvider } from "./src/app/providers/AuthContext";
import RootNavigator from "./src/app/navigation/index";

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
          <RootNavigator />
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
