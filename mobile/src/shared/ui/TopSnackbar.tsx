// C:\Projekty\Python\Flovers\mobile\src\shared\ui\TopSnackbar.tsx
import React from "react";
import { StyleSheet } from "react-native";
import { Portal, Snackbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  duration?: number;
  variant?: "default" | "success" | "error";
};

export default function TopSnackbar({
  visible,
  message,
  onDismiss,
  duration = 3000,
  variant = "default",
}: Props) {
  const insets = useSafeAreaInsets();

  // unify success with default so both pages look the same
  const DEFAULT_TEAL = "#0A5161";
  const ERROR_RED = "rgba(255,107,107,1)";

  const bg = variant === "error" ? ERROR_RED : DEFAULT_TEAL;

  if (!visible) return null;

  return (
    <Portal>
      <Snackbar
        visible={visible}
        onDismiss={onDismiss}
        duration={duration}
        style={[styles.snack, { backgroundColor: bg }]}
        wrapperStyle={[
          styles.wrapper,
          { top: Math.max(8, insets.top + 8) },
        ]}
      >
        {message}
      </Snackbar>
    </Portal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    elevation: 9999,
    pointerEvents: "box-none",
  },
  snack: {
    borderRadius: 24,
    opacity: 1,
  },
});
