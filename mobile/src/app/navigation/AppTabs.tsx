import NotificationsScreen from "../../features/notifications/pages/NotificationsScreen";
import { TAB_CONTENT_HEIGHT, MIN_TAB_BOTTOM_PADDING, bottomNavigationHeight } from "../../shared/constants/layout";
import { useAppTheme } from '../../shared/theme/ThemeContext';
import { DARK_MODAL_BACKGROUND, useModalNavigationBackdropVisible } from '../../shared/ui/modalNavigationBackdrop';
import React from "react";
import { Animated, AnimatedView, Easing, BackHandler, Keyboard, View, Pressable, StyleSheet, Text } from "../../shared/theme/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "../../shared/theme/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";
import { useTranslation } from "react-i18next";

// Use gradient (with safe fallback if the lib isn't installed)
let LinearGradientView: any = View;
try {
  LinearGradientView = require("../../shared/theme/Gradient").default;
} catch {}

// Screens
import HomeScreen from "../../features/home/pages/HomeScreen";
import PlantsScreen from "../../features/plants/pages/PlantsScreen";
import RemindersScreen from "../../features/reminders/pages/RemindersScreen";
import ReadingsScreen from "../../features/readings/pages/ReadingsScreen";
import ProfileScreen from "../../features/profile/pages/ProfileScreen";
import ContactsScreen from "../../features/sharing/pages/ContactsScreen";
import SharedPlantsScreen from "../../features/sharing/pages/SharedPlantsScreen";
import SharePlantModal from "../../features/sharing/components/SharePlantModal";
import SharingToastHost from "../../features/sharing/components/SharingToastHost";
import AppModalHost from "../../shared/ui/AppModalHost";
import { SharingPreviewProvider, useSharingPreview } from "../../features/sharing/state/SharingPreviewProvider";
import { ContactsProvider } from "../../features/sharing/state/ContactsProvider";
import ScannerScreen from "../../features/scanner/pages/ScannerScreen"; // hidden tab
import PlantDetailsScreen from "../../features/plant-details/pages/PlantDetailsScreen"; // hidden tab
import CreatePlantWizardScreen from "../../features/create-plant/pages/CreatePlantWizardScreen"; // hidden tab

// readings history page (hidden)
import ReadingsHistoryScreen from "../../features/readings-history/pages/ReadingsHistoryScreen";

// task/reminders history page (hidden)
import TaskHistoryScreen from "../../features/task-history/pages/TaskHistoryScreen";

// locations screen (hidden, under Plants)
import LocationsScreen from "../../features/locations/pages/LocationsScreen";
import ConfirmEmailScreen from "../../features/auth/pages/ConfirmEmailScreen";
import ResetPasswordScreen from "../../features/auth/pages/ResetPasswordScreen";
import AuthCard from "../../features/auth/components/AuthCard";

function ConfirmEmailRecovery(props: any) {
  return <AuthCard><ConfirmEmailScreen {...props} /></AuthCard>;
}

function ResetPasswordRecovery(props: any) {
  return <AuthCard><ResetPasswordScreen {...props} /></AuthCard>;
}

const Placeholder: React.FC = () => <View style={{ flex: 1 }} />;

