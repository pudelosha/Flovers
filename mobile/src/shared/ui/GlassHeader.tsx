import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// gradient with safe fallback to View
let LinearGradientView: any = View;
try {
  LinearGradientView = require("react-native-linear-gradient").default;
} catch {}

type Props = {
  title: string;
  gradientColors: string[];
  solidFallback: string;
  rightIconName?: string;
  onPressRight?: () => void;
  /** NEW: show/hide the thin divider under the title (default true) */
  showSeparator?: boolean;
  children?: React.ReactNode;
};

export default function GlassHeader({
  title,
  gradientColors,
  solidFallback,
  rightIconName,
  onPressRight,
  showSeparator = true,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradientView
      colors={gradientColors}
      locations={[0, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[styles.headerBar, { paddingTop: insets.top + 10, backgroundColor: solidFallback }]}
    >
      <View style={styles.headerTopRow}>
        <Text style={styles.headerTitle}>{title}</Text>
        {rightIconName ? (
          <Pressable
            onPress={onPressRight}
            style={styles.scanBtn}
            android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}
          >
            <MaterialCommunityIcons name={rightIconName} size={20} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={{ width: 36, height: 36 }} />
        )}
      </View>

      {showSeparator && <View style={styles.separator} />}

      {children}
    </LinearGradientView>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  scanBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
});
