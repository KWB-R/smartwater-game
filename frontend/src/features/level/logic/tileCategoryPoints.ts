import type { GoalFocusDimension, Level, PointMatrix } from "@/features/level/types";
import {
  goalFocusDimensionForBonusCategory,
  levelMissionCategoryIds,
  readCategoryBonusPoints,
  type LevelBonusCategoryId,
  type LevelPunkteRecord,
} from "@/domain/levelBonusCategories";

function valueToDots(value: number, maxForLevel: number): number {
  if (maxForLevel <= 0) return 0;
  return Math.min(3, Math.max(0, Math.round((value / maxForLevel) * 3)));
}

/** Der CMS-Wert bonus liegt pro Kategorie zwischen null und drei. */
function punkteBonusToDots(bonus: number): number {
  if (!Number.isFinite(bonus)) return 0;
  return Math.min(3, Math.max(0, Math.round(bonus)));
}

/** Anzahl grüner Punkte je Kategorie aus Punktmatrix oder CMS. */
export function tileCategoryFilledDots(
  categoryId: LevelBonusCategoryId,
  tileMatrix: PointMatrix,
  level: Level,
): number {
  const dimension = goalFocusDimensionForBonusCategory(categoryId);
  return valueToDots(tileMatrix[dimension], level.pointMaximum[dimension]);
}

export function tileCategoryFilledDotsFromPunkte(
  categoryId: LevelBonusCategoryId,
  punkte: LevelPunkteRecord,
  _level: Level,
): number {
  return punkteBonusToDots(readCategoryBonusPoints(punkte, categoryId));
}

/** Aktive Missions-Kategorien: CMS (`isMission` an Puzzle-Items), sonst Spiel-Level-Fokus. */
export function activeMissionCategoryIds(
  levelPuzzleItems: ReadonlyArray<{ punkte: LevelPunkteRecord }>,
  level: Pick<Level, "goalFocusWeights">,
): Set<LevelBonusCategoryId> {
  const cms = levelMissionCategoryIds(levelPuzzleItems);
  return cms.size > 0 ? cms : gameLevelMissionCategoryIds(level);
}

function goalDimensionsForMissionCategories(
  categoryIds: Iterable<LevelBonusCategoryId>,
): ReadonlySet<GoalFocusDimension> {
  const dims = new Set<GoalFocusDimension>();
  for (const id of categoryIds) {
    dims.add(goalFocusDimensionForBonusCategory(id));
  }
  return dims;
}

export function activeMissionGoalDimensions(
  levelPuzzleItems: ReadonlyArray<{ punkte: LevelPunkteRecord }>,
  level: Pick<Level, "goalFocusWeights">,
): ReadonlySet<GoalFocusDimension> {
  return goalDimensionsForMissionCategories(
    activeMissionCategoryIds(levelPuzzleItems, level),
  );
}

/** Missions-Fokus aus Spiel-Level (`goalFocusWeights` > 1), falls CMS keine `isMission` liefert. */
function gameLevelMissionCategoryIds(
  level: Pick<Level, "goalFocusWeights">,
): Set<LevelBonusCategoryId> {
  const w = level.goalFocusWeights ?? {};
  const ids = new Set<LevelBonusCategoryId>();
  const entries: [GoalFocusDimension, LevelBonusCategoryId][] = [
    ["biodiversity", "bio"],
    ["water", "water_protection"],
    ["cooling", "climate"],
    ["quality", "green_spaces"],
    ["flooding", "flood_prevention"],
  ];
  for (const [dim, cat] of entries) {
    if ((w[dim] ?? 1) > 1) {
      ids.add(cat);
    }
  }
  return ids;
}
