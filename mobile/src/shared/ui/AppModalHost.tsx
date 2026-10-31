import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Common dialog bounds: fill the app while leaving its bottom navigation visible. */
export default function AppModalHost({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, {
    bottom: 64 + Math.max(insets.bottom, 10), zIndex: 6000, elevation: 6000,
  }]}>{children}</View>;
}
