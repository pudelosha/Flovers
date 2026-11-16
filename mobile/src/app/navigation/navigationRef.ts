import { createNavigationContainerRef } from "@react-navigation/native";
import type { ParamListBase } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<ParamListBase>();
let pendingNavigation: { name: string; params?: any } | null = null;

export function navTo(name: string, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    pendingNavigation = { name, params };
  }
}

export function flushPendingNavigation() {
  if (!pendingNavigation || !navigationRef.isReady()) return;
  const pending = pendingNavigation;
  pendingNavigation = null;
  navTo(pending.name, pending.params);
}

export function clearPendingNavigation() {
  pendingNavigation = null;
}
