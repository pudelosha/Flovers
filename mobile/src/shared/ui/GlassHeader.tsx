import React, { PropsWithChildren } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// Safe fallback if gradient lib isn't installed
let LinearGradientView: any = View;
try {
  LinearGradientView = require("react-native-linear-gradient").default;
} catch {}

/** Optional props to tweak tint; matches your current headers by default */
const DEFAULT_GRADIENT = ["rgba(5,31,24,0.70)", "rgba(16,80,63,0.70)"];
const DEFAULT_FALLBACK = "rgba(10,51,40,0.70)";

type RightAction = {
  icon: string;                  // e.g. "qrcode-scan"
  onPress: () => void;
  accessibilityLabel?: string;
};

type Props = PropsWithChildren<{
  title: string;
  rightAction?: RightAction;     // scanner etc.
  gradientColors?: string[];
  fallbackColor?: string;
  topPaddingExtra?: number;      // default +10 like your screens
  showSeparator?: boolean;       // default true
}>;

/**
 * GlassHeader
 * - Title row with optional right-side icon
 * - Thin separator
 * - Submenu row passed as children (so pages decide their own buttons/tabs)
 */
export default function GlassHeader({
  title,
  rightAction,
  children,
  gradientColors = DEFAULT_GRADIENT,
  fallbackColor = DEFAULT_FALLBACK,
  topPaddingExtra = 10,
  showSeparator = true,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradientView
      colors={gradientColors}
      locations={[0, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[s.headerBar, { paddingTop: insets.top + topPaddingExtra, backgroundColor: fallbackColor }]}
    >
      <View style={s.headerTopRow}>
        <Text style={s.headerTitle} numberOfLines={1}>{title}</Text>

        {/* Right-side action bubble (optional) */}
        {rightAction ? (
          <Pressable
            onPress={rightAction.onPress}
            style={s.iconBtn}
            android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true }}
            accessibilityRole="button"
            accessibilityLabel={rightAction.accessibilityLabel ?? title + " action"}
            hitSlop={8}
          >
            <MaterialCommunityIcons name={rightAction.icon} size={20} color="#FFFFFF" />
          </Pressable>
        ) : (
          // keep layout consistent when no action present
          <View style={{ width: 36, height: 36 }} />
        )}
      </View>

      {showSeparator && <View style={s.separator} />}

      {/* Submenu content (tabs, buttons, etc.) */}
      {children}
    </LinearGradientView>
  );
}

const s = StyleSheet.create({
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  iconBtn: {
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
