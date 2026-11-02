import React, { useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';
import { useAppTheme } from './ThemeContext';
export default function SystemBars() {
  const { isLight } = useAppTheme();
  useEffect(() => {
    if (Platform.OS === 'android')
      NativeModules.FloversSystemBars?.setLightAppearance(isLight);
  }, [isLight]);
  return null;
}
