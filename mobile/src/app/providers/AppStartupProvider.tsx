import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import LaunchScreen from '../../shared/ui/LaunchScreen';

const AppStartupContext = createContext<{
  complete: boolean;
  finish: () => void;
} | null>(null);

/** One logo image survives language, authentication and navigation hydration. */
export function AppStartupProvider({ children }: React.PropsWithChildren) {
  const [complete, setComplete] = useState(false);
  const finish = useCallback(() => setComplete(true), []);
  const value = useMemo(() => ({ complete, finish }), [complete, finish]);
  return (
    <AppStartupContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {!complete && <LaunchScreen />}
      </View>
    </AppStartupContext.Provider>
  );
}

export function useAppStartup() {
  const startup = useContext(AppStartupContext);
  if (!startup) throw new Error('AppStartupProvider is required');
  return startup;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
