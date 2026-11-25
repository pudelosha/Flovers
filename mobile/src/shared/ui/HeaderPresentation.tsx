import React, { createContext, useContext } from 'react';
import { StyleSheet, View } from '../theme/native';
import CenteredSpinner from './CenteredSpinner';

export const HeaderContentReadyContext = createContext(true);
export const HeaderStartupCompleteContext = createContext(true);
export { HeaderHeightContext } from './headerLayoutContext';
export const HeaderTargetHeightContext = createContext(0);
export const useHeaderContentReady = () =>
  useContext(HeaderContentReadyContext);
const ScreenLoadingContext = createContext<((loading: boolean) => void) | null>(null);

/** Let the route keep one indicator alive across header and data loading. */
export function ScreenLoadingSpinner(props: React.ComponentProps<typeof CenteredSpinner>) {
  const setLoading = useContext(ScreenLoadingContext);
  React.useLayoutEffect(() => {
    setLoading?.(true);
    return () => setLoading?.(false);
  }, [setLoading]);
  if (!setLoading) return <CenteredSpinner {...props} />;
  return props.overlay ? null : <View style={{ flex: 1 }} />;
}

/** Keep native layout and data fetching active while header preparation finishes. */
export function HeaderContentGate({ children }: { children: React.ReactNode }) {
  const ready = useHeaderContentReady();
  const startupComplete = useContext(HeaderStartupCompleteContext);
  const targetHeight = useContext(HeaderTargetHeightContext);
  const [pageLoading, setPageLoading] = React.useState(false);
  const showSpinner = ready ? pageLoading : startupComplete;
  return (
    <View style={{ flex: 1 }}>
      <View
        testID="header-content-gate"
        style={{ flex: 1, opacity: ready ? 1 : 0 }}
        pointerEvents={ready ? 'auto' : 'none'}
        accessibilityElementsHidden={!ready}
        importantForAccessibility={ready ? 'auto' : 'no-hide-descendants'}
      >
        <ScreenLoadingContext.Provider value={setPageLoading}>
          {children}
        </ScreenLoadingContext.Provider>
      </View>
      {showSpinner && (
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
