import { describe, expect, it } from "vitest";
import { pointMatrixFromPunkte } from "@/features/level/logic/punkteToPointMatrix";

describe("pointMatrixFromPunkte", () => {
  it("sums categories that map to the same goal dimension", () => {
    const matrix = pointMatrixFromPunkte({
      water_protection: { bonus: 2, isBonus: true },
      green_water: { bonus: 3, isBonus: true },
    });

    expect(matrix.water).toBe(5);
    expect(matrix.default).toBe(1);
  });
});
