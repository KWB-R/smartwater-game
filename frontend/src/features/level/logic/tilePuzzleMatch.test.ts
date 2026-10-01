import { describe, expect, it } from "vitest";
import type { Level, Tile } from "@/features/level/types";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import {
  hasKombiChildPuzzleLink,
  isKombiChildTile,
  resolveKombiChildTilesForParent,
} from "@/features/level/logic/tilePuzzleMatch";

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
    uniqueId: "parent",
    name: "Parent",
    kombiChild: "child",
    content: null,
    punkte: {},
  },
  {
    uniqueId: "child",
    name: "Child",
    kombiChild: null,
    content: null,
    punkte: {},
  },
];

const level = {
  maximumTileCount: 2,
  tiles: [
    tile({ id: 1, configId: "parent" }),
    tile({
      id: 2,
      configId: "child",
      socket: null,
    }),
  ],
} as Level;

describe("tilePuzzleMatch kombiChild", () => {
  it("marks child via parent kombiChild ref", () => {
    const parent = level.tiles[0]!;
    const child = tile({ id: 99, configId: "child" });
    expect(hasKombiChildPuzzleLink(parent, puzzleItems)).toBe(true);
    expect(isKombiChildTile(child, puzzleItems)).toBe(true);
    expect(isKombiChildTile(parent, puzzleItems)).toBe(false);
  });

  it("resolves kombi child tiles from level by uniqueId", () => {
    const parent = level.tiles[0]!;
    const resolved = resolveKombiChildTilesForParent(
      parent,
      {
        ...level,
        tiles: [
          parent,
          tile({
            id: 2,
            configId: "child",
            socket: [tile({ id: 3, configId: "child" })],
          }),
        ],
      },
      puzzleItems,
    );
    expect(resolved.map((t) => t.id).sort()).toEqual([2, 3]);
  });
});
