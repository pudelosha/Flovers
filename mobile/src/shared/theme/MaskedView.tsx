import React from 'react';
import MaskedView from '@react-native-masked-view/masked-view';
import { useAppTheme, ThemeContrastScope } from './ThemeContext';
export default function ThemedMaskedView({
  maskElement,
  ...props
}: React.ComponentProps<typeof MaskedView>) {
  const { isLight } = useAppTheme();
  if (!isLight) return <MaskedView {...props} maskElement={maskElement} />;
  return (
    <MaskedView
      {...props}
      maskElement={
        <ThemeContrastScope kind="mask">{maskElement}</ThemeContrastScope>
      }
    />
  );
}
