import React, { useEffect, useRef } from "react";
import { Pressable, Text, View, StyleSheet, Animated, Easing } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";
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
};

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

  const isOverdue =
    typeof task.due === "string" && task.due.toLowerCase().includes("overdue");

  const formattedDate = formatDateWithPattern(task.dueDate, settings.dateFormat);

  // --- overdue pulse ---
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isOverdue) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    anim.start();
    return () => anim.stop();
  }, [isOverdue, pulse]);

  // ⬆️ slightly stronger than before
  const overdueOverlayOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.35], // was 0.28
  });

  return (
    <View style={[s.cardWrap, isMenuOpen && s.cardWrapRaised]}>
      <View style={s.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={20}
          overlayColor="transparent"
          reducedTransparencyFallbackColor="transparent"
        />

        <View style={s.cardTint} />
        <View style={s.cardBorder} />

        {/* Base accent gradient */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={[
            hexToRgba(accent, 0.18),
            hexToRgba(accent, 0.1),
            "rgba(0,0,0,0)",
          ]}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Overdue red pulse (slightly stronger) */}
        {isOverdue && (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { opacity: overdueOverlayOpacity }]}
          >
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              colors={[
                "rgba(255, 59, 48, 0.65)", // was 0.55
                "rgba(255, 59, 48, 0.30)", // was 0.20
                "rgba(0,0,0,0)",
              ]}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
      </View>

      {/* Content */}
      <View style={[s.cardRow, { paddingVertical: 4 }]}>
        <View style={s.leftCol}>
          <View style={[s.leftIconBubble, { backgroundColor: hexToRgba("#000", 0.15) }]}>
            <MaterialCommunityIcons name={icon} size={20} color={accent} />
          </View>
          <Text style={[s.leftCaption, { color: accent }]}>
            {t(`home.taskTypes.${task.type}`)}
          </Text>
        </View>

        <View style={s.centerCol}>
          <Text style={s.plantName} numberOfLines={1}>
            {task.plant}
          </Text>

          {task.location && (
            <Text style={s.location} numberOfLines={1}>
              {task.location}
            </Text>
          )}

          <View style={s.dueRow}>
            <Text style={[s.dueWhen, isOverdue && s.dueOverdue]}>
              {task.due}
            </Text>
            <Text style={[s.dueDateText, isOverdue && s.dueOverdue]}>
              {formattedDate}
            </Text>
          </View>
        </View>

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

  return fmt
    .replace("YYYY", String(yyyy))
    .replace("MM", mm)
    .replace("DD", dd);
}
