import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

type Props = {
  /** Pixel size of the spinner (default 48). */
  size?: number;
  /** Color of the spinner (default white). */
  color?: string;
  /** If true, renders as a full-screen overlay. */
  overlay?: boolean;
};

export default function CenteredSpinner({ size = 48, color = "#FFFFFF", overlay = false }: Props) {
  if (overlay) {
    return (
      <View style={styles.overlay}>
        <ActivityIndicator size={size} color={color} />
      </View>
    );
  }
  return (
    <View style={styles.center}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    // Optional subtle backdrop:
    // backgroundColor: "rgba(0,0,0,0.15)",
  },
});
