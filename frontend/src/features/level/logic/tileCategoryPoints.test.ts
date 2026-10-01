import { describe, expect, it } from "vitest";
import { emptyPoints } from "@/features/level/logic/points";
import {
  activeMissionGoalDimensions,
  tileCategoryFilledDots,
  tileCategoryFilledDotsFromPunkte,
} from "@/features/level/logic/tileCategoryPoints";
import type { Level } from "@/features/level/types";

const level = {
  goalFocusWeights: {},
  pointMaximum: {
    default: 0,
    cooling: 10,
    flooding: 10,
    water: 10,
    biodiversity: 10,
    quality: 10,
  },
} as Level;

describe("tileCategoryPoints", () => {
  it("maps green_water dots to the water dimension", () => {
    const matrix = emptyPoints();
    matrix.water = 5;

    expect(tileCategoryFilledDots("green_water", matrix, level)).toBe(2);
  });

  it("maps green_water CMS bonus 1:1 to detail dots (0–3)", () => {
    expect(
      tileCategoryFilledDotsFromPunkte(
        "green_water",
        {
          water_protection: { bonus: 9, isBonus: true },
          green_water: { bonus: 3, isBonus: true },
        },
        level,
      ),
    ).toBe(3);
    expect(
      tileCategoryFilledDotsFromPunkte(
        "water_protection",
        { water_protection: { bonus: 3, isBonus: true } },
        level,
      ),
    ).toBe(3);
  });

  it("maps green_water missions to the water goal dimension", () => {
    const dims = activeMissionGoalDimensions(
      [{ punkte: { green_water: { bonus: 2, isMission: true } } }],
      level,
    );

    expect(dims.has("water")).toBe(true);
  });
});
