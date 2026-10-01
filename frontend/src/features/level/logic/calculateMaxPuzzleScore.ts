import type { DistrictLevelPuzzleItem } from "@/types/content";
import {
  LEVEL_BONUS_CATEGORY_IDS,
  readCategoryBonusPoints,
  readCategoryIsBonus,
  type LevelBonusCategoryId,
} from "@/domain/levelBonusCategories";
import { activeMissionCategoryIds } from "@/features/level/logic/tileCategoryPoints";
import type { Level } from "@/features/level/types";
import {
  BASE_POINTS_WEIGHT,
  BONUS_POINTS_WEIGHT,
  MISSION_POINTS_WEIGHT,
} from "@/features/level/logic/scoringConstants";

type PointType = "mission" | "bonus" | "base";

type PointEntry = {
  value: number;
  type: PointType;
};

export type PuzzleItem = {
  name: string;
  points: Record<string, PointEntry | undefined>;
};

export type BestScoreResult = {
  selectedItems: PuzzleItem[];
  missionPoints: number;
  bonusPoints: number;
  basePoints: number;
  weightedScore: number;
};

export function weightedPlacementScore(
  missionPoints: number,
  bonusPoints: number,
  basePoints = 0,
): number {
  return (
    missionPoints * MISSION_POINTS_WEIGHT +
    bonusPoints * BONUS_POINTS_WEIGHT +
    basePoints * BASE_POINTS_WEIGHT
  );
}

function scoreSinglePuzzleItem(
  item: PuzzleItem,
): Pick<
  BestScoreResult,
  "missionPoints" | "bonusPoints" | "basePoints" | "weightedScore"
> {
  let missionPoints = 0;
  let bonusPoints = 0;
  let basePoints = 0;
  for (const entry of Object.values(item.points)) {
    if (!entry || entry.value <= 0) {
      continue;
    }
    if (entry.type === "mission") {
      missionPoints += entry.value;
    } else if (entry.type === "bonus") {
      bonusPoints += entry.value;
    } else {
      basePoints += entry.value;
    }
  }
  return {
    missionPoints,
    bonusPoints,
    basePoints,
    weightedScore: weightedPlacementScore(missionPoints, bonusPoints, basePoints),
  };
}

function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size < 0 || size > items.length) {
    return [];
  }
  if (size === 0) {
    return [[]];
  }
  const result: T[][] = [];
  const combo: T[] = [];

  function backtrack(start: number) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      combo.push(items[i]!);
      backtrack(i + 1);
      combo.pop();
    }
  }

  backtrack(0);
  return result;
}

function scoreCombination(selected: PuzzleItem[]): BestScoreResult {
  let missionPoints = 0;
  let bonusPoints = 0;
  let basePoints = 0;
  for (const item of selected) {
    const part = scoreSinglePuzzleItem(item);
    missionPoints += part.missionPoints;
    bonusPoints += part.bonusPoints;
    basePoints += part.basePoints;
  }
  return {
    selectedItems: selected,
    missionPoints,
    bonusPoints,
    basePoints,
    weightedScore: weightedPlacementScore(missionPoints, bonusPoints, basePoints),
  };
}

function isBetterCandidate(a: BestScoreResult, b: BestScoreResult): boolean {
  if (a.weightedScore !== b.weightedScore) {
    return a.weightedScore > b.weightedScore;
  }
  return a.missionPoints > b.missionPoints;
}

/**
 * Maximal erreichbare gewichtete Punktzahl aus bis zu `maxPuzzleItems` Puzzle-Items
 * (Kombinationen ohne Wiederholung, Größen 0 … maxPuzzleItems).
 */
export function calculateMaxPuzzleScore(
  items: PuzzleItem[],
  maxPuzzleItems: number,
): BestScoreResult {
  const cap = Math.max(0, Math.floor(maxPuzzleItems));
  let best: BestScoreResult = {
    selectedItems: [],
    missionPoints: 0,
    bonusPoints: 0,
    basePoints: 0,
    weightedScore: 0,
  };

  for (let size = 0; size <= cap; size++) {
    for (const combo of combinations(items, size)) {
      const candidate = scoreCombination(combo);
      if (isBetterCandidate(candidate, best)) {
        best = candidate;
      }
    }
  }

  return best;
}

function districtPuzzleItemToScoringItem(
  item: DistrictLevelPuzzleItem,
  levelMissionIds: ReadonlySet<LevelBonusCategoryId>,
): PuzzleItem {
  const points: Record<string, PointEntry | undefined> = {};
  for (const categoryId of LEVEL_BONUS_CATEGORY_IDS) {
    const value = readCategoryBonusPoints(item.punkte, categoryId);
    if (value <= 0) {
      continue;
    }
    if (levelMissionIds.has(categoryId)) {
      points[categoryId] = { value, type: "mission" };
      continue;
    }
    if (readCategoryIsBonus(item.punkte, categoryId)) {
      points[categoryId] = { value, type: "bonus" };
      continue;
    }
    points[categoryId] = { value, type: "base" };
  }
  return {
    name: item.name?.trim() || item.uniqueId,
    points,
  };
}

export function maxPlacementWeightedScore(
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
  level: Pick<Level, "goalFocusWeights">,
  maxPuzzleItems: number,
): number {
  const missionIds = activeMissionCategoryIds(puzzleItems, level);
  const scoringItems = puzzleItems.map((item) =>
    districtPuzzleItemToScoringItem(item, missionIds),
  );
  return calculateMaxPuzzleScore(scoringItems, maxPuzzleItems).weightedScore;
}
