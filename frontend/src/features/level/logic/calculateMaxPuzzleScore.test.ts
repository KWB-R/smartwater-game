import { describe, expect, it } from "vitest";
import {
  calculateMaxPuzzleScore,
  type PuzzleItem,
} from "@/features/level/logic/calculateMaxPuzzleScore";

function item(
  name: string,
  entries: { value: number; type: "mission" | "bonus" | "base" }[],
): PuzzleItem {
  const points: PuzzleItem["points"] = {};
  entries.forEach((e, i) => {
    points[`k${i}`] = e;
  });
  return { name, points };
}

describe("calculateMaxPuzzleScore", () => {
  it("berechnet weightedScore = mission×4 + bonus×2 + base", () => {
    const items = [
      item("a", [{ value: 3, type: "mission" }]),
      item("b", [{ value: 4, type: "bonus" }]),
      item("c", [{ value: 5, type: "base" }]),
    ];
    const best = calculateMaxPuzzleScore(items, 3);
    expect(best.missionPoints).toBe(3);
    expect(best.bonusPoints).toBe(4);
    expect(best.basePoints).toBe(5);
    expect(best.weightedScore).toBe(3 * 4 + 4 * 2 + 5);
    expect(best.selectedItems.map((x) => x.name).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("wählt bei gleicher Punktzahl mehr Missionspunkte", () => {
    const items = [
      item("missionHeavy", [{ value: 5, type: "mission" }]),
      item("bonusHeavy", [{ value: 10, type: "bonus" }]),
      item("mix", [
        { value: 2, type: "mission" },
        { value: 6, type: "bonus" },
      ]),
    ];
    const best = calculateMaxPuzzleScore(items, 1);
    // Bei jeweils 20 Punkten hat die Missionswertung Vorrang.
    expect(best.weightedScore).toBe(20);
    expect(best.selectedItems[0]?.name).toBe("missionHeavy");
  });

  it("respektiert maxPuzzleItems", () => {
    const items = [
      item("a", [{ value: 1, type: "mission" }]),
      item("b", [{ value: 1, type: "mission" }]),
      item("c", [{ value: 1, type: "mission" }]),
    ];
    const best = calculateMaxPuzzleScore(items, 2);
    expect(best.missionPoints).toBe(2);
    expect(best.weightedScore).toBe(8);
    expect(best.selectedItems).toHaveLength(2);
  });

  it("liefert 0 bei leerer Liste", () => {
    expect(calculateMaxPuzzleScore([], 3).weightedScore).toBe(0);
  });
});
