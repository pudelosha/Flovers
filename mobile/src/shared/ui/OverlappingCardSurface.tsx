import React from 'react';
import { StyleSheet } from '../theme/native';
import LinearGradient from '../theme/Gradient';
import { useAppTheme } from '../theme/ThemeContext';

/** Lighter upper surface for a panel overlapping a standard glass card. */
export default function OverlappingCardSurface({
  testID,
}: {
  testID?: string;
}) {
  const { isLight, colors } = useAppTheme();
  return (
    <LinearGradient
      testID={testID}
      themeRole="photo"
      pointerEvents="none"
      colors={
        isLight
          ? [colors.surfaceAlt, colors.surface]
          : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.10)']
      }
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
