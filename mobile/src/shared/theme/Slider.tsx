import React from 'react';
import Slider from '@react-native-community/slider';
import { useAppTheme } from './ThemeContext';
export default function ThemeSlider(
  props: React.ComponentProps<typeof Slider>,
) {
  const { isLight } = useAppTheme();
  return (
    <Slider
      {...props}
      {...(isLight
        ? {
            minimumTrackTintColor: '#078573',
            maximumTrackTintColor: '#BCD9CB',
            thumbTintColor: '#0B7285',
          }
        : {})}
    />
  );
}
