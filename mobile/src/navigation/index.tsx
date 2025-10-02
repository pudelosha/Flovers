import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/useAuth";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import HomeScreen from "../screens/app/HomeScreen";
import AuthBackground from "../components/AuthBackground";

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

// helper HOC to wrap auth screens in the jungle glass background
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
      }}
    >
      <AuthStack.Screen name="Login" component={withAuthBackground(LoginScreen)} />
      <AuthStack.Screen name="Register" component={withAuthBackground(RegisterScreen)} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#ffffff" }, // no jungle for logged-in area
      }}
    >
      <AppStack.Screen name="Home" component={HomeScreen} options={{ title: "Flovers" }} />
    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const { loading, token } = useAuth();
  if (loading) return null;
  return <NavigationContainer>{token ? <AppNavigator /> : <AuthNavigator />}</NavigationContainer>;
}
