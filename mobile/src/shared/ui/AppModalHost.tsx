import React, { createContext, useContext } from 'react';
import { StyleSheet, View } from "../theme/native";
import { bottomNavigationHeight } from '../constants/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ModalHostContext = createContext(false);

/** Reserve navigation space once, even when a frame is used inside an existing host. */
export default function AppModalHost({
  children,
  reserveBottomBar = true,
}: {
  children: React.ReactNode;
  reserveBottomBar?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const hosted = useContext(ModalHostContext);
  if (hosted) return <>{children}</>;
  return (
    <ModalHostContext.Provider value>
      <View
        testID="app-modal-host"
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFill,
          {
            bottom: reserveBottomBar ? bottomNavigationHeight(insets.bottom) : 0,
            zIndex: 6000,
            elevation: 6000,
          },
        ]}
      >
        {children}
      </View>
    </ModalHostContext.Provider>
  );
}
