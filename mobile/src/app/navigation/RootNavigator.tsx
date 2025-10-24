import React from "react";
import { ImageBackground } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../providers/useAuth";

// logged-in shell
import AppTabs from "./AppTabs";

// auth screens (logged-out)
import LoginScreen from "../../features/auth/pages/LoginScreen";
import RegisterScreen from "../../features/auth/pages/RegisterScreen";
import ForgotPasswordScreen from "../../features/auth/pages/ForgotPasswordScreen";
import ResendActivationScreen from "../../features/auth/pages/ResendActivationScreen";
import ConfirmEmailScreen from "../../features/auth/pages/ConfirmEmailScreen";
import ResetPasswordScreen from "../../features/auth/pages/ResetPasswordScreen";

import AuthCard from "../../features/auth/components/AuthCard";

const bg = require("../../../assets/bg-leaves.jpg");

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResendActivation: { email?: string } | undefined;
  ConfirmEmail: { token?: string; uid?: string; email?: string; url?: string } | undefined;
  ResetPassword: { token?: string; uid?: string; email?: string; url?: string } | undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// deep linking (auth + tab screens, incl. hidden screens for direct links)
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

      // app tabs (and selected hidden routes)
      Home: "home",
      Plants: "plants",
      Reminders: "reminders",
      Readings: "readings",
      Profile: "profile",
      Scanner: "scanner",

      // NEW: deep links for readings history flow
      ReadingsHistory: "readings-history",
      ReadingDetails: "reading-details",
      EditSensors: "edit-sensors",
      SortHistory: "sort-history",
      FilterHistory: "filter-history",
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
    <ImageBackground source={bg} style={{ flex: 1 }} resizeMode="cover">
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
        <AuthStack.Screen name="Register" component={withAuthCard(RegisterScreen)} />
        <AuthStack.Screen name="ForgotPassword" component={withAuthCard(ForgotPasswordScreen)} />
        <AuthStack.Screen name="ResendActivation" component={withAuthCard(ResendActivationScreen)} />
        <AuthStack.Screen name="ConfirmEmail" component={withAuthCard(ConfirmEmailScreen)} />
        <AuthStack.Screen name="ResetPassword" component={withAuthCard(ResetPasswordScreen)} />
      </AuthStack.Navigator>
    </ImageBackground>
  );
}

function AppNavigator() {
  return (
    // Static leaves background behind the whole logged-in area
    <ImageBackground source={bg} style={{ flex: 1 }} resizeMode="cover">
      <AppTabs />
    </ImageBackground>
  );
}

export default function RootNavigator() {
  const { loading, token } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer linking={linking}>
      {token ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
