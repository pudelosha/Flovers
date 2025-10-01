import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaView, Text, View } from "react-native";

type RootStackParamList = { Home: undefined };
const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeScreen() {
  return (
    <SafeAreaView>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "600" }}>
          Flovers mobile is ready 🌱
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
