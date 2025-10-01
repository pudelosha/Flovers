// index.tsx
// App navigation with an auth guard:
// - If there's NO token → show Auth stack (Register/Login)
// - If there IS a token → show App stack (Home & future protected screens)

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/useAuth";
import RegisterScreen from "../screens/auth/RegisterScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import HomeScreen from "../screens/app/HomeScreen";

// 1) Create two separate stacks: one for unauthenticated, one for authenticated
const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

// 2) Screens available to UNAUTHENTICATED users only
function AuthNavigator() {
  return (
    <AuthStack.Navigator>
      {/* Default/first screen is Register; from there user can navigate to Login */}
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Create account" }}
      />
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: "Sign in" }}
      />
    </AuthStack.Navigator>
  );
}

// 3) Screens available to AUTHENTICATED users only
function AppNavigator() {
  return (
    <AppStack.Navigator>
      <AppStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Flovers" }}
      />
      {/* Add more protected screens here later (Plants, Calendar, Readings, Profile) */}
    </AppStack.Navigator>
  );
}

// 4) RootNavigator decides WHICH stack to show based on auth state
export default function RootNavigator() {
  const { loading, token } = useAuth();

  // While we're loading the token from AsyncStorage, don't render nav yet
  // (You can swap this for a Splash screen/spinner)
  if (loading) return null;

  // If token exists → user is logged in → show AppNavigator
  // Otherwise → show AuthNavigator
  return (
    <NavigationContainer>
      {token ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
