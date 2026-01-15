// src/features/task-history/components/TaskHistoryTile.tsx
import React, { useState, useMemo, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";

import { s } from "../styles/task-history.styles";
import type { TaskHistoryItem } from "../types/task-history.types";
import { ACCENT_BY_TYPE, ICON_BY_TYPE } from "../../home/constants/home.constants";
import type { TaskType } from "../../home/types/home.types";
import { useSettings } from "../../../app/providers/SettingsProvider";

// --- helpers (mirrors ReminderTile) ---
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

function formatDateWithPattern(d: Date | string, pattern: string): string {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(+dt)) return "";

  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();

  const fmt = pattern && typeof pattern === "string" ? pattern : "DD.MM.YYYY";

  return fmt.replace("YYYY", String(yyyy)).replace("MM", mm).replace("DD", dd);
}

// EXACT SAME green tones as AuthCard / Reminders / Plants
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

type Props = {
  item: TaskHistoryItem;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  // optional callbacks
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
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(false);
  const [noteHeight, setNoteHeight] = useState(0);
  const anim = useRef(new Animated.Value(0)).current; // 0 = collapsed, 1 = expanded

  const { settings } = useSettings();
  const dateFormat = settings.dateFormat || "DD.MM.YYYY";

  const type = item.type as TaskType;
  const displayType = toDisplayType(type as any);
  const accent = ACCENT_BY_TYPE[displayType];
  const icon = ICON_BY_TYPE[displayType] ?? "calendar-check";

  const completedLabel = useMemo(
    () => formatDateWithPattern(item.completedAt, dateFormat),
    [item.completedAt, dateFormat]
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
    if (expanded) collapse();
    else expand();
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
    outputRange: [0, 6],
  });

  const handleDelete = () => {
    onToggleMenu();
    if (onDelete) onDelete(item);
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

  const typeLabel = t(`taskHistory.types.${displayType}`, {
    defaultValue: displayType,
  });

  return (
    <View style={[s.cardWrap, isMenuOpen && s.cardWrapRaised]}>
      {/* Glass stack: AuthCard-matching gradients + tint + border */}
      <View style={s.cardGlass}>
        {/* Base green gradient: EXACT match to AuthCard */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        {/* Fog highlight: EXACT match to AuthCard */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={[
            "rgba(255, 255, 255, 0.06)",
            "rgba(255, 255, 255, 0.02)",
            "rgba(255, 255, 255, 0.08)",
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Accent wash: left (accent) -> right (AuthCard dark) */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={[
            hexToRgba(accent, 0.34),
            hexToRgba(accent, 0.18),
            hexToRgba(accent, 0.06),
            TAB_GREEN_DARK,
          ]}
          locations={[0, 0.28, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Unified tint/border (same as other screens) */}
        <View pointerEvents="none" style={s.cardTint} />
        <View pointerEvents="none" style={s.cardBorder} />
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
            <View style={[s.leftIconBubble, { backgroundColor: hexToRgba("#000000", 0.15) }]}>
              <MaterialCommunityIcons name={icon} size={20} color={accent} />
            </View>
            <Text style={[s.leftCaption, { color: accent }]}>
              {typeLabel.toUpperCase()}
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
                {t("taskHistory.tile.completedOn", { date: completedLabel })}
              </Text>
            )}

            {hasNote && (
              <>
                {/* Invisible measurement copy */}
                <View
                  style={styles.noteMeasureWrapper}
                  pointerEvents="none"
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    if (h > 0 && h !== noteHeight) setNoteHeight(h);
                  }}
                >
                  <View style={s.noteBox}>
                    <Text style={s.noteLabel}>{t("taskHistory.tile.noteLabel")}</Text>
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
                    <Text style={s.noteLabel}>{t("taskHistory.tile.noteLabel")}</Text>
                    <Text style={s.noteText}>{item.note}</Text>
                  </View>
                </Animated.View>
              </>
            )}
          </View>
        </Pressable>

        {/* Right: 3-dot menu */}
        <View style={s.rightCol}>
          <Pressable
            onPress={onToggleMenu}
            style={s.menuBtn}
            android_ripple={{ color: "rgba(255,255,255,0.16)", borderless: true }}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* Inline menu */}
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
              <Text style={s.menuItemText}>{t("taskHistory.menu.expand")}</Text>
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
              <Text style={s.menuItemText}>{t("taskHistory.menu.collapse")}</Text>
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
            <Text style={s.menuItemText}>{t("taskHistory.menu.editReminder")}</Text>
          </Pressable>

          {/* Go to plant */}
          <Pressable style={s.menuItem} onPress={handleGoToPlant}>
            <MaterialCommunityIcons
              name="flower-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={s.menuItemText}>{t("taskHistory.menu.goToPlant")}</Text>
          </Pressable>

          {/* Delete – last & red */}
          <Pressable style={s.menuItem} onPress={handleDelete}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={18}
              color="#FF6B6B"
              style={{ marginRight: 8 }}
            />
            <Text style={[s.menuItemText, { color: "#FF6B6B", fontWeight: "800" }]}>
              {t("taskHistory.menu.deleteTask")}
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
    paddingTop: 8,
    paddingBottom: 4,
  },
});
