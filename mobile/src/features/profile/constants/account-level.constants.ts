export const ACCOUNT_RANKS = [
  { key: "seedling", title: "Seedling", badge: "🌱" },
  { key: "sproutKeeper", title: "Sprout Keeper", badge: "🌱" },
  { key: "leafLover", title: "Leaf Lover", badge: "🍃" },
  { key: "buddingGardener", title: "Budding Gardener", badge: "🌿" },
  { key: "plantNurturer", title: "Plant Nurturer", badge: "🪴" },
  { key: "greenThumb", title: "Green Thumb", badge: "🌳" },
  { key: "gardenGuardian", title: "Garden Guardian", badge: "🌸" },
  { key: "botanicalExpert", title: "Botanical Expert", badge: "🌺" },
  { key: "masterGrower", title: "Master Grower", badge: "🏵️" },
  { key: "plantLegend", title: "Plant Legend", badge: "🏆" },
] as const;

export function accountRankForLevel(value: number) {
  const level = Number.isFinite(value) ? Math.max(1, Math.min(100, Math.trunc(value))) : 1;
  const rankIndex = Math.floor((level - 1) / 10);
  return {
    level,
    ...ACCOUNT_RANKS[rankIndex],
    nextRankLevel: rankIndex < ACCOUNT_RANKS.length - 1 ? (rankIndex + 1) * 10 + 1 : null,
  };
}
