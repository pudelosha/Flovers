import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { DimensionValue } from "react-native";
import { useTranslation } from "react-i18next";
import { accountRankForLevel } from "../constants/account-level.constants";
import type { AccountLevelProgress } from "../types/account-level.types";

export default function AccountLevelCard({ progress, loading = false }: {
  progress?: AccountLevelProgress | null;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string, values?: Record<string, number>) =>
    String(t("profile.account.level." + key, { defaultValue: fallback, ...values }));

  // An unavailable balance is never rendered as a newly created level-1 account.
  const hasProgress = progress != null && Number.isInteger(progress.level) &&
    progress.level >= 1 && progress.level <= 100 &&
    Number.isFinite(progress.xpIntoLevel) && progress.xpIntoLevel >= 0 &&
    (progress.level === 100 || (Number.isFinite(progress.xpForNextLevel) && progress.xpForNextLevel > 0));
  const rank = accountRankForLevel(hasProgress ? progress!.level : 1);
  const isMaxLevel = hasProgress && rank.level === 100;
  const missingText = loading ? tr("loading", "Loading XP…")
    : tr("unavailable", "Couldn’t load your level. Open Profile again to retry.");
  const fraction = isMaxLevel ? 1 : hasProgress
    ? Math.min(1, progress!.xpIntoLevel / progress!.xpForNextLevel) : 0;
  const xpText = hasProgress && !isMaxLevel
    ? tr("xpProgress", "{{current}} / {{required}} XP", {
        current: progress!.xpIntoLevel, required: progress!.xpForNextLevel,
      })
    : hasProgress ? "" : "— XP";
  const remaining = hasProgress && !isMaxLevel
    ? Math.max(0, progress!.xpForNextLevel - progress!.xpIntoLevel) : 0;

  return (
    <View style={s.panel}>
      <View style={s.rankRow}>
        <View style={s.levelColumn}>
          <View style={s.badge} accessible={false}>
            <Text style={s.badgeText}>{rank.badge}</Text>
          </View>
          <Text style={s.levelNumber}>{hasProgress ? rank.level : "—"}</Text>
          <Text style={s.caption}>{tr("level", "Level")}</Text>
        </View>
        <View style={s.rankColumn}>
          <Text style={s.caption}>{tr("currentRank", "Current rank")}</Text>
          <Text style={s.rankTitle}>{hasProgress ? tr("ranks." + rank.key, rank.title) : "—"}</Text>
          <Text style={s.description}>{tr("journey", "Small steps, thriving plants.")}</Text>
        </View>
      </View>

      <View style={s.divider} />
      <View style={s.progressLabels}>
        <Text style={s.progressText}>
          {isMaxLevel ? tr("maxLevel", "Maximum level reached") : hasProgress
            ? tr("toLevel", "To level {{level}}", { level: rank.level + 1 })
            : tr("experience", "Experience")}
        </Text>
        {xpText ? <Text style={s.xpText}>{xpText}</Text> : null}
      </View>
      <View
        style={s.track}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={tr("experience", "Experience")}
        accessibilityValue={hasProgress
          ? { min: 0, max: 100, now: Math.round(fraction * 100), text: isMaxLevel ? tr("maxLevel", "Maximum level reached") : xpText }
          : { text: missingText }}
      >
        <View style={[s.fill, { width: (fraction * 100 + "%") as DimensionValue }]} />
      </View>
      <View style={s.progressLabels}>
        <Text style={s.hint}>
          {isMaxLevel ? tr("allRanks", "All ranks unlocked") : hasProgress
            ? tr("remaining", "{{xp}} XP to next level", { xp: remaining })
            : missingText}
        </Text>
        {hasProgress && rank.nextRankLevel != null && (
          <Text style={[s.hint, s.nextRank]}>
            {tr("nextRank", "Next rank at level {{level}}", { level: rank.nextRankLevel })}
          </Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { borderRadius: 20, padding: 16, marginBottom: 18, backgroundColor: "rgba(255,255,255,0.10)", gap: 10 },
  rankRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 16 },
  levelColumn: { width: 72, alignItems: "center", gap: 4 },
  badge: { width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(11,114,133,0.26)", alignItems: "center", justifyContent: "center", marginBottom: 3 },
  badgeText: { fontSize: 30 },
  levelNumber: { fontSize: 24, fontWeight: "800", color: "#FFFFFF" },
  caption: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "800", textTransform: "uppercase", textAlign: "center", letterSpacing: 0.5 },
  rankColumn: { flexGrow: 1, flexBasis: 140, alignItems: "center", gap: 6 },
  rankTitle: { fontSize: 21, fontWeight: "800", color: "#FFFFFF", textAlign: "center" },
  description: { fontSize: 12, lineHeight: 18, fontWeight: "600", color: "rgba(255,255,255,0.9)", textAlign: "center" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.18)", marginVertical: 4 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", columnGap: 12, rowGap: 6 },
  progressText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", flexShrink: 1 },
  xpText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", flexShrink: 1, textAlign: "right" },
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4, backgroundColor: "#0B7285" },
  hint: { color: "rgba(255,255,255,0.9)", fontSize: 11, lineHeight: 16, fontWeight: "600", flexGrow: 1, flexBasis: 100 },
  nextRank: { textAlign: "right" },
});
