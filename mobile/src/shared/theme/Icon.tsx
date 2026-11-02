import React, { useContext } from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme, ContrastContext } from './ThemeContext';
import { themeColor } from './palette';
import { resolveStyle } from './native';
export default function ThemedIcon(props: React.ComponentProps<typeof Icon>) {
  const { isLight } = useAppTheme();
  const contrast = useContext(ContrastContext);
  return (
    <Icon
      {...props}
      color={themeColor(props.color, 'foreground', isLight, contrast)}
      style={resolveStyle(props.style, isLight, contrast)}
    />
  );
}
