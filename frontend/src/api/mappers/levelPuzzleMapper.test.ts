import { describe, expect, it } from "vitest";

import {
  mapLevelPlacementOrder,
  mapLevelPuzzleItems,
} from "@/api/mappers/levelPuzzleMapper";

const punkte = {
  bio_bonus: 1,
  bio_isBonus: true,
  bio_isMission: false,
};

describe("mapLevelPlacementOrder", () => {
  it("keeps end-animation entries and skips them in puzzle items", () => {
    const raw = [
      {
        __component: "object.puzzle-item",
        uniqueId: "baum",
        name: "Baum",
        punkte,
      },
      {
        __component: "object.end-animation",
        uniqueId: "endanimation_1",
      },
      {
        __component: "object.puzzle-item",
        uniqueId: "mulde",
        name: "Mulde",
        punkte,
      },
    ];

    expect(mapLevelPlacementOrder(raw)).toEqual([
      { kind: "puzzle", uniqueId: "baum" },
      { kind: "endAnimation", uniqueId: "endanimation_1" },
      { kind: "puzzle", uniqueId: "mulde" },
    ]);
    expect(mapLevelPuzzleItems(raw).map((p) => p.uniqueId)).toEqual([
      "baum",
      "mulde",
    ]);
  });
});
