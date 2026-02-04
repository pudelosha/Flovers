import type { LightLevel, Orientation } from "../types/create-plant.types";

export type IntervalTuningContext = {
  lightLevel?: LightLevel;
  orientation?: Orientation;
  distanceCm?: number;
  potMaterial?: string;
  soilMix?: string;
};

/**
 * Treat default wizard values as "unknown" unless user changed them.
 * Prevents accidental tuning when user didn't provide meaningful data.
 */
export function hasMeaningfulTuningSignals(ctx: IntervalTuningContext): boolean {
  const pot = (ctx.potMaterial ?? "").toLowerCase().trim();
  const soil = (ctx.soilMix ?? "").toLowerCase().trim();

  const hasPot = !!pot && pot !== "unspecified";
  const hasSoil = !!soil && soil !== "unspecified";

  // Wizard defaults: lightLevel = "bright-indirect", orientation = "E", distanceCm = 20
  const hasLight = !!ctx.lightLevel && ctx.lightLevel !== "bright-indirect";
  const hasOrientation = !!ctx.orientation && ctx.orientation !== "E";
  const hasDistance = typeof ctx.distanceCm === "number" && ctx.distanceCm !== 20;

  return hasPot || hasSoil || hasLight || hasOrientation || hasDistance;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Score-based tuning: small adjustments only.
 * Positive score => shorten interval; negative => lengthen interval.
 */
function computeDrynessScore(ctx: IntervalTuningContext): number {
  let score = 0;

  // Light intensity
  switch (ctx.lightLevel) {
    case "bright-direct":
      score += 2;
      break;
    case "bright-indirect":
      score += 1;
      break;
    case "medium":
      score += 0;
      break;
    case "low":
      score -= 1;
      break;
    case "very-low":
      score -= 2;
      break;
  }

  // Orientation: south tends to higher sun, north tends to lower
  switch (ctx.orientation) {
    case "S":
      score += 1;
      break;
    case "E":
    case "W":
      score += 0;
      break;
    case "N":
      score -= 1;
      break;
  }

  // Distance from window (simple buckets)
  if (typeof ctx.distanceCm === "number") {
    if (ctx.distanceCm <= 10) score += 1;
    else if (ctx.distanceCm >= 60) score -= 1;
  }

  // Pot material: terracotta dries faster; self-watering holds moisture
  const pot = (ctx.potMaterial ?? "").toLowerCase();
  if (pot.includes("terracotta") || pot.includes("clay")) score += 1;
  if (pot.includes("self") && pot.includes("water")) score -= 1;
  if (pot.includes("plastic")) score -= 0.5;

  // Soil: chunky / cactus dries faster; peat / coco retains more
  const soil = (ctx.soilMix ?? "").toLowerCase();
  if (
    soil.includes("cactus") ||
    soil.includes("succulent") ||
    soil.includes("chunky") ||
    soil.includes("aroid")
  ) {
    score += 0.5;
  }
  if (soil.includes("peat") || soil.includes("coco") || soil.includes("coir")) {
    score -= 0.5;
  }

  return score;
}

/**
 * Tune a day-based interval (watering / misting / fertilising / trimming)
 * - If user provided no meaningful signals: return base (no tuning).
 * - Otherwise apply small changes only: maxDelta (default 2 days).
 */
export function tuneDaysInterval(
  baseDays: number,
  ctx: IntervalTuningContext,
  opts?: { minDays?: number; maxDays?: number; maxDelta?: number }
): number {
  const minDays = opts?.minDays ?? 1;
  const maxDays = opts?.maxDays ?? 90;
  const maxDelta = opts?.maxDelta ?? 2;

  const base = clampInt(baseDays, minDays, maxDays);

  // CRITICAL: do not tune if user did not provide meaningful signals
  if (!hasMeaningfulTuningSignals(ctx)) return base;

  const score = computeDrynessScore(ctx);

  // Map score -> delta (small)
  // Higher dryness => reduce days (more frequent watering)
  let delta = 0;
  if (score >= 3) delta = -2;
  else if (score >= 2) delta = -1;
  else if (score <= -3) delta = +2;
  else if (score <= -2) delta = +1;

  delta = clampInt(delta, -maxDelta, maxDelta);
  return clampInt(base + delta, minDays, maxDays);
}

/**
 * Tune a month-based interval (repotting)
 * Same rule: no meaningful signals => base.
 */
export function tuneMonthsInterval(
  baseMonths: number,
  ctx: IntervalTuningContext,
  opts?: { minMonths?: number; maxMonths?: number; maxDelta?: number }
): number {
  const minMonths = opts?.minMonths ?? 1;
  const maxMonths = opts?.maxMonths ?? 48; // ✅ allow 24-month plants (and more)
  const maxDelta = opts?.maxDelta ?? 1;

  const base = clampInt(baseMonths, minMonths, maxMonths);

  if (!hasMeaningfulTuningSignals(ctx)) return base;

  // Repotting influenced very lightly.
  const score = computeDrynessScore(ctx);
  let delta = 0;

  // very bright/hot and fast-drying setup might justify -1 month (slightly more frequent)
  if (score >= 3) delta = -1;
  // darker / moisture-retentive setup might justify +1 month
  else if (score <= -3) delta = +1;

  delta = clampInt(delta, -maxDelta, maxDelta);
  return clampInt(base + delta, minMonths, maxMonths);
}
