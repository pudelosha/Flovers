import React from "react";
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

import AuthBackground from "../components/AuthBackground";

// --- Types for the auth stack ---
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResendActivation: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator();

// helper HOC to wrap auth screens in the frosted-glass background
function withAuthBackground(Component: React.ComponentType<any>) {
  return (props: any) => (
    <AuthBackground>
      <Component {...props} />
    </AuthBackground>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
        // smooth transitions that look great with blur
        animation: "fade_from_bottom",
      }}
    >
      <AuthStack.Screen name="Login" component={withAuthBackground(LoginScreen)} />
      <AuthStack.Screen name="Register" component={withAuthBackground(RegisterScreen)} />
      <AuthStack.Screen name="ForgotPassword" component={withAuthBackground(ForgotPasswordScreen)} />
      <AuthStack.Screen name="ResendActivation" component={withAuthBackground(ResendActivationScreen)} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#ffffff" }, // plain background for logged-in area
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
