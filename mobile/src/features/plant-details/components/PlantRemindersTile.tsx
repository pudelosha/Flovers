// C:\Projekty\Python\Flovers\mobile\src\features\plant-details\components\PlantRemindersTile.tsx
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";

import { s } from "../styles/plant-details.styles";
import { TILE_BLUR } from "../constants/plant-details.constants";
import type { PlantReminderSummary } from "../types/plant-details.types";

import {
  ACCENT_BY_TYPE,
  ICON_BY_TYPE,
} from "../../reminders/constants/reminders.constants";

import PlantReminderMenu from "./PlantReminderMenu";

/* ----- helpers (mirrors Reminders tile) ----- */
function toDisplayType(t?: string) {
  const x = (t || "").toLowerCase();
  if (x === "water" || x === "watering") return "watering";
  if (x === "fertilize" || x === "fertilising" || x === "fertilizing")
    return "fertilising";
  if (x === "moisture" || x === "misting") return "moisture";
  if (x === "care") return "care";
  if (x === "repot" || x === "repotting") return "repot";
  return "care";
}

function hexToRgba(hex?: string, alpha = 1) {
  const fallback = `rgba(0,0,0,${alpha})`;
  if (!hex || typeof hex !== "string") return fallback;
  let h = hex.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return fallback;
  const bigint = parseInt(h, 16);
  if (Number.isNaN(bigint)) return fallback;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
/* --------------------------------------------- */

type Props = {
  reminders: PlantReminderSummary[];

  // navigation / actions
  onMarkComplete: (reminderId: string) => void;
  onEditReminder: (reminderId: string) => void;
  onShowHistory: (reminderId: string) => void;
};

export default function PlantRemindersTile({
  reminders,
  onMarkComplete,
  onEditReminder,
  onShowHistory,
}: Props) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const toggleMenu = (id: string) => {
    setMenuOpenId((curr) => (curr === id ? null : id));
  };

  if (!reminders || reminders.length === 0) {
    return null;
  }

  return (
    <View style={styles.cardWrap}>
      {/* Glass background */}
      <View style={s.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={TILE_BLUR}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
        />
        <View pointerEvents="none" style={s.cardTint} />
        <View pointerEvents="none" style={s.cardBorder} />
      </View>

      <View style={styles.inner}>
        {/* Header */}
        <Text style={styles.title}>Reminders</Text>

        {/* Reminder rows */}
        {reminders.map((r) => {
          const displayType = toDisplayType(r.type);
          const accent = ACCENT_BY_TYPE[displayType] || "#7DE2A7";
          const icon = ICON_BY_TYPE[displayType] ?? "calendar";

          const isOpen = menuOpenId === r.id;

          return (
            <View
              key={r.id}
              style={[styles.row, isOpen && styles.rowRaised]}
            >
              <View style={styles.left}>
                <View
                  style={[
                    styles.iconBubble,
                    { backgroundColor: hexToRgba("#000", 0.15) },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={icon}
                    size={20}
                    color={accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.typeText, { color: accent }]}
                    numberOfLines={1}
                  >
                    {displayType.toUpperCase()}
                  </Text>
                  <Text style={styles.whenText} numberOfLines={1}>
                    {r.when}
                  </Text>
                </View>
              </View>

              {/* Right: 3-dot menu button */}
              <View style={styles.right}>
                <Pressable
                  onPress={() => toggleMenu(r.id)}
                  style={styles.menuBtn}
                  android_ripple={{
                    color: "rgba(255,255,255,0.16)",
                    borderless: true,
                  }}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons
                    name="dots-horizontal"
                    size={20}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>

              {/* Floating menu – positioned relative to the row */}
              {isOpen && (
                <PlantReminderMenu
                  onMarkComplete={() => {
                    setMenuOpenId(null);
                    onMarkComplete(r.id);
                  }}
                  onEdit={() => {
                    setMenuOpenId(null);
                    onEditReminder(r.id);
                  }}
                  onShowHistory={() => {
                    setMenuOpenId(null);
                    onShowHistory(r.id);
                  }}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    borderRadius: 28,
    overflow: "visible",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    marginBottom: 14,
  },
  inner: {
    padding: 16,
  },
  title: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 8,
  },
  row: {
    position: "relative",
    overflow: "visible",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  rowRaised: {
    zIndex: 30,
    elevation: 30,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    columnGap: 10,
  },
  right: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  typeText: {
    fontWeight: "800",
    fontSize: 13,
  },
  whenText: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 2,
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
