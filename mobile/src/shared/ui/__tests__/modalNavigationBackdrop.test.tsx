import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { NavigationContext } from '@react-navigation/native';
import { useModalNavigationBackdrop, useModalNavigationBackdropVisible } from '../modalNavigationBackdrop';

it('shows the navigation background only for an open modal and removes it on close', () => {
  const hook = renderHook<boolean, { active: boolean }>(({ active }) => {
    useModalNavigationBackdrop(active);
    return useModalNavigationBackdropVisible();
  }, { initialProps: { active: false } });
  expect(hook.result.current).toBe(false);
  hook.rerender({ active: true });
  expect(hook.result.current).toBe(true);
  hook.rerender({ active: false });
  expect(hook.result.current).toBe(false);
});

it('keeps the background until the last nested modal closes', () => {
  const observer = renderHook(() => useModalNavigationBackdropVisible());
  const first = renderHook(() => useModalNavigationBackdrop(true));
  const second = renderHook(() => useModalNavigationBackdrop(true));
  expect(observer.result.current).toBe(true);
  first.unmount();
  expect(observer.result.current).toBe(true);
  second.unmount();
  expect(observer.result.current).toBe(false);
});

it('does not leave a modal background on another screen after navigation', () => {
  let focused = true;
  const events = new Map<string, () => void>();
  const navigation = {
    isFocused: () => focused,
    addListener: (event: string, listener: () => void) => {
      events.set(event, listener);
      return () => { events.delete(event); };
    },
  };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NavigationContext.Provider value={navigation as any}>{children}</NavigationContext.Provider>
  );
  const hook = renderHook(() => {
    useModalNavigationBackdrop(true);
    return useModalNavigationBackdropVisible();
  }, { wrapper });
  expect(hook.result.current).toBe(true);
  act(() => { focused = false; events.get('blur')?.(); });
  expect(hook.result.current).toBe(false);
  act(() => { focused = true; events.get('focus')?.(); });
  expect(hook.result.current).toBe(true);
});
