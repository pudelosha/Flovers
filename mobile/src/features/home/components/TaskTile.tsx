import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { BlurView } from "@react-native-community/blur";
import { s } from "../styles/home.styles";
import { ACCENT_BY_TYPE, ICON_BY_TYPE, TILE_BLUR } from "../constants/home.constants";
import type { Task } from "../types/home.types";
import TaskMenu from "./TaskMenu";

type Props = {
  task: Task;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onMarkComplete: () => void;
  onEdit: () => void;
  onGoToPlant: () => void;
  onDelete: () => void;
};

export default function TaskTile({
  task,
  isMenuOpen,
  onToggleMenu,
  onMarkComplete,
  onEdit,
  onGoToPlant,
  onDelete,
}: Props) {
  const a = ACCENT_BY_TYPE[task.type];
  const icon = ICON_BY_TYPE[task.type];

  return (
    <View style={s.cardWrap}>
      {/* Glass background (blur + subtle colored tint) */}
      <View style={s.cardGlass}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={TILE_BLUR}
          reducedTransparencyFallbackColor="rgba(255,255,255,0.15)"
        />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: hexToRgba(a, 0.10) }]}
          pointerEvents="none"
        />
      </View>

      {/* Content row */}
      <View style={s.cardRow}>
        {/* Left: action icon + caption */}
        <View style={s.leftCol}>
          <View style={[s.leftIconBubble, { backgroundColor: hexToRgba("#000", 0.15) }]}>
            <MaterialCommunityIcons name={icon} size={20} color={a} />
          </View>
          <Text style={[s.leftCaption, { color: a }]}>{task.type.toUpperCase()}</Text>
        </View>

        {/* Center: title, location, due */}
        <View style={s.centerCol}>
          <Text style={s.plantName} numberOfLines={1}>{task.plant}</Text>
          <Text style={s.location} numberOfLines={1}>{task.location}</Text>
          <View style={s.dueRow}>
            <Text style={s.dueWhen}>{task.due}</Text>
            <Text style={s.dueDateText}>{formatDate(task.dueDate)}</Text>
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

      {/* Floating menu */}
      {isMenuOpen && (
        <TaskMenu
          onMarkComplete={onMarkComplete}
          onEdit={onEdit}
          onGoToPlant={onGoToPlant}
          onDelete={onDelete}
        />
      )}
    </View>
  );
}

/* local helpers */
function hexToRgba(hex: string, alpha = 1) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function formatDate(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
