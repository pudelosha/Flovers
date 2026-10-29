import React, { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";

import { s } from "../styles/task-history.styles";
import type { TaskHistoryItem } from "../types/task-history.types";
import { ACCENT_BY_TYPE, ICON_BY_TYPE } from "../../home/constants/home.constants";
import type { TaskType } from "../../home/types/home.types";
import { useSettings } from "../../../app/providers/SettingsProvider";
import SharedPlantBadge from "../../../shared/ui/SharedPlantBadge";
import { plantAccess, SHARED_PLANT_TINT } from "../../../shared/utils/plantAccess";

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
  onPressBody?: () => void;
};

export default function TaskHistoryTile({
  item,
  isMenuOpen,
  onToggleMenu,
  onDelete,
  onEditReminder,
  onGoToPlant,
  onPressBody,
}: Props) {
  const { t } = useTranslation();

  const { settings } = useSettings();
  const access = plantAccess(item.access);
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
  const completedBy = item.completedBy?.name.trim() || t("taskHistory.tile.unknownUser", { defaultValue: "Unknown user" });

  const onToggleBody = () => {
    onPressBody?.();
    onToggleMenu();
  };

  const handleDelete = () => {
    onToggleMenu();
    if (onDelete) onDelete(item);
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
        {access.isShared && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: SHARED_PLANT_TINT }]} />}
        <View pointerEvents="none" style={s.cardBorder} />
      </View>

      <View style={s.cardRow}>
        {/* BODY (pressable): opens the inline menu */}
        <Pressable
          accessible={false}
          style={s.cardBodyPressable}
          onPress={onToggleBody}
          android_ripple={{ color: "rgba(255,255,255,0.10)" }}
        >
          {/* Left: icon only */}
          <View style={s.leftCol}>
            <View style={[s.leftIconBubble, { backgroundColor: hexToRgba("#000000", 0.15) }]}>
              <MaterialCommunityIcons name={icon} size={24} color={accent} />
            </View>
          </View>

          {/* Center: type + plant + location */}
          <View style={s.centerCol}>
            <Text style={[s.taskTypeLabel, { color: accent }]} numberOfLines={1}>
              {typeLabel}
            </Text>
            <Text style={s.plantName} numberOfLines={1}>
              {item.plant}
            </Text>
            <SharedPlantBadge access={item.access} compact />

            {!!item.location && (
              <View style={s.locationRow}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={12}
                  color="#FFFFFF"
                  style={s.locationIcon}
                />
                <Text style={s.location} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            )}

          </View>

          <View style={s.separator} />

          <View style={s.rightCol}>
            <Text style={s.completedLabel} numberOfLines={1}>
              {t("taskHistory.tile.completed", { defaultValue: "Completed" })}
            </Text>
            <Text style={s.completedDateText} numberOfLines={1}>
              {completedLabel || "—"}
            </Text>
            <Text style={s.completedByText} numberOfLines={1} ellipsizeMode="tail">
              {completedBy}
            </Text>
          </View>
        </Pressable>
      </View>

      {hasNote && <View style={[s.noteBox, styles.noteSection]}>
        <Text style={s.noteLabel}>{t("taskHistory.tile.noteLabel")}</Text>
        <Text style={s.noteText}>{item.note}</Text>
      </View>}

      {/* Inline menu */}
      {isMenuOpen && (
        <View style={s.menuSheet}>
          {/* Edit reminder */}
          {access.canEdit && <Pressable style={s.menuItem} onPress={handleEditReminder}>
            <MaterialCommunityIcons
              name="pencil-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={s.menuItemText}>{t("taskHistory.menu.editReminder")}</Text>
          </Pressable>}

          {/* Go to plant */}
          <Pressable style={s.menuItem} onPress={handleGoToPlant}>
            <MaterialCommunityIcons
              name="flower-tulip-outline"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={s.menuItemText}>{t("taskHistory.menu.goToPlant")}</Text>
          </Pressable>

          {/* Delete – last & red */}
          {access.canEdit && <Pressable style={s.menuItem} onPress={handleDelete}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={18}
              color="#FF6B6B"
              style={{ marginRight: 8 }}
            />
            <Text style={[s.menuItemText, { color: "#FF6B6B", fontWeight: "800" }]}>
              {t("taskHistory.menu.deleteTask")}
            </Text>
          </Pressable>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  noteSection: {
    marginHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
  },
});
