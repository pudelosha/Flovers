// C:\Projekty\Python\Flovers\mobile\src\app\navigation\AppTabs.tsx
import React from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";

// Use gradient (with safe fallback if the lib isn't installed)
let LinearGradientView: any = View;
try {
  LinearGradientView = require("react-native-linear-gradient").default;
} catch {}

// Screens
import HomeScreen from "../../features/home/pages/HomeScreen";
import PlantsScreen from "../../features/plants/pages/PlantsScreen";
import RemindersScreen from "../../features/reminders/pages/RemindersScreen";
import ReadingsScreen from "../../features/readings/pages/ReadingsScreen";
import ProfileScreen from "../../features/profile/pages/ProfileScreen";
import ScannerScreen from "../../features/scanner/pages/ScannerScreen"; // hidden tab
import PlantDetailsScreen from "../../features/plants/pages/PlantDetailsScreen"; // hidden tab
import CreatePlantWizardScreen from "../../features/create-plant/pages/CreatePlantWizardScreen"; // hidden tab

// NEW: readings history page (hidden)
import ReadingsHistoryScreen from "../../features/readings-history/pages/ReadingsHistoryScreen";

// NEW: task/reminders history page (hidden)
import TaskHistoryScreen from "../../features/task-history/pages/TaskHistoryScreen";

// NEW: locations screen (hidden, under Plants)
import LocationsScreen from "../../features/locations/pages/LocationsScreen";

const Placeholder: React.FC = () => <View style={{ flex: 1 }} />;

export type AppTabParamList = {
  Home: undefined;
  Plants: undefined;
  Reminders: undefined;
  Readings: undefined;
  Profile: undefined;

  // Hidden
  Scanner: undefined;
  PlantDetails: undefined;
  CreatePlantWizard: undefined;
  AddReminder: undefined;

  // NEW: Locations (under Plants, hidden tab)
  PlantLocations: undefined;

  // NEW hidden routes for Readings flow
  ReadingsHistory:
    | {
        metric?: "temperature" | "humidity" | "light" | "moisture";
        range?: "day" | "week" | "month";
        id?: string;
      }
    | undefined;
  ReadingDetails: { id: string } | undefined;
  EditSensors: { id?: string } | undefined;
  DeleteReadingConfirm: { id: string } | undefined;
  SortHistory: undefined;
  FilterHistory: undefined;

  // NEW: Task / Reminders history (from Home)
  TaskHistory: { plantId?: string } | undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

// 🔹 Map hidden child routes to the tab that should appear active
const PARENT_FOR_ROUTE: Record<string, keyof AppTabParamList> = {
  CreatePlantWizard: "Plants",
  PlantDetails: "Plants",
  AddReminder: "Reminders",

  // Locations live under the Plants tab
  PlantLocations: "Plants",

  // Readings flow
  ReadingsHistory: "Readings",
  ReadingDetails: "Readings",
  EditSensors: "Readings",
  DeleteReadingConfirm: "Readings",
  SortHistory: "Readings",
  FilterHistory: "Readings",

  // Task history belongs visually under Home
  TaskHistory: "Home",
};

const TAB_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
const TAB_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

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

  const HIDDEN = new Set([
    "Scanner",
    "PlantDetails",
    "CreatePlantWizard",
    "AddReminder",
    // hidden readings routes
    "ReadingsHistory",
    "ReadingDetails",
    "EditSensors",
    "DeleteReadingConfirm",
    "SortHistory",
    "FilterHistory",
    // NEW: hide TaskHistory tab
    "TaskHistory",
    // NEW: hide Locations route (under Plants)
    "PlantLocations",
  ]);

  const visibleRoutes = state.routes.filter((r: any) => !HIDDEN.has(r.name));

  const activeRouteName: string | undefined = state.routes[state.index]?.name;
  const parentTabName: string =
    (activeRouteName && PARENT_FOR_ROUTE[activeRouteName]) ||
    activeRouteName ||
    "Home";

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          s.tabWrap,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        {/* Blur behind gradient */}
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={10}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.12)"
        />

        {/* Gradient tint */}
        <LinearGradientView
          colors={TAB_GRADIENT_TINT}
          locations={[0, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { backgroundColor: TAB_SOLID_FALLBACK }]}
        />

        <View style={s.tabInner}>
          {visibleRoutes.map((route: any) => {
            const isFocused = route.name === parentTabName;

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
                  color={isFocused ? "#FFFFFF" : "rgba(255,255,255,0.92)"}
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
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}
      tabBar={(props) => <GlassTabBar {...props} />}
      sceneContainerStyle={{
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 112,
        backgroundColor: "transparent",
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Plants" component={PlantsScreen} />
      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen name="Readings" component={ReadingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />

      {/* Hidden routes */}
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ tabBarStyle: { display: "flex" } }}
      />
      <Tab.Screen
        name="PlantDetails"
        component={PlantDetailsScreen}
        options={{ tabBarStyle: { display: "flex" } }}
      />
      <Tab.Screen
        name="CreatePlantWizard"
        component={CreatePlantWizardScreen}
        options={{ tabBarStyle: { display: "flex" } }}
      />

      {/* Hidden readings routes */}
      <Tab.Screen
        name="ReadingsHistory"
        component={ReadingsHistoryScreen}
        options={{ tabBarStyle: { display: "flex" } }}
      />
      <Tab.Screen
        name="ReadingDetails"
        component={Placeholder}
        options={{ tabBarStyle: { display: "flex" } }}
      />
      <Tab.Screen
        name="EditSensors"
        component={Placeholder}
        options={{ tabBarStyle: { display: "flex" } }}
      />
      <Tab.Screen
        name="DeleteReadingConfirm"
        component={Placeholder}
        options={{ tabBarStyle: { display: "flex" } }}
      />
      <Tab.Screen
        name="SortHistory"
        component={Placeholder}
        options={{ tabBarStyle: { display: "flex" } }}
      />
      <Tab.Screen
        name="FilterHistory"
        component={Placeholder}
        options={{ tabBarStyle: { display: "flex" } }}
      />

      {/* NEW: hidden TaskHistory route */}
      <Tab.Screen
        name="TaskHistory"
        component={TaskHistoryScreen}
        options={{ tabBarStyle: { display: "flex" } }}
      />

      {/* NEW: hidden PlantLocations route (Locations screen) */}
      <Tab.Screen
        name="PlantLocations"
        component={LocationsScreen}
        options={{ tabBarStyle: { display: "flex" } }}
      />
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
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
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
    backgroundColor: "rgba(255,255,255,0.12)",
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
    color: "#FFFFFF",
    fontWeight: "700",
  },
  labelUnfocused: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
  },
});
