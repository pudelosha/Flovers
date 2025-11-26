// C:\Projekty\Python\Flovers\mobile\src\features\home\components\TaskTile.tsx
import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";
import { s } from "../styles/home.styles";
import { ACCENT_BY_TYPE, ICON_BY_TYPE } from "../constants/home.constants";
import type { Task } from "../types/home.types";
import TaskMenu from "./TaskMenu";
import { useSettings } from "../../../app/providers/SettingsProvider"; // 👈 NEW

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

export default function TaskTile({
  task,
  isMenuOpen,
  onToggleMenu,
  onMarkComplete,
  onEdit,
  onGoToPlant,
  onShowHistory,
}: Props) {
  const accent = ACCENT_BY_TYPE[task.type];
  const icon = ICON_BY_TYPE[task.type];

  const { settings } = useSettings(); // 👈 NEW

  // Detect overdue by the label text (e.g. "Overdue", "Overdue by 2 days")
  const isOverdue =
    typeof task.due === "string" && task.due.toLowerCase().includes("overdue");

  const formattedDate = formatDateWithPattern(task.dueDate, settings.dateFormat); // 👈 NEW

  return (
    <View style={[s.cardWrap, isMenuOpen && s.cardWrapRaised]}>
      {/* Glass stack: Blur + white tint + hairline border + subtle accent tint */}
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
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(accent, 0.1) }]}
        />
      </View>

      {/* Content row */}
      <View style={[s.cardRow, { paddingVertical: 4 }]}>
        {/* Left: icon + caption */}
        <View style={s.leftCol}>
          <View style={[s.leftIconBubble, { backgroundColor: hexToRgba("#000", 0.15) }]}>
            <MaterialCommunityIcons name={icon} size={20} color={accent} />
          </View>
          <Text style={[s.leftCaption, { color: accent }]}>
            {task.type.toUpperCase()}
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
            <Text
              style={[
                s.dueWhen,
                isOverdue && s.dueOverdue,
              ]}
            >
              {task.due}
            </Text>
            <Text
              style={[
                s.dueDateText,
                isOverdue && s.dueOverdue,
              ]}
            >
              {formattedDate}
            </Text>
          </View>
        </View>

        {/* Right: menu button */}
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
