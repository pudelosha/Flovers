/** Read-only display data. XP earning and level thresholds belong to the backend. */
export type AccountLevelProgress = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
};
