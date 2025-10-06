import React from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";

// Screens
import HomeScreen from "../screens/app/HomeScreen";
import PlantsScreen from "../screens/app/PlantsScreen";
import RemindersScreen from "../screens/app/RemindersScreen";
import ReadingsScreen from "../screens/app/ReadingsScreen";
import ProfileScreen from "../screens/app/ProfileScreen";

export type AppTabParamList = {
  Home: undefined;
  Plants: undefined;
  Reminders: undefined;
  Readings: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

function GlassTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  const getIcon = (name: string) => {
    switch (name) {
      case "Home":
        return "home-variant";
      case "Plants":
        return "flower-tulip-outline";
      case "Reminders":
        return "bell-outline";
      case "Readings":
        return "chart-line";
      case "Profile":
      default:
        return "account-circle-outline";
    }
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          s.tabWrap,
          { paddingBottom: Math.max(insets.bottom, 10) }, // a hair more padding
        ]}
      >
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={16}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.25)"
        />
        <View style={s.tabInner}>
          {state.routes.map((route: any, index: number) => {
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: "tabLongPress", target: route.key });
            };

            const iconName = getIcon(route.name);

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                style={s.tabItem}
              >
                {isFocused && <View style={s.focusPill} />}
                <MaterialCommunityIcons
                  name={iconName}
                  size={26}
                  color={isFocused ? "#0B7285" : "rgba(255,255,255,0.92)"}
                  style={s.icon}
                />
                <Text
                  style={[s.label, isFocused ? s.labelFocused : s.labelUnfocused]}
                  numberOfLines={1}
                >
                  {route.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
      }}
      tabBar={(props) => <GlassTabBar {...props} />}
      // Global padding for all tab screens so content never sticks to edges
      sceneContainerStyle={{
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 112, // ensure content clears the bar comfortably
        backgroundColor: "transparent",
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Plants" component={PlantsScreen} />
      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen name="Readings" component={ReadingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  tabWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
    overflow: "hidden",
    // top-only border
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  tabInner: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabItem: {
    width: 72,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  focusPill: {
    position: "absolute",
    top: 6,
    bottom: 6,
    left: 6,
    right: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  icon: {
    marginBottom: 2,
    zIndex: 1,
  },
  label: {
    fontSize: 8,
    lineHeight: 13,
    letterSpacing: 0.2,
    zIndex: 1,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 0.5,
  },
  labelFocused: {
    color: "#0B7285",
    fontWeight: "700",
  },
  labelUnfocused: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
  },
});
