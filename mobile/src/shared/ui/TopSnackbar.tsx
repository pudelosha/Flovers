import React from "react";
import { StyleSheet } from "react-native";
import { Portal, Snackbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  /** Show/hide the toast */
  visible: boolean;
  /** Message to display */
  message: string;
  /** Dismiss handler */
  onDismiss: () => void;
  /** ms, default 3000 */
  duration?: number;
  /** Visual intent */
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

  const bg =
    variant === "success"
      ? "rgba(11,114,133,0.95)"
      : variant === "error"
      ? "rgba(255,107,107,0.95)"
      : "#0a5161";

  return (
    <Portal>
      <Snackbar
        visible={visible}
        onDismiss={onDismiss}
        duration={duration}
        style={[styles.snack, { backgroundColor: bg }]}
        wrapperStyle={[
          styles.wrapper,
          {
            top: Math.max(8, insets.top + 8),
          },
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
  },
  snack: {
    borderRadius: 24,
  },
});
