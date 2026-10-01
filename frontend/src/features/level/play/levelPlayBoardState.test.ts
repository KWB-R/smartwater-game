import { describe, expect, it } from "vitest";
import { emptyPoints } from "@/features/level/logic/points";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import type { Level, Tile } from "@/features/level/types";
import type { PlacedTile } from "@/features/level/logic/levelState";
import {
  createInitialLevelPlayBoardState,
  levelPlayBoardReducer,
  type LevelPlayBoardState,
  type PlacementCommittedPayload,
} from "@/features/level/play/levelPlayBoardState";

function makeTile(id: number, configId: string, placed = false): Tile {
  return {
    id,
    configId,
    name: configId,
    content: null,
    image: { id, url: "" },
    position: { x: 0, y: 0 },
    size: { x: 10, y: 10 },
    placed,
    helper: null,
    socket: null,
    measureEffective: true,
    pointMatrix: emptyPoints(),
  };
}

function makeLevel(tiles: Tile[], maximumTileCount = 4): Level {
  return {
    id: 1,
    name: "Test",
    background: { id: 1, url: "" },
    tiles,
    maximumTileCount,
    goalFocusWeights: {},
    pointMaximum: emptyPoints(),
  } as unknown as Level;
}

function placed(tile: Tile): PlacedTile {
  return { placementKey: `p-${tile.id}`, tile, position: tile.position };
}

const puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem> = [
  {
    uniqueId: "baum",
    name: "Baum",
    content: null,
    punkte: { climate: { bonus: 3, isMission: true } },
  },
];

const tileA = makeTile(1, "baum");
const tileB = makeTile(2, "hecke");
const level = makeLevel([tileA, tileB]);

function commitPayload(
  overrides: Partial<PlacementCommittedPayload> = {},
): PlacementCommittedPayload {
  return {
    tile: tileA,
    nextPlacedTiles: [placed(tileA)],
    pointMatrix: emptyPoints(),
    missionGoalDimensions: new Set(),
    hasSocket: false,
    maxTileCountCap: 4,
    showComboAfterPlacement: false,
    puzzleCompletesWithPlacement: false,
    pendingComboTiles: [],
    puzzleItems,
    hasBarReward: false,
    prevWeighted: 0,
    ...overrides,
  };
}

function stateWith(
  overrides: Partial<LevelPlayBoardState> = {},
): LevelPlayBoardState {
  return { ...createInitialLevelPlayBoardState(level), ...overrides };
}

