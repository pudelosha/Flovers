// C:\Projekty\Python\Flovers\mobile\src\features\task-history\components\TaskHistoryTile.tsx
import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { BlurView } from "@react-native-community/blur";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { s } from "../styles/task-history.styles";
import type { TaskHistoryItem } from "../types/task-history.types";
import { ACCENT_BY_TYPE, ICON_BY_TYPE } from "../../home/constants/home.constants";
import type { TaskType } from "../../home/types/home.types";

// --- helpers (mirrors ReminderTile) ---
function toDisplayType(t?: string) {
  const x = (t || "").toLowerCase();
  if (x === "water" || x === "watering") return "watering";
  if (x === "fertilize" || x === "fertilising" || x === "fertilizing") return "fertilising";
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

function formatCompletedAt(v?: string) {
  if (!v) return "";
  const d = new Date(v);
  if (!(d instanceof Date) || isNaN(+d)) {
    // already display-ready
    return v;
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

type Props = {
  item: TaskHistoryItem;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  // optional callbacks, can be wired up later from the screen
  onDelete?: (item: TaskHistoryItem) => void;
  onEditReminder?: (item: TaskHistoryItem) => void;
  onGoToPlant?: (item: TaskHistoryItem) => void;
};

export default function TaskHistoryTile({
  item,
  isMenuOpen,
  onToggleMenu,
  onDelete,
  onEditReminder,
  onGoToPlant,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [noteHeight, setNoteHeight] = useState(0);
  const anim = useRef(new Animated.Value(0)).current; // 0 = collapsed, 1 = expanded

  const type = item.type as TaskType;
  const displayType = toDisplayType(type as any);
  const accent = ACCENT_BY_TYPE[displayType];
  const icon = ICON_BY_TYPE[displayType] ?? "calendar-check";

  const completedLabel = useMemo(
    () => formatCompletedAt(item.completedAt),
    [item.completedAt]
  );

  const hasNote = !!item.note && item.note.trim().length > 0;

  const animateTo = (value: 0 | 1) => {
    Animated.timing(anim, {
      toValue: value,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // animating height/margin
    }).start();
  };

  const expand = () => {
    if (!hasNote || expanded) return;
    setExpanded(true);
    animateTo(1);
  };

  const collapse = () => {
    if (!hasNote || !expanded) return;
    setExpanded(false);
    animateTo(0);
  };

  const onToggleBody = () => {
    if (!hasNote) return;
    if (expanded) {
      collapse();
    } else {
      expand();
    }
  };

  const animatedHeight =
    noteHeight > 0
      ? anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, noteHeight],
        })
      : 0;

  const animatedOpacity = anim;
  const animatedMarginTop = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6], // subtle extra spacing when expanded
  });

  const handleDelete = () => {
    onToggleMenu();
    if (onDelete) {
      onDelete(item);
    }
  };

  const handleExpandFromMenu = () => {
    onToggleMenu();
    expand();
  };

  const handleCollapseFromMenu = () => {
    onToggleMenu();
    collapse();
  };

  const handleEditReminder = () => {
    onToggleMenu();
    if (onEditReminder) onEditReminder(item);
  };

  const handleGoToPlant = () => {
    onToggleMenu();
    if (onGoToPlant) onGoToPlant(item);
  };

  return (
    <View style={[s.cardWrap, isMenuOpen && s.cardWrapRaised]}>
      {/* Glass stack: identical to Reminders tiles */}
      <View style={s.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={20}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
        />
        <View pointerEvents="none" style={s.cardTint} />
        <View pointerEvents="none" style={s.cardBorder} />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: hexToRgba(accent, 0.1), zIndex: 1 },
          ]}
        />
      </View>

      <View style={[s.cardRow, !expanded && hasNote && styles.compactRow]}>
        {/* BODY (pressable): left + center – expands/collapses */}
        <Pressable
          style={styles.bodyPressable}
          onPress={onToggleBody}
          android_ripple={{ color: "rgba(255,255,255,0.10)" }}
        >
          {/* Left: icon + type label */}
          <View style={s.leftCol}>
            <View
              style={[
                s.leftIconBubble,
                { backgroundColor: hexToRgba("#000000", 0.15) },
              ]}
            >
              <MaterialCommunityIcons name={icon} size={20} color={accent} />
            </View>
            <Text style={[s.leftCaption, { color: accent }]}>
              {displayType.toUpperCase()}
            </Text>
          </View>

          {/* Center: plant + location + completed date + animated note */}
          <View style={s.centerCol}>
            <Text style={s.plantName} numberOfLines={1}>
              {item.plant}
            </Text>
            {!!item.location && (
              <Text style={s.location} numberOfLines={1}>
                {item.location}
              </Text>
            )}
            {!!completedLabel && (
              <Text style={s.metaCompact} numberOfLines={1}>
                Completed on {completedLabel}
              </Text>
            )}

            {hasNote && (
              <>
                {/* Invisible measurement copy: same styles, off-layout visually */}
                <View
                  style={styles.noteMeasureWrapper}
                  pointerEvents="none"
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    if (h > 0 && h !== noteHeight) {
                      setNoteHeight(h);
                    }
                  }}
                >
                  <View style={s.noteBox}>
                    <Text style={s.noteLabel}>Note</Text>
                    <Text style={s.noteText}>{item.note}</Text>
                  </View>
                </View>

                {/* Animated visible note */}
                <Animated.View
                  style={[
                    s.noteContainer,
                    {
                      height: animatedHeight,
                      opacity: animatedOpacity,
                      marginTop: animatedMarginTop,
                    },
                  ]}
                >
                  <View style={s.noteBox}>
                    <Text style={s.noteLabel}>Note</Text>
                    <Text style={s.noteText}>{item.note}</Text>
                  </View>
                </Animated.View>
              </>
            )}
          </View>
        </Pressable>

        {/* Right: 3-dot menu (same position as Reminders) */}
        <View style={s.rightCol}>
          <Pressable
            onPress={onToggleMenu}
            style={s.menuBtn}
            android_ripple={{ color: "rgba(255,255,255,0.16)", borderless: true }}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="dots-horizontal"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </View>

      {/* Inline menu – same positioning as ReminderMenu */}
      {isMenuOpen && (
        <View style={s.menuSheet}>
          {/* Expand / Collapse (first, only if there is a note) */}
          {hasNote && !expanded && (
            <Pressable style={s.menuItem} onPress={handleExpandFromMenu}>
              <MaterialCommunityIcons
                name="unfold-more-horizontal"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={s.menuItemText}>Expand</Text>
            </Pressable>
          )}

          {hasNote && expanded && (
            <Pressable style={s.menuItem} onPress={handleCollapseFromMenu}>
              <MaterialCommunityIcons
                name="unfold-less-horizontal"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={s.menuItemText}>Collapse</Text>
            </Pressable>
          )}

          {/* Edit reminder */}
          <Pressable style={s.menuItem} onPress={handleEditReminder}>
            <MaterialCommunityIcons
              name="pencil-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={s.menuItemText}>Edit reminder</Text>
          </Pressable>

          {/* Go to plant */}
          <Pressable style={s.menuItem} onPress={handleGoToPlant}>
            <MaterialCommunityIcons
              name="flower-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={s.menuItemText}>Go to plant</Text>
          </Pressable>

          {/* Delete – last & red (like Reminders) */}
          <Pressable style={s.menuItem} onPress={handleDelete}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={18}
              color="#FF6B6B"
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                s.menuItemText,
                { color: "#FF6B6B", fontWeight: "800" },
              ]}
            >
              Delete
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bodyPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  noteMeasureWrapper: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
  },
  compactRow: {
    paddingTop: 8,   // keep same as base
    paddingBottom: 4 // only tighten bottom padding a bit
  },
});
