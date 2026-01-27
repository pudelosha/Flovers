import React, { useEffect, useMemo } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../providers/useAuth";
import { navigationRef } from "./navigationRef";
import { useSettings } from "../providers/SettingsProvider";
import { resolveBackground } from "../settings/backgrounds";

// push registration lifecycle
import {
  startPushNotifications,
  stopPushNotifications,
} from "../../api/services/push.service";

// logged-in shell
import AppTabs from "./AppTabs";

// auth screens
import LoginScreen from "../../features/auth/pages/LoginScreen";
import RegisterScreen from "../../features/auth/pages/RegisterScreen";
import ForgotPasswordScreen from "../../features/auth/pages/ForgotPasswordScreen";
import ResendActivationScreen from "../../features/auth/pages/ResendActivationScreen";
import ConfirmEmailScreen from "../../features/auth/pages/ConfirmEmailScreen";
import ResetPasswordScreen from "../../features/auth/pages/ResetPasswordScreen";
import RegisterSuccessScreen from "../../features/auth/pages/RegisterSuccessScreen";

import AuthCard from "../../features/auth/components/AuthCard";

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  RegisterSuccess: { email?: string } | undefined;
  ForgotPassword: undefined;
  ResendActivation: { email?: string } | undefined;
  ConfirmEmail:
    | { token?: string; uid?: string; email?: string; url?: string }
    | undefined;
  ResetPassword:
    | { token?: string; uid?: string; email?: string; url?: string }
    | undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const linking = {
  prefixes: ["flovers://"],
  config: {
    screens: {
      // auth
      Login: "login",
      Register: "register",
      ForgotPassword: "forgot-password",
      ResendActivation: "resend-activation",
      ConfirmEmail: "confirm-email",
      ResetPassword: "reset-password",

      // app tabs
      Home: "home",
      Plants: "plants",
      Reminders: "reminders",
      Readings: "readings",
      Profile: "profile",
      Scanner: "scanner",

      // readings flow
      ReadingsHistory: "readings-history",
      ReadingDetails: "reading-details",
      EditSensors: "edit-sensors",
      SortHistory: "sort-history",
      FilterHistory: "filter-history",

      // task history
      TaskHistory: "task-history",

      // locations
      PlantLocations: "locations",
    },
  },
};

function withAuthCard(Component: React.ComponentType<any>) {
  return (props: any) => (
    <AuthCard>
      <Component {...props} />
    </AuthCard>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: "none",
        detachPreviousScreen: true,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      <AuthStack.Screen name="Login" component={withAuthCard(LoginScreen)} />
      <AuthStack.Screen
        name="Register"
        component={withAuthCard(RegisterScreen)}
      />
      <AuthStack.Screen
        name="RegisterSuccess"
        component={withAuthCard(RegisterSuccessScreen)}
      />
      <AuthStack.Screen
        name="ForgotPassword"
        component={withAuthCard(ForgotPasswordScreen)}
      />
      <AuthStack.Screen
        name="ResendActivation"
        component={withAuthCard(ResendActivationScreen)}
      />
      <AuthStack.Screen
        name="ConfirmEmail"
        component={withAuthCard(ConfirmEmailScreen)}
      />
      <AuthStack.Screen
        name="ResetPassword"
        component={withAuthCard(ResetPasswordScreen)}
      />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return <AppTabs />;
}

export default function RootNavigator() {
  const { loading, token } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();

  const bgSource = useMemo(
    () => resolveBackground(settings?.background),
    [settings?.background]
  );

  useEffect(() => {
    if (loading) return;

    if (token) {
      startPushNotifications().catch(() => {});
    } else {
      stopPushNotifications();
    }
  }, [loading, token]);

  if (loading) {
    return (
      <ImageBackground
        source={bgSource}
        style={{ flex: 1 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
      <ImageBackground source={bgSource} style={{ flex: 1 }} resizeMode="cover">
        {token ? <AppNavigator /> : <AuthNavigator />}

        {/* block interaction while settings refresh (no visual change) */}
        {settingsLoading ? (
          <View pointerEvents="auto" style={StyleSheet.absoluteFillObject} />
        ) : null}
      </ImageBackground>
    </NavigationContainer>
  );
}
