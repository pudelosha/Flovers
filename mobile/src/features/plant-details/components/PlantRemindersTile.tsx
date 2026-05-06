import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider";

import { s } from "../styles/plant-details.styles";
import type { PlantReminderSummary } from "../types/plant-details.types";

import { ACCENT_BY_TYPE, ICON_BY_TYPE } from "../../reminders/constants/reminders.constants";
import PlantReminderMenu from "./PlantReminderMenu";

/* ----- helpers (mirrors Reminders tile) ----- */
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

function formatDateBySettings(
  d: string | Date | null | undefined,
  settings?: any
): string {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(+dt)) return "";

  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dt.getFullYear());

  const fmt = settings?.dateFormat;

  if (fmt === "mdy" || fmt === "MM/DD/YYYY" || fmt === "MM-DD-YYYY") {
    const sep = fmt === "MM-DD-YYYY" ? "-" : "/";
    return `${mm}${sep}${dd}${sep}${yyyy}`;
  }

  if (fmt === "ymd" || fmt === "YYYY-MM-DD" || fmt === "YYYY/MM/DD") {
    const sep = fmt === "YYYY/MM/DD" ? "/" : "-";
    return `${yyyy}${sep}${mm}${sep}${dd}`;
  }

  if (fmt === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  if (fmt === "DD-MM-YYYY") return `${dd}-${mm}-${yyyy}`;

  return `${dd}.${mm}.${yyyy}`;
}

function getDueDiffDays(d: string | Date | null | undefined): number | null {
  if (!d) return null;
  const dt = d instanceof Date ? new Date(d) : new Date(d);
  if (Number.isNaN(+dt)) return null;

  dt.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((+dt - +today) / (1000 * 60 * 60 * 24));
}
/* --------------------------------------------- */

type Props = {
  reminders: PlantReminderSummary[];
  onMarkComplete: (reminderId: string) => void;
  onEditReminder: (reminderId: string) => void;
  onShowHistory: () => void;
  collapseMenusSignal?: number;
  onTileTouch?: () => void;
};

// Same green tones as AuthCard / PlantTile
const TAB_GREEN_DARK = "rgba(5, 31, 24, 0.9)";
const TAB_GREEN_LIGHT = "rgba(16, 80, 63, 0.9)";

export default function PlantRemindersTile({
  reminders,
  onMarkComplete,
  onEditReminder,
  onShowHistory,
  collapseMenusSignal,
  onTileTouch,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return (isMissing ? undefined : txt) || fallback || key.split(".").pop() || key;
    },
    [t, currentLanguage]
  );

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const toggleMenu = (id: string) => {
    setMenuOpenId((curr) => (curr === id ? null : id));
  };
  const handleTileTouch = useCallback(() => {
    setMenuOpenId(null);
    onTileTouch?.();
  }, [onTileTouch]);

  useEffect(() => {
    setMenuOpenId(null);
  }, [collapseMenusSignal]);

  if (!reminders || reminders.length === 0) {
    return null;
  }

  const anyMenuOpen = !!menuOpenId;

  return (
    <View style={[styles.cardWrap, anyMenuOpen && styles.cardWrapRaised]}>
      <View style={s.cardGlass}>
        {/* Base green gradient */}
        <LinearGradient
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          colors={[TAB_GREEN_LIGHT, TAB_GREEN_DARK]}
          locations={[0, 1]}
          style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
        />

        {/* Fog highlight */}
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

        <View pointerEvents="none" style={s.cardTint} />
        <View pointerEvents="none" style={s.cardBorder} />
      </View>

      <View style={styles.inner}>
        <Pressable onPressIn={handleTileTouch} accessible={false}>
          <Text style={styles.title}>{tr("plantDetails.reminders.title", "Reminders")}</Text>
        </Pressable>

        {reminders.map((r) => {
          const displayType = toDisplayType(r.type);
          const accent = ACCENT_BY_TYPE[displayType] || "#7DE2A7";
          const icon = ICON_BY_TYPE[displayType] ?? "calendar";

          const isOpen = menuOpenId === r.id;
          const formattedDate = formatDateBySettings(r.dueDate, settings);
          const dateSuffix = formattedDate ? `     ${formattedDate}` : "";

          const typeLabel = tr(`plantDetails.reminders.type.${displayType}`, displayType);

          const diff = getDueDiffDays(r.dueDate);
          const dueLabel =
            diff == null
              ? r.when
              : diff === 0
                ? tr("home.due.today", "Today")
                : diff === 1
                  ? tr("home.due.tomorrow", "Tomorrow")
                  : diff > 1 && diff < 7
                    ? tr("home.due.inDays", "In {{count}} days", { count: diff })
                    : diff < 0
                      ? tr("home.due.overdueByDays", "Overdue by {{count}} days", {
                          count: Math.abs(diff),
                        })
                      : tr("home.due.nextWeek", "Next week");

          return (
            <View key={r.id} style={[styles.row, isOpen && styles.rowRaised]}>
              <Pressable
                style={styles.left}
                onPressIn={handleTileTouch}
                accessible={false}
              >
                <View style={[styles.iconBubble, { backgroundColor: hexToRgba("#000", 0.15) }]}>
                  <MaterialCommunityIcons name={icon} size={20} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeText, { color: accent }]} numberOfLines={1}>
                    {String(typeLabel).toUpperCase()}
                  </Text>
                  <Text style={styles.whenText} numberOfLines={1}>
                    {dueLabel}
                    {dateSuffix}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.right}>
                <Pressable
                  onPress={() => toggleMenu(r.id)}
                  style={styles.menuBtn}
                  android_ripple={{ color: "rgba(255,255,255,0.16)", borderless: true }}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name="dots-horizontal" size={20} color="#FFFFFF" />
                </Pressable>
              </View>

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
                    onShowHistory();
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

    // elevation only (prevents iOS inner shadow artifacts with layered glass)
    elevation: 8,

    marginBottom: 14,
  },
  cardWrapRaised: { zIndex: 40, elevation: 0, shadowOpacity: 0 },
  inner: { padding: 16 },
  title: { color: "#FFFFFF", fontWeight: "800", fontSize: 16, marginBottom: 8 },
  row: {
    position: "relative",
    overflow: "visible",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  rowRaised: { zIndex: 30, elevation: 0, shadowOpacity: 0 },
  left: { flexDirection: "row", alignItems: "center", flex: 1, columnGap: 10 },
  right: { justifyContent: "center", alignItems: "flex-end" },
  iconBubble: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  typeText: { fontWeight: "800", fontSize: 13 },
  whenText: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    fontSize: 12,
    marginTop: 2,
  },
  menuBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
