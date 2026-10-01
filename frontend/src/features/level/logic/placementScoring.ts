import type { DistrictLevelPuzzleItem } from "@/types/content";
import {
  LEVEL_BONUS_CATEGORY_IDS,
  goalFocusDimensionForBonusCategory,
  readCategoryBonusPoints,
  readCategoryIsBonus,
  TILE_DETAIL_CATEGORY_ORDER,
  type LevelBonusCategoryId,
  type LevelPunkteRecord,
} from "@/domain/levelBonusCategories";
import { activeMissionCategoryIds } from "@/features/level/logic/tileCategoryPoints";
import { weightedPlacementScore } from "@/features/level/logic/calculateMaxPuzzleScore";
import { emptyPoints } from "@/features/level/logic/points";
import type { GoalFocusDimension, Level, PointMatrix, Tile } from "@/features/level/types";

export type PlacementScoreBreakdown = {
  missionPoints: number;
  bonusPoints: number;
  /** Kategorie-Punkte ohne Mission/Bonus-Flag. */
  basePoints: number;
  total: number;
};

function normalizeConfigKey(value: string): string {
  return value.trim().toLowerCase();
}

export function puzzleItemByConfigId(
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
  configId: string | undefined,
): DistrictLevelPuzzleItem | null {
  const id = configId?.trim();
  if (!id) {
    return null;
  }
  const key = normalizeConfigKey(id);
  return (
    puzzleItems.find((item) => normalizeConfigKey(item.uniqueId) === key) ??
    null
  );
}

/** Übernimmt nur Missionskategorien in die Punktmatrix für Sitzung und Quiz. */
function missionPointMatrixFromPunkte(
  punkte: LevelPunkteRecord,
  levelMissionIds: ReadonlySet<LevelBonusCategoryId>,
): PointMatrix {
  const matrix = emptyPoints();
  for (const categoryId of LEVEL_BONUS_CATEGORY_IDS) {
    if (!levelMissionIds.has(categoryId)) {
      continue;
    }
    const dim = goalFocusDimensionForBonusCategory(categoryId);
    const value = readCategoryBonusPoints(punkte, categoryId);
    if (value > 0) {
      matrix[dim] += value;
    }
  }
  return matrix;
}

export function missionPointMatrixForTile(
  tile: Tile,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
  level: Pick<Level, "goalFocusWeights">,
): PointMatrix {
  const missionIds = activeMissionCategoryIds(puzzleItems, level);
  const item = puzzleItemByConfigId(puzzleItems, tile.configId);
  if (item) {
    return missionPointMatrixFromPunkte(item.punkte, missionIds);
  }
  const dims = missionDimensionsFromCategories(missionIds);
  const matrix = emptyPoints();
  for (const dim of dims) {
    matrix[dim] = tile.pointMatrix[dim];
  }
  return matrix;
}

/** Bonuskategorien des Puzzleteils in der Reihenfolge der Detailansicht. */
export function bonusCategoryIdsFromPunkte(
  punkte: LevelPunkteRecord,
  levelMissionIds: ReadonlySet<LevelBonusCategoryId>,
): LevelBonusCategoryId[] {
  const ids: LevelBonusCategoryId[] = [];
  for (const categoryId of TILE_DETAIL_CATEGORY_ORDER) {
    const value = readCategoryBonusPoints(punkte, categoryId);
    if (value <= 0) {
      continue;
    }
    if (levelMissionIds.has(categoryId)) {
      continue;
    }
    if (readCategoryIsBonus(punkte, categoryId)) {
      ids.push(categoryId);
    }
  }
  return ids;
}

export function tilePlacementBonusCategoryIds(
  tile: Tile,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
  level: Pick<Level, "goalFocusWeights">,
): LevelBonusCategoryId[] {
  const missionIds = activeMissionCategoryIds(puzzleItems, level);
  const item = puzzleItemByConfigId(puzzleItems, tile.configId);
  if (!item) {
    return [];
  }
  return bonusCategoryIdsFromPunkte(item.punkte, missionIds);
}

export function scoreBreakdownFromPunkte(
  punkte: LevelPunkteRecord,
  levelMissionIds: ReadonlySet<LevelBonusCategoryId>,
): PlacementScoreBreakdown {
  let missionPoints = 0;
  let bonusPoints = 0;
  let basePoints = 0;

  for (const categoryId of LEVEL_BONUS_CATEGORY_IDS) {
    const value = readCategoryBonusPoints(punkte, categoryId);
    if (value <= 0) {
      continue;
    }
    if (levelMissionIds.has(categoryId)) {
      missionPoints += value;
      continue;
    }
    if (readCategoryIsBonus(punkte, categoryId)) {
      bonusPoints += value;
      continue;
    }
    basePoints += value;
  }

  return {
    missionPoints,
    bonusPoints,
    basePoints,
    total: weightedPlacementScore(missionPoints, bonusPoints, basePoints),
  };
}

