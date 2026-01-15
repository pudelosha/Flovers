import React, { useEffect, useMemo, useRef } from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";

import { s } from "../styles/home.styles";
import { ACCENT_BY_TYPE, ICON_BY_TYPE } from "../constants/home.constants";
import type { Task } from "../types/home.types";
import TaskMenu from "./TaskMenu";
import { useSettings } from "../../../app/providers/SettingsProvider";
import { useTranslation } from "react-i18next";

type Props = {
  task: Task;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onMarkComplete: () => void;
  onEdit: () => void;
  onGoToPlant: () => void;
  onShowHistory?: () => void;
  // Intentionally omit onDelete to remove the Delete action from the menu on Home
};

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Tile should end in the SAME dark-green tone as the tab bar's LEFT color,
// but slightly transparent to let the wallpaper/blur breathe through.
const TAB_BAR_DARK_LEFT_A09 = "rgba(5, 31, 24, 0.9)";

export default function TaskTile({
  task,
  isMenuOpen,
  onToggleMenu,
  onMarkComplete,
  onEdit,
  onGoToPlant,
  onShowHistory,
}: Props) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const accent = ACCENT_BY_TYPE[task.type];
  const icon = ICON_BY_TYPE[task.type];

  // Detect overdue by label text (e.g. "Overdue", "Overdue by 2 days")
  const isOverdue =
    typeof task.due === "string" && task.due.toLowerCase().includes("overdue");

  const formattedDate = formatDateWithPattern(task.dueDate, settings.dateFormat);

  // Pulse controller for overdue state: fades a red overlay in/out on the LEFT side only
  const pulse = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // stop any existing loop
    pulseLoopRef.current?.stop();
    pulseLoopRef.current = null;

    if (!isOverdue) {
      pulse.setValue(0);
      return;
    }

    // slow, subtle breathing pulse
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true, // animating opacity only
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
    };
  }, [isOverdue, pulse]);

  // Red overlay gradient (left -> transparent), opacity animated by `pulse`.
  // This makes the left side visually shift from task accent toward red while keeping the right side unchanged.
  const overdueOverlayColors = useMemo(
    () => [
      "rgba(255, 59, 48, 0.55)", // iOS-like red; strong on the left
      "rgba(255, 59, 48, 0.18)", // fade
      "rgba(255, 59, 48, 0.00)", // transparent toward the right
    ],
    []
  );

  return (
    <View style={[s.cardWrap, isMenuOpen && s.cardWrapRaised]}>
      {/* Glass stack with gradient fog background */}
      <View style={s.cardGlass}>
        {/* Base background: dark green with ~0.9 opacity */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: TAB_BAR_DARK_LEFT_A09,
              borderRadius: 28,
            },
          ]}
        />

        {/* Foggy glass effect overlay - very subtle */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={[
            "rgba(255, 255, 255, 0.06)", // Top-left subtle highlight
            "rgba(255, 255, 255, 0.02)", // Center
            "rgba(255, 255, 255, 0.08)", // Bottom-right subtle highlight
          ]}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Accent gradient: task-type color (left) -> tab dark green (right) */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={[
            hexToRgba(accent, 0.34), // Left: stronger task-type tint
            hexToRgba(accent, 0.18), // Mid-left
            hexToRgba(accent, 0.06), // Mid-right
            TAB_BAR_DARK_LEFT_A09, // Right: END at dark green (no light greens)
          ]}
          locations={[0, 0.28, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Overdue pulse overlay: red -> transparent, animated opacity */}
        {isOverdue && (
          <AnimatedLinearGradient
            pointerEvents="none"
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            colors={overdueOverlayColors}
            locations={[0, 0.28, 0.7]}
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: pulse, // 0..1
              },
            ]}
          />
        )}

        {/* Subtle border */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: 28,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
            },
          ]}
        />
      </View>

      {/* Content row */}
      <View style={[s.cardRow, { paddingVertical: 4 }]}>
        {/* Left: icon + caption */}
        <View style={s.leftCol}>
          <View
            style={[
              s.leftIconBubble,
              { backgroundColor: hexToRgba("#000", 0.15) },
            ]}
          >
            <MaterialCommunityIcons name={icon} size={20} color={accent} />
          </View>
          <Text style={[s.leftCaption, { color: accent }]}>
            {t(`home.taskTypes.${task.type}`)}
          </Text>
        </View>

        {/* Center: title, location, due */}
        <View style={s.centerCol}>
          <Text style={s.plantName} numberOfLines={1}>
            {task.plant}
          </Text>

          {task.location ? (
            <Text style={s.location} numberOfLines={1}>
              {task.location}
            </Text>
          ) : null}

          <View style={s.dueRow}>
            <Text style={[s.dueWhen, isOverdue && s.dueOverdue]}>{task.due}</Text>
            <Text style={[s.dueDateText, isOverdue && s.dueOverdue]}>
              {formattedDate}
            </Text>
          </View>
        </View>

        {/* Right: menu button */}
        <View style={s.rightCol}>
          <Pressable
            onPress={onToggleMenu}
            style={s.menuBtn}
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
      </View>

      {/* Floating menu — explicitly hide Delete on Home */}
      {isMenuOpen && (
        <TaskMenu
          onMarkComplete={onMarkComplete}
          onEdit={onEdit}
          onGoToPlant={onGoToPlant}
          onShowHistory={onShowHistory}
          showDelete={false}
        />
      )}
    </View>
  );
}

/* helpers */
function hexToRgba(hex?: string, alpha = 1) {
  const fallback = `rgba(0,0,0,${alpha})`;
  if (!hex || typeof hex !== "string") return fallback;

  let h = hex.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  h = h.replace("#", "");

  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }

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
