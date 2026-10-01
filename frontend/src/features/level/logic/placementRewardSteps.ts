import type { DistrictLevelPuzzleItem } from "@/types/content";
import {
  puzzleItemByConfigId,
  scoreBreakdownFromPunkte,
} from "@/features/level/logic/placementScoring";
import { activeMissionCategoryIds } from "@/features/level/logic/tileCategoryPoints";
import {
  BASE_POINTS_WEIGHT,
  BONUS_POINTS_WEIGHT,
  MISSION_POINTS_WEIGHT,
} from "@/features/level/logic/scoringConstants";
import type { GoalFocusDimension, Level, Tile } from "@/features/level/types";

/** Deutsche Bezeichnungen der Wirkungsbereiche für die Rückmeldung. */
export const DIMENSION_LABEL_DE: Record<GoalFocusDimension, string> = {
  cooling: "Kühlung",
  flooding: "Hochwasser",
  water: "Wasser",
  biodiversity: "Biodiversität",
  quality: "Qualität",
};

type SecondaryCelebration = {
  key: GoalFocusDimension;
  label: string;
};

export type PlacementScoreSteps = {
  /** Gewichtete Missions- und Basispunkte des Puzzleteils. */
  baseDelta: number;
  /** Gewichtete Bonuspunkte. */
  focusExtraDelta: number;
  /** Ungewichtete Basispunkte für die angezeigte Rückmeldung. */
  basePointsCollected: number;
  /** Ungewichtete Missionspunkte für die angezeigte Rückmeldung. */
  missionPointsCollected: number;
  /** Ungewichtete Bonuspunkte für die angezeigte Rückmeldung. */
  bonusPointsCollected: number;
  /** Zusätzliche Rückmeldung für einen starken Wirkungsbereich mit Missionsbezug. */
  secondaryCelebration: SecondaryCelebration | null;
};

const SECONDARY_RATIO_THRESHOLD = 0.75;

/**
 * Teilt die Platzierungspunkte für die Balkenanimation auf.
 * baseDelta und focusExtraDelta ergeben zusammen tilePlacementScore.
 */
export function getPlacementScoreSteps(
  tile: Tile,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
  level: Pick<Level, "goalFocusWeights" | "pointMaximum">,
): PlacementScoreSteps {
  const missionIds = activeMissionCategoryIds(puzzleItems, level);
  const item = puzzleItemByConfigId(puzzleItems, tile.configId);
  if (item) {
    const { missionPoints, bonusPoints, basePoints } = scoreBreakdownFromPunkte(
      item.punkte,
      missionIds,
    );
    return {
      baseDelta:
        missionPoints * MISSION_POINTS_WEIGHT +
        basePoints * BASE_POINTS_WEIGHT,
      focusExtraDelta: bonusPoints * BONUS_POINTS_WEIGHT,
      basePointsCollected: basePoints,
      missionPointsCollected: missionPoints,
      bonusPointsCollected: bonusPoints,
      secondaryCelebration: null,
    };
  }

  const pm = tile.pointMatrix;
  const focusPm: Record<GoalFocusDimension, number> = {
    cooling: pm.cooling,
    flooding: pm.flooding,
    water: pm.water,
    biodiversity: pm.biodiversity,
    quality: pm.quality,
  };
  const focusKeys = Object.keys(focusPm) as GoalFocusDimension[];
  const baseDelta =
    focusKeys.reduce((s, k) => s + focusPm[k], 0) * MISSION_POINTS_WEIGHT;
  const missionPointsCollected = focusKeys.reduce((s, k) => s + focusPm[k], 0);
  const maxFocus: Record<GoalFocusDimension, number> = {
    cooling: level.pointMaximum.cooling,
    flooding: level.pointMaximum.flooding,
    water: level.pointMaximum.water,
    biodiversity: level.pointMaximum.biodiversity,
    quality: level.pointMaximum.quality,
  };
  const w = level.goalFocusWeights ?? {};
  let best: { key: GoalFocusDimension; ratio: number } | null = null;
  for (const k of focusKeys) {
    if ((w[k] ?? 1) > 1) continue;
    const cap = maxFocus[k];
    if (cap <= 0) continue;
    const ratio = focusPm[k] / cap;
    if (ratio >= SECONDARY_RATIO_THRESHOLD) {
      if (!best || ratio > best.ratio) {
        best = { key: k, ratio };
      }
    }
  }
  const secondaryCelebration = best
    ? { key: best.key, label: DIMENSION_LABEL_DE[best.key] }
    : null;

  return {
    baseDelta,
    focusExtraDelta: 0,
    basePointsCollected: 0,
    missionPointsCollected,
    bonusPointsCollected: 0,
    secondaryCelebration,
  };
}
