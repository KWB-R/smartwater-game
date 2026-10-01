import { describe, expect, it } from "vitest";
import type { Level, Tile } from "@/features/level/types";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import {
  buildAvailableTilesForLibrary,
  getInitialAvailableTiles,
  kombiTilesUnlockedByPlacedParents,
  shouldShowKombiUnlockOverlayAfterPlacement,
} from "@/features/level/logic/levelPageUtils";

function tile(partial: Partial<Tile> & Pick<Tile, "id" | "configId">): Tile {
  return {
    name: partial.configId ?? "t",
    position: { x: 0, y: 0 },
    size: { x: 10, y: 10 },
    image: { url: "/x.webp" },
    helper: null,
    socket: null,
    placed: false,
    pointMatrix: null,
    content: null,
    ...partial,
  } as Tile;
}

const puzzleItems: DistrictLevelPuzzleItem[] = [
  {
    uniqueId: "mulde",
    name: "Mulde",
    kombiChild: "baum",
    content: null,
    punkte: {},
  },
  {
    uniqueId: "baum",
    name: "Baum",
    kombiChild: null,
    content: null,
    punkte: {},
  },
];

const level = {
  tiles: [
    tile({ id: 1, configId: "mulde" }),
    tile({ id: 2, configId: "baum" }),
  ],
} as Level;

describe("levelPageUtils library strip", () => {
  it("excludes kombi children from initial strip", () => {
    const strip = getInitialAvailableTiles(level, puzzleItems);
    expect(strip.map((t) => t.configId)).toEqual(["mulde"]);
  });

  it("includes kombi child only after parent placed", () => {
    const parent = level.tiles[0]!;
    const unlocked = kombiTilesUnlockedByPlacedParents(level, puzzleItems, [
      { placementKey: "p1", tile: parent, position: parent.position },
    ]);
    expect(unlocked.map((t) => t.configId)).toEqual(["baum"]);
  });

  it("defers kombi in library while reveal is pending", () => {
    const parent = level.tiles[0]!;
    const child = level.tiles[1]!;
    const strip = buildAvailableTilesForLibrary(
      getInitialAvailableTiles(level, puzzleItems),
      level,
      puzzleItems,
      [{ placementKey: "p1", tile: parent, position: parent.position }],
      new Set([child.id]),
    );
    expect(strip.map((t) => t.configId)).toEqual(["mulde"]);
    expect(strip[0]?.placed).toBe(true);
  });

  it("shows kombi in library after parent placed when not pending", () => {
    const parent = level.tiles[0]!;
    const strip = buildAvailableTilesForLibrary(
      getInitialAvailableTiles(level, puzzleItems),
      level,
      puzzleItems,
      [{ placementKey: "p1", tile: parent, position: parent.position }],
    );
    expect(strip.map((t) => t.configId)).toEqual(["mulde", "baum"]);
    expect(strip[0]?.placed).toBe(true);
    expect(strip[1]?.placed).toBe(false);
  });

  it("keeps placed kombi child in library strip for tile detail", () => {
    const parent = level.tiles[0]!;
    const child = level.tiles[1]!;
    const strip = buildAvailableTilesForLibrary(
      getInitialAvailableTiles(level, puzzleItems),
      level,
      puzzleItems,
      [
        { placementKey: "p1", tile: parent, position: parent.position },
        { placementKey: "p2", tile: child, position: child.position },
      ],
    );
    expect(strip.map((t) => t.configId)).toEqual(["mulde", "baum"]);
    expect(strip[0]?.placed).toBe(true);
    expect(strip[1]?.placed).toBe(true);
  });
});

describe("shouldShowKombiUnlockOverlayAfterPlacement", () => {
  it("shows overlay when socket opens another slot", () => {
    expect(
      shouldShowKombiUnlockOverlayAfterPlacement({
        placedCountBefore: 3,
        currentMaxTileCount: 5,
        levelMaximumTileCount: 6,
        hasKombiChildLink: true,
      }),
    ).toBe(true);
  });

  it("hides overlay when puzzle completes with this tile", () => {
    expect(
      shouldShowKombiUnlockOverlayAfterPlacement({
        placedCountBefore: 5,
        currentMaxTileCount: 6,
        levelMaximumTileCount: 6,
        hasKombiChildLink: false,
      }),
    ).toBe(false);
    expect(
      shouldShowKombiUnlockOverlayAfterPlacement({
        placedCountBefore: 5,
        currentMaxTileCount: 6,
        levelMaximumTileCount: 6,
        hasKombiChildLink: true,
      }),
    ).toBe(false);
  });

  it("hides overlay when parent fills board before kombi slot at cap", () => {
    expect(
      shouldShowKombiUnlockOverlayAfterPlacement({
        placedCountBefore: 4,
        currentMaxTileCount: 5,
        levelMaximumTileCount: 5,
        hasKombiChildLink: true,
      }),
    ).toBe(false);
  });
});
