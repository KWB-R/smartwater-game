import type { DistrictLevelPuzzleItem } from "@/types/content";
import type { Level } from "@/features/level/types";
import { getInitialAvailableTiles } from "@/features/level/logic/levelPageUtils";

/** Die CMS-Puzzleteile sind noch nicht geladen; die Bibliothek wartet auf die Daten. */
export function isWaitingForCmsPuzzle(input: {
  levelIdParam: string | undefined;
  puzzleItemsLength: number;
  cmsLevelStatus: string;
  levelTilesLength: number;
}): boolean {
  const routeId = input.levelIdParam?.trim() ?? "";
  return (
    routeId.length > 0 &&
    input.puzzleItemsLength === 0 &&
    input.cmsLevelStatus === "loading" &&
    input.levelTilesLength === 0
  );
}

export function resolveLibrarySkeletonSlotCount(input: {
  cappedLevel: Level;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  levelIdParam: string | undefined;
  cmsLevelStatus: string;
}): number {
  const fromStrip = getInitialAvailableTiles(
    input.cappedLevel,
    input.puzzleItems,
  ).length;
  if (fromStrip > 0) {
    return fromStrip;
  }
  const routeId = input.levelIdParam?.trim() ?? "";
  if (routeId.length > 0 && input.cmsLevelStatus === "loading") {
    return Math.min(6, Math.max(3, input.cappedLevel.maximumTileCount));
  }
  return Math.min(6, Math.max(3, input.cappedLevel.tiles.length));
}

export function resolveLibraryStripLoading(input: {
  availableTilesLength: number;
  levelIdParam: string | undefined;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  cmsLevelStatus: string;
  cappedLevel: Level;
  placedTilesLength: number;
  currentMaxTileCount: number;
}): boolean {
  if (input.availableTilesLength > 0) {
    return false;
  }
  if (
    isWaitingForCmsPuzzle({
      levelIdParam: input.levelIdParam,
      puzzleItemsLength: input.puzzleItems.length,
      cmsLevelStatus: input.cmsLevelStatus,
      levelTilesLength: input.cappedLevel.tiles.length,
    })
  ) {
    return true;
  }
  if (
    getInitialAvailableTiles(input.cappedLevel, input.puzzleItems).length > 0
  ) {
    return true;
  }
  if (
    input.placedTilesLength >= input.currentMaxTileCount &&
    input.cappedLevel.tiles.length > 0
  ) {
    return false;
  }
  return (
    input.cappedLevel.tiles.length > 0 &&
    input.placedTilesLength < input.currentMaxTileCount
  );
}