export type AppTabParamList = {
  Home: { plantId?: string; filterRequestId?: string } | undefined;

  // allow navigation params for auto-opening edit modal
  Plants:
    | {
        editPlantId?: string;
        plantId?: string;
        id?: string;
      }
    | undefined;

  Reminders: undefined;
  Readings: undefined;
  Profile: undefined;
  Contacts: undefined;
  SharedPlants: undefined;
  ConfirmEmail: { uid?: string; token?: string; email?: string; url?: string } | undefined;
  ResetPassword: { uid?: string; token?: string; email?: string; url?: string } | undefined;

  // Hidden
  Scanner: undefined;
  PlantDetails: undefined;
  CreatePlantWizard: undefined;
  AddReminder: undefined;

  // Locations (under Plants, hidden tab)
  PlantLocations: undefined;

  // hidden routes for Readings flow
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

  // Task / Reminders history (from Home)
  TaskHistory: { plantId?: string } | undefined;
  Notifications: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

// Map hidden child routes to the tab that should appear active
const PARENT_FOR_ROUTE: Record<string, keyof AppTabParamList> = {
  Contacts: "Profile",
  SharedPlants: "Profile",
  ConfirmEmail: "Profile",
  ResetPassword: "Profile",
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
  Notifications: "Home",
};

const TAB_GRADIENT_TINT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
const TAB_SOLID_FALLBACK = "rgba(10,51,40,0.70)";

function GlassTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { isLight, colors } = useAppTheme();
  const modalBackdropVisible = useModalNavigationBackdropVisible();
  const { t } = useTranslation();
  const { shareDraft, closeSharePlant } = useSharingPreview();

  const getTranslatedLabel = (routeName: string) =>
    t(`navigation.tabs.${routeName}`, { defaultValue: routeName });

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
    "Notifications",
    "Contacts",
    "SharedPlants",
    "ConfirmEmail",
    "ResetPassword",
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
    // hide TaskHistory tab
    "TaskHistory",
    // hide Locations route (under Plants)
    "PlantLocations",
  ]);

  const visibleRoutes = state.routes.filter((r: any) => !HIDDEN.has(r.name));

  const activeRouteName: string | undefined = state.routes[state.index]?.name;
  const parentTabName: string =
    (activeRouteName && PARENT_FOR_ROUTE[activeRouteName]) ||
    activeRouteName ||
    "Home";

  const activeIndex = Math.max(0, visibleRoutes.findIndex((route: any) => route.name === parentTabName));
  const [barWidth, setBarWidth] = React.useState(0);
  const selectionPosition = React.useRef(new Animated.Value(activeIndex)).current;
  const slotWidth = barWidth / Math.max(1, visibleRoutes.length);
  React.useEffect(() => {
    const animation = Animated.timing(selectionPosition, {
      toValue: activeIndex,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [activeIndex, selectionPosition]);

  React.useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const currentRouteName: string | undefined = state.routes[state.index]?.name;
      const parentForHiddenRoute = currentRouteName
        ? PARENT_FOR_ROUTE[currentRouteName]
        : undefined;

      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }

      if (parentForHiddenRoute) {
        navigation.navigate(parentForHiddenRoute);
        return true;
      }

      if (currentRouteName && currentRouteName !== "Home") {
        navigation.navigate("Home");
        return true;
      }

      return false;
    });

    return () => sub.remove();
  }, [navigation, state.index, state.routes]);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {modalBackdropVisible && (
        <View
          testID="navigation-modal-background"
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: bottomNavigationHeight(insets.bottom) - TAB_CONTENT_HEIGHT / 2,
            height: TAB_CONTENT_HEIGHT / 2 + 1,
            backgroundColor: isLight ? colors.modal : DARK_MODAL_BACKGROUND,
          }}
        />
      )}
      <View style={[s.tabWrap, { paddingBottom: Math.max(insets.bottom, MIN_TAB_BOTTOM_PADDING) }]}>
        {/* Blur behind gradient */}
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={10}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.12)"
        />

        {/* Gradient tint */}
        <LinearGradientView
          themeRole="navigation"
          colors={TAB_GRADIENT_TINT}
          locations={[0, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { backgroundColor: TAB_SOLID_FALLBACK }]}
        />

        <View style={s.tabInner} onLayout={event => setBarWidth(event.nativeEvent.layout.width)}>
          {slotWidth > 0 && (
            <AnimatedView
              pointerEvents="none"
              style={[
                s.focusPill,
                { width: Math.max(0, slotWidth - 8), transform: [{ translateX: Animated.multiply(selectionPosition, slotWidth) }] },
              ]}
            />
          )}
          {visibleRoutes.map((route: any) => {
            const isFocused = route.name === parentTabName;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented && shareDraft) {
                Keyboard.dismiss();
                closeSharePlant();
              }
              if ((!isFocused || activeRouteName !== route.name) && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: "tabLongPress", target: route.key });
            };

            const iconName = getIcon(route.name);
            const translatedLabel = getTranslatedLabel(route.name);

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                style={s.tabItem}
              >
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
                  {translatedLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function AppTabsNavigator() {
  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
      }}
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
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="SharedPlants" component={SharedPlantsScreen} />
      <Tab.Screen name="ConfirmEmail" component={ConfirmEmailRecovery} />
      <Tab.Screen name="ResetPassword" component={ResetPasswordRecovery} />

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

      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{tabBarButton:()=>null}}/>
      <Tab.Screen
        name="TaskHistory"
        component={TaskHistoryScreen}
        options={{ tabBarStyle: { display: "flex" } }}
      />

      <Tab.Screen
        name="PlantLocations"
        component={LocationsScreen}
        options={{ tabBarStyle: { display: "flex" } }}
      />
    </Tab.Navigator>
  );
}

export default function AppTabs() {
  return (
    <SharingPreviewProvider>
      <ContactsProvider>
      <View style={{ flex: 1 }}>
        <AppTabsNavigator />
        <AppModalHost>
          <SharePlantModal />
        </AppModalHost>
        <SharingToastHost />
      </View>
      </ContactsProvider>
    </SharingPreviewProvider>
  );
}

const s = StyleSheet.create({
  tabWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
    borderTopWidth: 0,
    borderColor: "rgba(255,255,255,0.20)",
  },
  tabInner: {
    height: TAB_CONTENT_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  focusPill: {
    position: "absolute",
    top: 6,
    bottom: 6,
    left: 4,
    borderRadius: 26,
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
