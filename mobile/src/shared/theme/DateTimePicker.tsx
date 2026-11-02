import React from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppTheme } from './ThemeContext';
export default function ThemedDateTimePicker(
  props: React.ComponentProps<typeof DateTimePicker>,
) {
  const { isLight } = useAppTheme();
  if (!isLight) return <DateTimePicker {...props} />;
  return (
    <DateTimePicker {...props} themeVariant={isLight ? 'light' : 'dark'} />
  );
}
