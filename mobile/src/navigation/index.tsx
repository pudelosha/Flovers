import React from "react";
import { ImageBackground } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/useAuth";

// logged-in area
import HomeScreen from "../screens/app/HomeScreen";

// auth screens (logged-out)
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResendActivationScreen from "../screens/auth/ResendActivationScreen";
import ConfirmEmailScreen from "../screens/auth/ConfirmEmailScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";

import AuthCard from "../components/AuthCard";

const bg = require("../../assets/bg-leaves.jpg");

// --- Types for the auth stack ---
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

// Deep-linking config (maps flovers:// paths to screens)
const linking = {
  prefixes: ["flovers://"],
  config: {
    screens: {
      // auth stack
      Login: "login",
      Register: "register",
      ForgotPassword: "forgot-password",
      ResendActivation: "resend-activation",
      ConfirmEmail: "confirm-email",     // flovers://confirm-email?uid=...&token=...
      ResetPassword: "reset-password",   // flovers://reset-password?uid=...&token=...
      // app stack (optional)
      Home: "home",
    },
  },
};

// Wrap a screen with the glass card (no background)
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
    <AppStack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#ffffff" },
        animation: "slide_from_right",
      }}
    >
      <AppStack.Screen name="Home" component={HomeScreen} options={{ title: "Flovers" }} />
    </AppStack.Navigator>
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
