import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { AppStartupProvider, useAppStartup } from '../AppStartupProvider';

let startup: ReturnType<typeof useAppStartup>;
function Probe() {
  startup = useAppStartup();
  return <Text>Prepared app</Text>;
}

it('keeps one logo across child hydration/remounts and never restores it after completion', () => {
  const screen = (ready: boolean, session: string) => (
    <AppStartupProvider>{ready && <Probe key={session} />}</AppStartupProvider>
  );
  const view = render(screen(false, 'cold'));
  const logo = view.getByTestId('app-launch-logo');
  expect(logo.props.fadeDuration).toBe(0);
  expect(logo.props.defaultSource).toEqual(logo.props.source);
  view.rerender(screen(true, 'cold'));
  expect(view.getByTestId('app-launch-logo')).toBe(logo);
  view.rerender(screen(true, 'navigation-ready'));
  expect(view.getByTestId('app-launch-logo')).toBe(logo);
  act(() => startup.finish());
  expect(view.queryByTestId('app-launch-logo')).toBeNull();
  view.rerender(screen(false, 'login'));
  expect(view.queryByTestId('app-launch-logo')).toBeNull();
  view.rerender(screen(true, 'logout'));
  expect(startup.complete).toBe(true);
  expect(view.queryByTestId('app-launch-logo')).toBeNull();
});
