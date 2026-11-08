import React, { createContext, useContext } from 'react';
import { Animated, StyleSheet, View } from '../theme/native';
import CenteredSpinner from './CenteredSpinner';

export const HeaderContentReadyContext = createContext(true);
export const HeaderStartupCompleteContext = createContext(true);
export const HeaderHeightContext = createContext<Animated.Value | null>(null);
export const HeaderTargetHeightContext = createContext(0);
export const useHeaderContentReady = () =>
  useContext(HeaderContentReadyContext);

/** Keep native layout and data fetching active while header preparation finishes. */
export function HeaderContentGate({ children }: { children: React.ReactNode }) {
  const ready = useHeaderContentReady();
  const startupComplete = useContext(HeaderStartupCompleteContext);
  const targetHeight = useContext(HeaderTargetHeightContext);
  return (
    <View style={{ flex: 1 }}>
      <View
        testID="header-content-gate"
        style={{ flex: 1, opacity: ready ? 1 : 0 }}
        pointerEvents={ready ? 'auto' : 'none'}
        accessibilityElementsHidden={!ready}
        importantForAccessibility={ready ? 'auto' : 'no-hide-descendants'}
      >
        {children}
      </View>
      {!ready && startupComplete && (
        <View
          testID="header-transition-spinner"
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              top: targetHeight,
              bottom: 0,
            },
          ]}
        >
          <CenteredSpinner size={56} />
        </View>
      )}
    </View>
  );
}
