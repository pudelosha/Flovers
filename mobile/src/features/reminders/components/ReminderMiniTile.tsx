import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { s } from "../styles/reminders.styles";
import type { Reminder as UIReminder } from "../types/reminders.types";
import { ACCENT_BY_TYPE, ICON_BY_TYPE } from "../constants/reminders.constants";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../app/providers/LanguageProvider";
import { useSettings } from "../../../app/providers/SettingsProvider";
import ReminderMiniTileMenu from "./ReminderMiniTileMenu";

type Props = {
  reminder: UIReminder;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

function toTypeKey(t: string) {
  const x = (t || "").toLowerCase();
  if (x === "watering" || x === "water") return "watering";
  if (x === "fertilising" || x === "fertilize" || x === "fertilizing")
    return "fertilising";
  if (x === "moisture" || x === "misting") return "moisture";
  if (x === "repot" || x === "repotting") return "repot";
  if (x === "care") return "care";
  return "care";
}

function formatISOForLabel(iso: string, settings?: any) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const yyyy = m[1];
  const mm = m[2];
  const dd = m[3];

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

export default function ReminderMiniTile({
  reminder,
  isMenuOpen,
  onToggleMenu,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { settings } = useSettings();

  const tr = useCallback(
    (key: string, fallback?: string, values?: any) => {
      void currentLanguage;
      const txt = values ? t(key, values) : t(key);
      const isMissing = !txt || txt === key;
      return isMissing ? fallback ?? key.split(".").pop() ?? key : txt;
    },
    [t, currentLanguage]
  );

  const typeKey = toTypeKey(reminder.type);
  const color = ACCENT_BY_TYPE[typeKey as any];
  const typeLabel = tr(
    `reminders.types.${typeKey}`,
    typeKey === "fertilising"
      ? "Fertilising"
      : typeKey.charAt(0).toUpperCase() + typeKey.slice(1)
  );

  const unitKey = reminder.intervalUnit === "months" ? "months" : "days";
  const unitLabel = tr(`reminders.units.${unitKey}`, unitKey);

  const intervalPart = reminder.intervalValue
    ? tr("reminders.common.everyN", "every {{count}} {{unit}}", {
        count: reminder.intervalValue,
        unit: unitLabel,
      })
    : "";

  const iso = (() => {
    const d = reminder.dueDate ? new Date(reminder.dueDate as any) : null;
    if (!d || isNaN(+d)) return "";
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, "0");
    const D = String(d.getDate()).padStart(2, "0");
    return `${Y}-${M}-${D}`;
  })();

  return (
    <View style={[styles.root, isMenuOpen && styles.rootRaised]}>
      <Pressable
        onPress={onToggleMenu}
        style={styles.wrap}
        android_ripple={{ color: "rgba(255,255,255,0.08)" }}
      >
        <View
          style={[
            s.miniIconBubble,
            styles.iconBubble,
            { backgroundColor: color + "22", borderColor: color + "66" },
          ]}
        >
          <Icon name={ICON_BY_TYPE[typeKey as any]} size={20} color={color} />
        </View>

        <View style={s.miniContent}>
          <Text style={s.miniTitle} numberOfLines={1}>
            {reminder.plant}
          </Text>

          {!!reminder.location && (
            <View style={styles.locationRow}>
              <Icon
                name="map-marker"
                size={12}
                color="#FFFFFF"
                style={styles.locationIcon}
              />
              <Text style={s.miniSub} numberOfLines={1}>
                {reminder.location}
              </Text>
            </View>
          )}

          <Text style={s.miniTag} numberOfLines={1}>
            {typeLabel.toUpperCase()}
            {intervalPart ? ` • ${intervalPart}` : ""}
            {iso ? ` • ${formatISOForLabel(iso, settings)}` : ""}
          </Text>
        </View>
      </Pressable>

      {isMenuOpen && <ReminderMiniTileMenu onEdit={onEdit} onDelete={onDelete} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
    overflow: "visible",
  },
  rootRaised: {
    zIndex: 50,
    elevation: 50,
  },
  wrap: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  locationIcon: {
    marginRight: 6,
  },
});
