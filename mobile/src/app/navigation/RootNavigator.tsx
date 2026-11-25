import { LIGHT_BACKGROUND } from '../settings/backgrounds';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, ImageBackground, View } from '../../shared/theme/native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../providers/useAuth';
import { useAppStartup } from '../providers/AppStartupProvider';
import { navigationRef, flushPendingNavigation } from './navigationRef';
import { useSettings } from '../providers/SettingsProvider';
import { useAppTheme } from '../../shared/theme/ThemeContext';
import { StatusBar } from 'react-native';
import SystemBars from '../../shared/theme/SystemBars';
import { backgroundForSession } from '../settings/themes';
import { resolveBackground } from '../settings/backgrounds';

// push registration lifecycle
import {
  startPushNotifications,
  stopPushNotifications,
} from '../../api/services/push.service';

// logged-in shell
import AppTabs from './AppTabs';
import LogoutToast from './LogoutToast';

// auth screens
import LoginScreen from '../../features/auth/pages/LoginScreen';
import RegisterScreen from '../../features/auth/pages/RegisterScreen';
import ForgotPasswordScreen from '../../features/auth/pages/ForgotPasswordScreen';
import ResendActivationScreen from '../../features/auth/pages/ResendActivationScreen';
import ConfirmEmailScreen from '../../features/auth/pages/ConfirmEmailScreen';
import ResetPasswordScreen from '../../features/auth/pages/ResetPasswordScreen';
import RegisterSuccessScreen from '../../features/auth/pages/RegisterSuccessScreen';

import AuthCard from '../../features/auth/components/AuthCard';
import CenteredSpinner from '../../shared/ui/CenteredSpinner';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  RegisterSuccess: { email?: string } | undefined;
  ForgotPassword: undefined;
  ResendActivation: { email?: string } | undefined;
  ConfirmEmail:
    | { token?: string; uid?: string; email?: string; url?: string }
    | undefined;
  ResetPassword:
    | { token?: string; uid?: string; email?: string; url?: string }
    | undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const linking = {
  prefixes: ['flovers://'],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      ResendActivation: 'resend-activation',
      ConfirmEmail: 'confirm-email',
      ResetPassword: 'reset-password',

      Home: 'home',
      Plants: 'plants',
      Reminders: 'reminders',
      Readings: 'readings',
      Profile: 'profile',
      Scanner: 'scanner',

      ReadingsHistory: 'readings-history',
      ReadingDetails: 'reading-details',
      EditSensors: 'edit-sensors',
      SortHistory: 'sort-history',
      FilterHistory: 'filter-history',

      TaskHistory: 'task-history',
      PlantLocations: 'locations',
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

// Stable screen identities preserve login fields while startup/session state changes.
const authScreens = {
  Login: withAuthCard(LoginScreen),
  Register: withAuthCard(RegisterScreen),
  RegisterSuccess: withAuthCard(RegisterSuccessScreen),
  ForgotPassword: withAuthCard(ForgotPasswordScreen),
  ResendActivation: withAuthCard(ResendActivationScreen),
  ConfirmEmail: withAuthCard(ConfirmEmailScreen),
  ResetPassword: withAuthCard(ResetPasswordScreen),
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <AuthStack.Screen name="Login" component={authScreens.Login} />
      <AuthStack.Screen name="Register" component={authScreens.Register} />
      <AuthStack.Screen
        name="RegisterSuccess"
        component={authScreens.RegisterSuccess}
      />
      <AuthStack.Screen
        name="ForgotPassword"
        component={authScreens.ForgotPassword}
      />
      <AuthStack.Screen
        name="ResendActivation"
        component={authScreens.ResendActivation}
      />
      <AuthStack.Screen
        name="ConfirmEmail"
        component={authScreens.ConfirmEmail}
      />
      <AuthStack.Screen
        name="ResetPassword"
        component={authScreens.ResetPassword}
      />
    </AuthStack.Navigator>
  );
}

