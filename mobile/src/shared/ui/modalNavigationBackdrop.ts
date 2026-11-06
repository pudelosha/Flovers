import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { NavigationContext } from '@react-navigation/native';

export const DARK_MODAL_BACKGROUND = '#242824';
const NavigationContextOrFallback = NavigationContext ?? createContext<any>(undefined);
const owners = new Set<symbol>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const snapshot = () => owners.size > 0;
const notify = () => listeners.forEach(listener => listener());

/** Paint behind rounded navigation only while a visible, focused modal needs it. */
export function useModalNavigationBackdrop(active: boolean) {
  const owner = useRef(Symbol('modal-navigation-background')).current;
  const navigation = useContext(NavigationContextOrFallback);
  const subscribeFocus = useCallback((listener: () => void) => {
    if (!navigation?.addListener) return () => {};
    const offFocus = navigation.addListener('focus', listener);
    const offBlur = navigation.addListener('blur', listener);
    return () => { offFocus(); offBlur(); };
  }, [navigation]);
  const focusSnapshot = useCallback(() => navigation?.isFocused?.() ?? true, [navigation]);
  const focused = useSyncExternalStore(subscribeFocus, focusSnapshot, focusSnapshot);
  useEffect(() => {
    if (!active || !focused) return;
    owners.add(owner);
    notify();
    return () => { owners.delete(owner); notify(); };
  }, [active, focused, owner]);
}

export function useModalNavigationBackdropVisible() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
