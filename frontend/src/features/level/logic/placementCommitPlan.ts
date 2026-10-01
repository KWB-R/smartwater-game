import type { DistrictLevelPuzzleItem } from "@/types/content";
import type { Level, Tile } from "@/features/level/types";
import {
  getPlacementScoreSteps,
  type PlacementScoreSteps,
} from "@/features/level/logic/placementRewardSteps";
import { sumPlacedTilesPlacementScore } from "@/features/level/logic/placementScoring";
import { hasKombiChildPuzzleLink } from "@/features/level/logic/tilePuzzleMatch";
import { shouldShowKombiUnlockOverlayAfterPlacement } from "@/features/level/logic/levelPageUtils";

/**
 * Berechnet Punkte und Abschlussfolgen einer Platzierung ohne Seiteneffekte.
 * Die Prüfung der Zeigerposition bleibt beim Aufrufer.
 */

type PlacementCommitRejection = {
  kind: "rejected";
  reason: "rewardBlocking" | "boardFull" | "alreadyPlaced";
};

type PlacementCommitPlan = {
  kind: "commit";
  steps: PlacementScoreSteps;
  /** Gewichtete Punkte vor der Platzierung. */
  prevWeighted: number;
  /** Gewichtete Punkte nach der Platzierung. */
  targetWeighted: number;
  /** Die Platzierung schaltet ein Kombiteil frei und erhöht das Puzzlelimit. */
  hasSocket: boolean;
  /** Die Platzierung erreicht das Puzzlelimit. */
  puzzleCompletesWithPlacement: boolean;
  /** Nach der Platzierung den Kombihinweis zeigen, sofern das Puzzle noch nicht beendet ist. */
  showComboAfterPlacement: boolean;
  /** Die Platzierung erhöht den Missionsbalken. */
  hasBarReward: boolean;
};

export type PlacementCommitDecision =
  | PlacementCommitRejection
  | PlacementCommitPlan;

export type PlacementCommitInput = {
  tile: Tile;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  cappedLevel: Pick<
    Level,
    "goalFocusWeights" | "pointMaximum" | "maximumTileCount"
  >;
  placedTiles: ReadonlyArray<{ tile: Tile }>;
  currentMaxTileCount: number;
  placementRewardBlocking: boolean;
};

export function resolvePlacementCommitPlan(
  input: PlacementCommitInput,
): PlacementCommitDecision {
  const {
    tile,
    puzzleItems,
    cappedLevel,
    placedTiles,
    currentMaxTileCount,
    placementRewardBlocking,
  } = input;

  if (placementRewardBlocking) {
    return { kind: "rejected", reason: "rewardBlocking" };
  }
  if (placedTiles.length >= currentMaxTileCount) {
    return { kind: "rejected", reason: "boardFull" };
  }
  if (placedTiles.some((pt) => pt.tile.id === tile.id)) {
    return { kind: "rejected", reason: "alreadyPlaced" };
  }

  const prevWeighted = sumPlacedTilesPlacementScore(
    placedTiles,
    puzzleItems,
    cappedLevel,
  );
  const steps = getPlacementScoreSteps(tile, puzzleItems, cappedLevel);
  const targetWeighted = prevWeighted + steps.baseDelta + steps.focusExtraDelta;
  const hasSocket = hasKombiChildPuzzleLink(tile, puzzleItems);
  const placedCountBefore = placedTiles.length;
  const comboUiAfterPlacement = shouldShowKombiUnlockOverlayAfterPlacement({
    placedCountBefore,
    currentMaxTileCount,
    levelMaximumTileCount: cappedLevel.maximumTileCount,
    hasKombiChildLink: hasSocket,
  });
  // Kombi-Freischaltung erweitert das Limit um 1 — dann zählt das erhöhte Limit.
  const puzzleCompletesWithPlacement =
    placedCountBefore + 1 >=
    (hasSocket
      ? Math.min(cappedLevel.maximumTileCount, currentMaxTileCount + 1)
      : currentMaxTileCount);
  const showComboAfterPlacement =
    comboUiAfterPlacement && !puzzleCompletesWithPlacement;
  const hasBarReward = steps.baseDelta !== 0 || steps.focusExtraDelta !== 0;

  return {
    kind: "commit",
    steps,
    prevWeighted,
    targetWeighted,
    hasSocket,
    puzzleCompletesWithPlacement,
    showComboAfterPlacement,
    hasBarReward,
  };
}
