import { describe, expect, it } from "vitest";

import type { LevelEndAnimationSpec } from "@/features/level/mappers/levelFromConfig";
import {
  placedTilesInCmsOrder,
  placedTilesWithEndAnimation,
} from "@/features/level/mappers/endAnimationPlacement";
import type { PlacedTile } from "@/features/level/logic/levelState";
import type { Tile } from "@/features/level/types";
import { emptyPoints } from "@/features/level/logic/points";

function puzzlePlaced(configId: string, tileId: number): PlacedTile {
  const tile: Tile = {
    id: tileId,
    configId,
    name: configId,
    content: null,
    image: { id: tileId, url: "" },
    position: { x: 0, y: 0 },
    size: { x: 10, y: 10 },
    placed: true,
    helper: null,
    socket: null,
    placementVideo: null,
    measureEffective: true,
    pointMatrix: emptyPoints(),
  };
  return {
    placementKey: String(tileId),
    tile,
    position: { x: 0, y: 0 },
  };
}

function endSpec(configId: string): LevelEndAnimationSpec {
  return {
    configId,
    webUrl: `${configId}.webm`,
    movUrl: `${configId}.mov`,
    position: { x: 1, y: 2 },
    size: { x: 100, y: 200 },
  };
}

describe("placedTilesInCmsOrder", () => {
  it("sorts placed tiles by CMS dynamic zone order (later = on top in Pixi)", () => {
    const placed = [
      puzzlePlaced("gelaenderbegruenung", 1),
      puzzlePlaced("mulde", 2),
    ];
    const order = [
      { kind: "puzzle" as const, uniqueId: "mulde" },
      { kind: "puzzle" as const, uniqueId: "gelaenderbegruenung" },
    ];

    expect(placedTilesInCmsOrder(placed, order).map((p) => p.tile.configId)).toEqual(
      ["mulde", "gelaenderbegruenung"],
    );
  });
});

describe("placedTilesWithEndAnimation", () => {
  it("interleaves end animations by CMS placement order", () => {
    const placed = [puzzlePlaced("baum", 1), puzzlePlaced("mulde", 2)];
    const endAnimations = [endSpec("endanimation_1")];
    const order = [
      { kind: "puzzle" as const, uniqueId: "baum" },
      { kind: "endAnimation" as const, uniqueId: "endanimation_1" },
      { kind: "puzzle" as const, uniqueId: "mulde" },
    ];

    const result = placedTilesWithEndAnimation(placed, endAnimations, order);

    expect(result.map((p) => p.tile.configId)).toEqual([
      "baum",
      "endanimation_1",
      "mulde",
    ]);
  });

  it("appends config end animations when CMS has no end-animation markers", () => {
    const placed = [puzzlePlaced("baum", 1)];
    const endAnimations = [endSpec("endanimation_1")];
    const order = [{ kind: "puzzle" as const, uniqueId: "baum" }];

    const result = placedTilesWithEndAnimation(placed, endAnimations, order);

    expect(result.map((p) => p.tile.configId)).toEqual([
      "baum",
      "endanimation_1",
    ]);
  });

  it("appends end animation last when CMS order has no matching endAnimation entry", () => {
    const placed = [puzzlePlaced("baum", 1), puzzlePlaced("mulde", 2)];
    const endAnimations = [endSpec("endanimation_1")];
    const order = [
      { kind: "puzzle" as const, uniqueId: "baum" },
      { kind: "puzzle" as const, uniqueId: "mulde" },
    ];

    const result = placedTilesWithEndAnimation(placed, endAnimations, order);

    expect(result.map((p) => p.tile.configId)).toEqual([
      "baum",
      "mulde",
      "endanimation_1",
    ]);
  });

  it("appends config end animation last when CMS endAnimation uniqueId does not match config", () => {
    const placed = [puzzlePlaced("mulde", 2)];
    const endAnimations = [endSpec("endanimation_1")];
    const order = [
      { kind: "puzzle" as const, uniqueId: "mulde" },
      { kind: "endAnimation" as const, uniqueId: "other_end" },
    ];

    const result = placedTilesWithEndAnimation(placed, endAnimations, order);

    expect(result.map((p) => p.tile.configId)).toEqual([
      "mulde",
      "endanimation_1",
    ]);
  });
});