export function tilePlacementScoreBreakdown(
  tile: Tile,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
  level: Pick<Level, "goalFocusWeights">,
): PlacementScoreBreakdown {
  const missionIds = activeMissionCategoryIds(puzzleItems, level);
  const item = puzzleItemByConfigId(puzzleItems, tile.configId);
  if (item) {
    return scoreBreakdownFromPunkte(item.punkte, missionIds);
  }
  const missionPoints = scoreFromPointMatrixFallback(tile.pointMatrix, missionIds);
  return {
    missionPoints,
    bonusPoints: 0,
    basePoints: 0,
    total: weightedPlacementScore(missionPoints, 0, 0),
  };
}

export function tilePlacementScore(
  tile: Tile,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
  level: Pick<Level, "goalFocusWeights">,
): number {
  return tilePlacementScoreBreakdown(tile, puzzleItems, level).total;
}

/** Summiert Punkte aktiver Missionskategorien über alle Platzierungen. */
export function sumMissionCategoryPointsFromPlaced(
  placedTiles: ReadonlyArray<{ tile: Tile }>,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
  level: Pick<Level, "goalFocusWeights">,
): Map<LevelBonusCategoryId, number> {
  const missionIds = activeMissionCategoryIds(puzzleItems, level);
  const totals = new Map<LevelBonusCategoryId, number>();
  for (const id of LEVEL_BONUS_CATEGORY_IDS) {
    if (missionIds.has(id)) {
      totals.set(id, 0);
    }
  }
  for (const { tile } of placedTiles) {
    const item = puzzleItemByConfigId(puzzleItems, tile.configId);
    if (!item) {
      continue;
    }
    for (const categoryId of missionIds) {
      const value = readCategoryBonusPoints(item.punkte, categoryId);
      if (value > 0) {
        totals.set(categoryId, (totals.get(categoryId) ?? 0) + value);
      }
    }
  }
  return totals;
}

export function sumPlacedTilesScoreBreakdown(
  placedTiles: ReadonlyArray<{ tile: Tile }>,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
  level: Pick<Level, "goalFocusWeights">,
): PlacementScoreBreakdown {
  return placedTiles.reduce(
    (acc, p) => {
      const b = tilePlacementScoreBreakdown(p.tile, puzzleItems, level);
      return {
        missionPoints: acc.missionPoints + b.missionPoints,
        bonusPoints: acc.bonusPoints + b.bonusPoints,
        basePoints: acc.basePoints + b.basePoints,
        total: acc.total + b.total,
      };
    },
    { missionPoints: 0, bonusPoints: 0, basePoints: 0, total: 0 },
  );
}

/** Bei älteren Daten oder Demos ohne CMS nur Missionswerte verwenden, ohne Bonusfaktor. */
function scoreFromPointMatrixFallback(
  matrix: PointMatrix,
  levelMissionIds: ReadonlySet<LevelBonusCategoryId>,
): number {
  const missionDims = missionDimensionsFromCategories(levelMissionIds);
  let sum = 0;
  for (const dim of missionDims) {
    sum += matrix[dim];
  }
  return sum;
}

function missionDimensionsFromCategories(
  levelMissionIds: ReadonlySet<LevelBonusCategoryId>,
): GoalFocusDimension[] {
  const dims: GoalFocusDimension[] = [];
  for (const id of levelMissionIds) {
    const dim = goalFocusDimensionForBonusCategory(id);
    if (!dims.includes(dim)) {
      dims.push(dim);
    }
  }
  return dims;
}

/** Gesammelte Missionspunkte aus Platzierung und Quiz, optional mit default. */
export function scoreFromAccumulatedPointMatrix(
  matrix: PointMatrix,
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>,
  options?: { includeDefault?: boolean },
): number {
  const includeDefault = options?.includeDefault ?? true;
  let sum = includeDefault ? matrix.default : 0;
  for (const dim of missionGoalDimensions) {
    sum += matrix[dim];
  }
  return sum;
}

export function sumPlacedTilesPlacementScore(
  placedTiles: ReadonlyArray<{ tile: Tile }>,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
  level: Pick<Level, "goalFocusWeights">,
): number {
  return sumPlacedTilesScoreBreakdown(placedTiles, puzzleItems, level).total;
}

export function levelPassThresholdScore(
  level: Pick<Level, "pointMinimum" | "goalFocusWeights">,
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>,
): number {
  return scoreFromAccumulatedPointMatrix(level.pointMinimum, missionGoalDimensions);
}

export function isPlacementPassed(
  placementScore: number,
  quizScore: number,
  level: Pick<Level, "pointMinimum" | "goalFocusWeights">,
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>,
): boolean {
  const threshold = levelPassThresholdScore(level, missionGoalDimensions);
  return placementScore + quizScore >= threshold;
}
