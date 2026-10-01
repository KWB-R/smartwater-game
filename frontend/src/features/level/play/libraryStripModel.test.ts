import { describe, expect, it } from "vitest";
import type { Level } from "@/features/level/types";
import {
  isWaitingForCmsPuzzle,
  resolveLibrarySkeletonSlotCount,
  resolveLibraryStripLoading,
} from "@/features/level/play/libraryStripModel";

function makeLevel(tileCount: number, maximumTileCount = 4): Level {
  return {
    id: 1,
    name: "test",
    maximumTileCount,
    tiles: Array.from({ length: tileCount }, (_, i) => ({
      id: i + 1,
      configId: `t${i}`,
      categoryId: "c",
      placed: false,
    })),
    background: { url: "" },
  } as unknown as Level;
}

describe("isWaitingForCmsPuzzle", () => {
  it("true nur bei route + loading + leere puzzle/tiles", () => {
    expect(
      isWaitingForCmsPuzzle({
        levelIdParam: "abc",
        puzzleItemsLength: 0,
        cmsLevelStatus: "loading",
        levelTilesLength: 0,
      }),
    ).toBe(true);
  });

  it("false ohne routeId", () => {
    expect(
      isWaitingForCmsPuzzle({
        levelIdParam: "  ",
        puzzleItemsLength: 0,
        cmsLevelStatus: "loading",
        levelTilesLength: 0,
      }),
    ).toBe(false);
  });
});

describe("resolveLibrarySkeletonSlotCount", () => {
  it("fallback auf max(3,min(6,maxTileCount)) während CMS-Loading", () => {
    expect(
      resolveLibrarySkeletonSlotCount({
        cappedLevel: makeLevel(0, 5),
        puzzleItems: [],
        levelIdParam: "x",
        cmsLevelStatus: "loading",
      }),
    ).toBe(5);
  });
});

describe("resolveLibraryStripLoading", () => {
  it("false wenn availableTiles schon da", () => {
    expect(
      resolveLibraryStripLoading({
        availableTilesLength: 2,
        levelIdParam: "x",
        puzzleItems: [],
        cmsLevelStatus: "success",
        cappedLevel: makeLevel(4),
        placedTilesLength: 0,
        currentMaxTileCount: 4,
      }),
    ).toBe(false);
  });

  it("true während CMS-Wartezustand", () => {
    expect(
      resolveLibraryStripLoading({
        availableTilesLength: 0,
        levelIdParam: "x",
        puzzleItems: [],
        cmsLevelStatus: "loading",
        cappedLevel: makeLevel(0),
        placedTilesLength: 0,
        currentMaxTileCount: 4,
      }),
    ).toBe(true);
  });
});
