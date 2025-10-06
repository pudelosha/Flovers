import React from "react";
import { ImageBackground } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/useAuth";

// logged-in shell
import AppTabs from "./AppTabs";

// auth screens (logged-out)
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResendActivationScreen from "../screens/auth/ResendActivationScreen";
import ConfirmEmailScreen from "../screens/auth/ConfirmEmailScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";

import AuthCard from "../components/AuthCard";

const bg = require("../../assets/bg-leaves.jpg");

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResendActivation: { email?: string } | undefined;
  ConfirmEmail: { token?: string; uid?: string; email?: string; url?: string } | undefined;
  ResetPassword: { token?: string; uid?: string; email?: string; url?: string } | undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator();

// deep linking stays (for auth)
const linking = {
  prefixes: ["flovers://"],
  config: {
    screens: {
      Login: "login",
      Register: "register",
      ForgotPassword: "forgot-password",
      ResendActivation: "resend-activation",
      ConfirmEmail: "confirm-email",
      ResetPassword: "reset-password",
      // app tabs (optional mapping)
      Home: "home",
      Plants: "plants",
      Reminders: "reminders",
      Readings: "readings",
      Profile: "profile",
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
