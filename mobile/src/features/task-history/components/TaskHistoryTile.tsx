import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
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
};

export default function TaskHistoryTile({ item }: Props) {
  const [expanded, setExpanded] = useState(false);

  const type = item.type as TaskType;
  const displayType = toDisplayType(type as any);
  const accent = ACCENT_BY_TYPE[displayType];
  const icon = ICON_BY_TYPE[displayType] ?? "calendar-check";

  const completedLabel = useMemo(
    () => formatCompletedAt(item.completedAt),
    [item.completedAt]
  );

  const hasNote = !!item.note && item.note.trim().length > 0;

  const onToggle = () => {
    if (!hasNote) return; // tile is still pressable, but only toggles when note exists
    setExpanded((v) => !v);
  };

  const chevronName = expanded ? "chevron-up" : "chevron-down";

  return (
    <View style={s.cardWrap}>
      {/* Glass stack: Blur + white tint + border + subtle accent tint */}
      <View style={s.cardGlass}>
        <MaterialCommunityIcons // dummy element for RN to keep vector lib linked; BlurView added below
          name="blank"
          size={0.01}
          color="transparent"
          style={{ position: "absolute", opacity: 0 }}
        />
        {/* If you want real blur, replace this View with <BlurView /> as done in Reminders */}
        <View style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={s.cardTint} />
        <View pointerEvents="none" style={s.cardBorder} />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: hexToRgba(accent, 0.10), zIndex: 1 },
          ]}
        />
      </View>

      <Pressable style={s.cardRow} onPress={onToggle}>
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

        {/* Center: plant + location + completed date + note (expanded) */}
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

          {expanded && hasNote && (
            <View style={s.noteBox}>
              <Text style={s.noteLabel}>Note</Text>
              <Text style={s.noteText}>{item.note}</Text>
            </View>
          )}
        </View>

        {/* Right: chevron (only visible if note exists) */}
        <View style={s.rightCol}>
          {hasNote && (
            <MaterialCommunityIcons name={chevronName} size={22} color="#FFFFFF" />
          )}
        </View>
      </Pressable>
    </View>
  );
}
