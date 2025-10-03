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

import AuthCard from "../components/AuthCard";

const bg = require("../../assets/bg-leaves.jpg");

// --- Types for the auth stack ---
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResendActivation: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator();

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
    // Render the leaves background ONCE here so it stays static
    <ImageBackground source={bg} style={{ flex: 1 }} resizeMode="cover">
      <AuthStack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          // IMPORTANT: remove cross-screen animation to avoid double frames.
          // Old screen is removed immediately; AuthCard animates itself on mount.
          animation: "none",
          detachPreviousScreen: true,
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <AuthStack.Screen name="Login" component={withAuthCard(LoginScreen)} />
        <AuthStack.Screen name="Register" component={withAuthCard(RegisterScreen)} />
        <AuthStack.Screen name="ForgotPassword" component={withAuthCard(ForgotPasswordScreen)} />
        <AuthStack.Screen name="ResendActivation" component={withAuthCard(ResendActivationScreen)} />
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
    <NavigationContainer>
      {token ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
