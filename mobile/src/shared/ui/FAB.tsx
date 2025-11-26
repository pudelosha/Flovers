import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

export type FabAction = {
  key: string;
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

type Props = {
  actions: FabAction[];
  /**
   * How far above the bottom to place the FAB (to clear the tab bar).
   */
  bottomOffset?: number;
  /** Horizontal margin from the edge (left or right, depending on position). */
  rightOffset?: number;
  /** Horizontal position: "left" or "right". Defaults to "right". */
  position?: "left" | "right";
};

export default function FAB({
  actions,
  bottomOffset = 92,
  rightOffset = 16,
  position = "right",
}: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  // Anchor the FAB container to the correct side
  const horizontalStyle =
    position === "left" ? { left: rightOffset } : { right: rightOffset };

  // Keep children anchored to the same side so the main FAB doesn't move
  const wrapAlignItems = position === "left" ? "flex-start" : "flex-end";

  // Action row alignment (labels/icons within each row)
  const rowJustify =
    position === "left" ? "flex-start" : "flex-end";

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]}
    >
      {/* Backdrop only when open */}
      {open && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setOpen(false)}
        />
      )}

      {/* FAB container */}
      <View
        pointerEvents="box-none"
        style={[
          s.wrap,
          horizontalStyle,
          { bottom: insets.bottom + bottomOffset, alignItems: wrapAlignItems },
        ]}
      >
        {/* Actions list (stacked upwards) */}
        {open && (
          <View style={s.actionsWrap} pointerEvents="box-none">
            {actions.map((a) => (
              <Pressable
                key={a.key}
                onPress={() => {
                  setOpen(false);
                  requestAnimationFrame(() => a.onPress());
                }}
                style={[s.actionRow, { justifyContent: rowJustify }]}
              >
                {/* When on the right, label on left, icon on right (original) */}
                {/* When on the left, icon on left, label on right */}
                {position === "left" ? (
                  <>
                    <View style={[s.miniBtn, a.danger && s.miniBtnDanger]}>
                      <MaterialCommunityIcons
                        name={a.icon}
                        size={20}
                        color={a.danger ? "#FF6B6B" : "#FFFFFF"}
                      />
                    </View>
                    <View style={[s.labelPill, a.danger && s.labelDanger]}>
                      <Text
                        style={[s.labelText, a.danger && s.labelTextDanger]}
                      >
                        {a.label}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[s.labelPill, a.danger && s.labelDanger]}>
                      <Text
                        style={[s.labelText, a.danger && s.labelTextDanger]}
                      >
                        {a.label}
                      </Text>
                    </View>
                    <View style={[s.miniBtn, a.danger && s.miniBtnDanger]}>
                      <MaterialCommunityIcons
                        name={a.icon}
                        size={20}
                        color={a.danger ? "#FF6B6B" : "#FFFFFF"}
                      />
                    </View>
                  </>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Main FAB */}
        <Pressable
          onPress={() => setOpen((v) => !v)}
          android_ripple={{ color: "rgba(255,255,255,0.2)", borderless: true }}
          style={s.mainFab}
        >
          <MaterialCommunityIcons
            name={open ? "close" : "plus"}
            size={26}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
  },

  // MAIN FAB
  mainFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,114,133,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    // soft shadow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 10 },
    }),
  },

  // ACTIONS
  actionsWrap: {
    marginBottom: 10,
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  miniBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  miniBtnDanger: {
    backgroundColor: "rgba(255,107,107,0.12)",
    borderColor: "rgba(255,107,107,0.35)",
  },
  labelPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  labelDanger: {
    backgroundColor: "rgba(255,107,107,0.18)",
    borderColor: "rgba(255,107,107,0.35)",
  },
  labelText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  labelTextDanger: { color: "#FF6B6B" },
});