describe("levelPlayBoardReducer", () => {
  it("levelRestarted setzt alles zurück und füllt die Library initial", () => {
    const dirty = stateWith({
      placedTiles: [placed(tileA)],
      barScoreAnimationOverride: 22,
      placementRewardBlocking: true,
      comboDialogOpen: true,
      comboDialogTile: tileB,
      hiddenComboTileIds: new Set([2]),
      draggingTileId: 1,
      maxTileCount: { base: 4, count: 5 },
    });
    const next = levelPlayBoardReducer(dirty, {
      type: "levelRestarted",
      cappedLevel: level,
      puzzleItems,
    });
    expect(next.placedTiles).toEqual([]);
    expect(next.barScoreAnimationOverride).toBeNull();
    expect(next.placementRewardBlocking).toBe(false);
    expect(next.comboDialogOpen).toBe(false);
    expect(next.comboDialogTile).toBeNull();
    expect(next.hiddenComboTileIds.size).toBe(0);
    expect(next.draggingTileId).toBeNull();
    expect(next.maxTileCount).toEqual({ base: 4, count: 4 });
    expect(next.availableTiles.map((t) => t.id)).toEqual([1, 2]);
  });

  it("sessionRestored übernimmt Board-Snapshot, base bleibt", () => {
    const next = levelPlayBoardReducer(stateWith(), {
      type: "sessionRestored",
      placedTiles: [placed(tileA)],
      levelPoints: emptyPoints(),
      maxTileCount: 2,
    });
    expect(next.placedTiles).toHaveLength(1);
    expect(next.maxTileCount).toEqual({ base: 4, count: 2 });
  });

  it("maxTileCountBaseChanged resettet count auf neuen Base (min 1)", () => {
    const next = levelPlayBoardReducer(
      stateWith({ maxTileCount: { base: 4, count: 2 } }),
      { type: "maxTileCountBaseChanged", base: 0 },
    );
    expect(next.maxTileCount).toEqual({ base: 0, count: 1 });
  });

  it("placementCommitted markiert Library-Tile als platziert", () => {
    const start = stateWith({ availableTiles: [tileA, tileB] });
    const next = levelPlayBoardReducer(start, {
      type: "placementCommitted",
      ...commitPayload(),
    });
    expect(next.placedTiles).toHaveLength(1);
    expect(
      next.availableTiles.find((t) => t.id === tileA.id)?.placed,
    ).toBe(true);
    expect(next.placementRewardBlocking).toBe(false);
  });

  it("placementCommitted mit Bar-Reward blockiert und friert Override ein", () => {
    const next = levelPlayBoardReducer(
      stateWith({ availableTiles: [tileA] }),
      {
        type: "placementCommitted",
        ...commitPayload({ hasBarReward: true, prevWeighted: 10 }),
      },
    );
    expect(next.placementRewardBlocking).toBe(true);
    expect(next.barScoreAnimationOverride).toBe(10);
  });

  it("placementCommitted ohne Bar-Reward lässt den Override in Ruhe", () => {
    const next = levelPlayBoardReducer(
      stateWith({ availableTiles: [tileA] }),
      { type: "placementCommitted", ...commitPayload() },
    );
    expect(next.barScoreAnimationOverride).toBeNull();
  });

  it("placementCommitted mit Socket schaltet Zug frei (gecappt)", () => {
    const capped = levelPlayBoardReducer(
      stateWith({ maxTileCount: { base: 4, count: 4 } }),
      {
        type: "placementCommitted",
        ...commitPayload({ hasSocket: true, maxTileCountCap: 4 }),
      },
    );
    expect(capped.maxTileCount.count).toBe(4);
    const freed = levelPlayBoardReducer(
      stateWith({ maxTileCount: { base: 4, count: 2 } }),
      {
        type: "placementCommitted",
        ...commitPayload({ hasSocket: true, maxTileCountCap: 4 }),
      },
    );
    expect(freed.maxTileCount.count).toBe(3);
  });

  it("placementCommitted mit Kombi setzt Dialog-Tile aus Pending", () => {
    const next = levelPlayBoardReducer(
      stateWith({ availableTiles: [tileA] }),
      {
        type: "placementCommitted",
        ...commitPayload({
          showComboAfterPlacement: true,
          pendingComboTiles: [tileB],
        }),
      },
    );
    expect(next.comboDialogTile?.id).toBe(tileB.id);
  });

  it("placementCommitted bei Puzzle-Abschluss schließt Combo-Dialog", () => {
    const next = levelPlayBoardReducer(
      stateWith({
        availableTiles: [tileA],
        comboDialogOpen: true,
        comboDialogTile: tileB,
      }),
      {
        type: "placementCommitted",
        ...commitPayload({ puzzleCompletesWithPlacement: true }),
      },
    );
    expect(next.comboDialogOpen).toBe(false);
    expect(next.comboDialogTile).toBeNull();
  });

  it("comboTilesRevealed merged neue Tiles dedupliziert in die Library", () => {
    const next = levelPlayBoardReducer(
      stateWith({
        availableTiles: [tileA],
        comboDialogTile: tileB,
        placementRewardBlocking: true,
      }),
      { type: "comboTilesRevealed", pendingTiles: [tileA, tileB], puzzleItems },
    );
    expect(next.availableTiles.map((t) => t.id).sort()).toEqual([1, 2]);
    expect(next.comboDialogTile).toBeNull();
    expect(next.placementRewardBlocking).toBe(false);
  });

  it("comboTilesRevealed ohne Pending lässt die Library unangetastet", () => {
    const start = stateWith({ availableTiles: [tileA] });
    const next = levelPlayBoardReducer(start, {
      type: "comboTilesRevealed",
      pendingTiles: [],
      puzzleItems,
    });
    expect(next.availableTiles).toBe(start.availableTiles);
  });

  it("comboRevealTilesShown zeigt Pop-Ids und leert Reserved/Hidden", () => {
    const next = levelPlayBoardReducer(
      stateWith({
        hiddenComboTileIds: new Set([2]),
        comboRevealReservedTileIds: new Set([2]),
      }),
      { type: "comboRevealTilesShown", tileIds: [2] },
    );
    expect(next.hiddenComboTileIds.size).toBe(0);
    expect(next.comboRevealReservedTileIds.size).toBe(0);
    expect([...next.comboRevealPopTileIds]).toEqual([2]);
  });

  it("barScoreAnimationSet setzt und löst den Override auf", () => {
    const running = levelPlayBoardReducer(stateWith(), {
      type: "barScoreAnimationSet",
      value: 30,
    });
    expect(running.barScoreAnimationOverride).toBe(30);
    const finished = levelPlayBoardReducer(running, {
      type: "barScoreAnimationSet",
      value: null,
    });
    expect(finished.barScoreAnimationOverride).toBeNull();
  });

  it("placedTilesRefreshed tauscht Tile-Objekte gegen frische Level-Daten", () => {
    const stale = { ...tileA, name: "alt" };
    const next = levelPlayBoardReducer(
      stateWith({ placedTiles: [placed(stale)] }),
      { type: "placedTilesRefreshed", level },
    );
    expect(next.placedTiles[0]?.tile.name).toBe("baum");
    expect(next.placedTiles[0]?.tile.placed).toBe(true);
  });
});
