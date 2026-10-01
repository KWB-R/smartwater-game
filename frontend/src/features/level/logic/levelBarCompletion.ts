/** Entspricht Strapi-Default `minimumScorePercentage` (api::level.level). */
const DEFAULT_MINIMUM_SCORE_PERCENTAGE = 80;

function normalizeMinimumScorePercentage(
  value: number | null | undefined,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MINIMUM_SCORE_PERCENTAGE;
  }
  const rounded = Math.round(value);
  return Math.min(100, Math.max(1, rounded));
}

/** Abstand der Bestehens-Linie vom rechten Balkenrand (siehe MapGameHeaderView). */
export function headerBarPassLineOffsetFromRight(
  minimumScorePercentage?: number | null,
): number {
  const pct = normalizeMinimumScorePercentage(minimumScorePercentage);
  return (100 - pct) / 100;
}

export function barPassThresholdScore(
  barMaxScore: number,
  minimumScorePercentage?: number | null,
): number {
  const max = Math.max(1, barMaxScore);
  const pct = normalizeMinimumScorePercentage(minimumScorePercentage);
  return max * (pct / 100);
}

export function hasPassedBarThreshold(
  displayScore: number,
  barMaxScore: number,
  minimumScorePercentage?: number | null,
): boolean {
  return (
    displayScore >=
    barPassThresholdScore(barMaxScore, minimumScorePercentage) - 0.001
  );
}

export function isMaxBarScore(
  displayScore: number,
  barMaxScore: number,
): boolean {
  return barMaxScore > 0 && displayScore >= barMaxScore - 0.001;
}

/** Ein Stern unter der Bestehensgrenze, zwei ab der Grenze, drei bei voller Punktzahl. */
export function levelCompletionStars(
  displayBarScore: number,
  barMaxScore: number,
  minimumScorePercentage?: number | null,
): 1 | 2 | 3 {
  if (isMaxBarScore(displayBarScore, barMaxScore)) {
    return 3;
  }
  if (
    hasPassedBarThreshold(
      displayBarScore,
      barMaxScore,
      minimumScorePercentage,
    )
  ) {
    return 2;
  }
  return 1;
}
