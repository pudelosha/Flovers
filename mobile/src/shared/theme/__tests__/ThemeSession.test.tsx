import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { AppThemeProvider } from '../AppThemeProvider';
import { useAppTheme } from '../ThemeContext';
let mockToken: any = 'session';
let mockTheme = 'light';
jest.mock('../../../app/providers/useAuth', () => ({
  useAuth: () => ({ token: mockToken }),
}));
jest.mock('../../../app/providers/SettingsProvider', () => ({
  useSettings: () => ({ settings: { theme: mockTheme } }),
}));
function Probe() {
  const theme = useAppTheme();
  return <Text testID="theme">{theme.isLight ? 'light' : 'dark'}</Text>;
}
it('changes appearance live and always restores floral Dark before login', () => {
  const ui = render(
    <AppThemeProvider>
      <Probe />
    </AppThemeProvider>,
  );
  expect(ui.getByTestId('theme').props.children).toBe('light');
  mockTheme = 'dark';
  ui.rerender(
    <AppThemeProvider>
      <Probe />
    </AppThemeProvider>,
  );
  expect(ui.getByTestId('theme').props.children).toBe('dark');
  mockTheme = 'light';
  mockToken = null;
  ui.rerender(
    <AppThemeProvider>
      <Probe />
    </AppThemeProvider>,
  );
  expect(ui.getByTestId('theme').props.children).toBe('dark');
});