function AppNavigator(props: React.ComponentProps<typeof AppTabs>) {
  return <AppTabs {...props} />;
}

export default function RootNavigator() {
  const { loading, token } = useAuth();
  const { isLight, colors } = useAppTheme();
  const { hydrated: settingsHydrated } = useSettings();
  const { complete: startupComplete, finish: finishStartup } = useAppStartup();
  const [navigationReady, setNavigationReady] = useState(false);
  const [shellPrepared, setShellPrepared] = useState(false);
  const [backgroundReady, setBackgroundReady] = useState<string | null>(null);
  const sessionPreparing = loading || (!!token && !settingsHydrated);
  const signedInReady = !!token && !sessionPreparing;
  const backgroundKey = signedInReady ? (isLight ? 'light' : 'dark') : 'guest';
  const onShellPrepared = useCallback(() => setShellPrepared(true), []);
  const onNavigationReady = useCallback(() => {
    setNavigationReady(true);
    flushPendingNavigation();
  }, []);
  const onBackgroundReady = useCallback(() => {
    setBackgroundReady(backgroundKey);
  }, [backgroundKey]);

  const bgSource = useMemo(
    () =>
      isLight && signedInReady
        ? LIGHT_BACKGROUND
        : resolveBackground(backgroundForSession(signedInReady)),
    [signedInReady, isLight],
  );

  useEffect(() => {
    if (
      startupComplete ||
      loading ||
      !settingsHydrated ||
      !navigationReady ||
      backgroundReady !== backgroundKey ||
      (token && !shellPrepared)
    )
      return;
    // Wait for a native frame with the correct background, labels and measured
    // header. Data requests may already run behind the launch artwork.
    const frame = requestAnimationFrame(finishStartup);
    return () => cancelAnimationFrame(frame);
  }, [
    startupComplete,
    loading,
    settingsHydrated,
    navigationReady,
    backgroundReady,
    backgroundKey,
    token,
    shellPrepared,
    finishStartup,
  ]);

  useEffect(() => {
    if (loading) return;
    if (!token) {
      stopPushNotifications();
      return;
    }
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (retryTimer) clearTimeout(retryTimer);
      startPushNotifications().catch(() => {
        if (!cancelled) retryTimer = setTimeout(start, 30000);
      });
    };
    start();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') start();
    });
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      subscription.remove();
      stopPushNotifications();
    };
  }, [loading, token]);

  // The persistent app-root logo covers cold preparation. Do not mount the
  // guest navigator early and consume an authenticated initial link there.
  // After startup, session changes use normal screens/spinners, never branding.
  if (!startupComplete && (loading || !settingsHydrated)) return null;

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        linking={linking}
        ref={navigationRef}
        onReady={onNavigationReady}
      >
        <ImageBackground
          source={bgSource}
          style={{ flex: 1, backgroundColor: colors.background }}
          resizeMode="cover"
          onLoadEnd={onBackgroundReady}
        >
          <StatusBar
            barStyle={
              startupComplete && signedInReady && isLight
                ? 'dark-content'
                : 'light-content'
            }
            backgroundColor={
              !startupComplete
                ? '#0B1820'
                : signedInReady && isLight
                ? colors.background
                : 'transparent'
            }
          />
          {startupComplete && <SystemBars />}

          <View
            style={{ flex: 1, opacity: sessionPreparing ? 0 : 1 }}
            pointerEvents={sessionPreparing ? 'none' : 'auto'}
            accessibilityElementsHidden={sessionPreparing}
            importantForAccessibility={
              sessionPreparing ? 'no-hide-descendants' : 'auto'
            }
          >
            {signedInReady ? (
              <AppNavigator
                onPrepared={onShellPrepared}
                transitionReady={startupComplete}
              />
            ) : (
              <AuthNavigator />
            )}
          </View>
          {startupComplete && sessionPreparing && <CenteredSpinner overlay />}
          <LogoutToast />
        </ImageBackground>
      </NavigationContainer>
    </View>
  );
}
