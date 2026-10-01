import { describe, expect, it } from "vitest";
import {
  BONUS_POINTS_WEIGHT,
  MISSION_POINTS_WEIGHT,
} from "@/features/level/logic/scoringConstants";
import {
  bonusCategoryIdsFromPunkte,
  scoreBreakdownFromPunkte,
  sumMissionCategoryPointsFromPlaced,
  sumPlacedTilesScoreBreakdown,
  tilePlacementBonusCategoryIds,
  tilePlacementScore,
  tilePlacementScoreBreakdown,
} from "@/features/level/logic/placementScoring";
import type { LevelPunkteRecord } from "@/domain/levelBonusCategories";
import { emptyPoints } from "@/features/level/logic/points";
import type { Level, Tile } from "@/features/level/types";

const levelMission = new Set(["climate", "bio"] as const);

describe("scoreBreakdownFromPunkte", () => {
  it("zählt Mission ×4, Bonus ×2, Basis ×1", () => {
    const punkte: LevelPunkteRecord = {
      climate: { bonus: 3, isMission: true },
      bio: { bonus: 2, isMission: true },
      flood_prevention: { bonus: 4, isBonus: true },
      green_spaces: { bonus: 1 },
    };
    const { missionPoints, bonusPoints, basePoints, total } =
      scoreBreakdownFromPunkte(punkte, levelMission);
    expect(missionPoints).toBe(5);
    expect(bonusPoints).toBe(4);
    expect(basePoints).toBe(1);
    expect(total).toBe(
      missionPoints * MISSION_POINTS_WEIGHT +
        bonusPoints * BONUS_POINTS_WEIGHT +
        basePoints,
    );
  });

  it("zählt Kategorien ohne isBonus als Basispunkte", () => {
    const punkte: LevelPunkteRecord = {
      flood_prevention: { bonus: 5 },
    };
    const { missionPoints, bonusPoints, basePoints, total } =
      scoreBreakdownFromPunkte(punkte, levelMission);
    expect(missionPoints).toBe(0);
    expect(bonusPoints).toBe(0);
    expect(basePoints).toBe(5);
    expect(total).toBe(5);
  });
});

describe("bonusCategoryIdsFromPunkte", () => {
  it("listet nur isBonus-Kategorien außerhalb der Level-Mission", () => {
    const punkte: LevelPunkteRecord = {
      climate: { bonus: 3, isMission: true },
      green_spaces: { bonus: 2, isBonus: true },
      flood_prevention: { bonus: 4, isBonus: true },
      green_water: { bonus: 1, isBonus: true },
    };
    expect(bonusCategoryIdsFromPunkte(punkte, levelMission)).toEqual([
      "flood_prevention",
      "green_spaces",
      "green_water",
    ]);
  });
});

describe("tilePlacementBonusCategoryIds", () => {
  const level: Pick<Level, "goalFocusWeights"> = {
    goalFocusWeights: { cooling: 2 },
  };

  const tile: Tile = {
    id: 2,
    configId: "gruen",
    name: "Grün",
    content: null,
    image: { id: 1, url: "" },
    position: { x: 0, y: 0 },
    size: { x: 10, y: 10 },
    placed: false,
    helper: null,
    socket: null,
    measureEffective: true,
    pointMatrix: emptyPoints(),
  };

  it("liefert Kategorien aus CMS-punkte", () => {
    const puzzleItems = [
      {
        uniqueId: "gruen",
        name: "Grün",
        content: null,
        punkte: {
          green_water: { bonus: 3, isBonus: true },
        },
      },
    ];
    expect(tilePlacementBonusCategoryIds(tile, puzzleItems, level)).toEqual([
      "green_water",
    ]);
  });
});

describe("tilePlacementScore", () => {
  const level: Pick<Level, "goalFocusWeights"> = {
    goalFocusWeights: { cooling: 2 },
  };

  const tile: Tile = {
    id: 1,
    configId: "baum",
    name: "Baum",
    content: null,
    image: { id: 1, url: "" },
    position: { x: 0, y: 0 },
    size: { x: 10, y: 10 },
    placed: false,
    helper: null,
    socket: null,
    measureEffective: true,
    pointMatrix: emptyPoints(),
  };

  it("nutzt CMS-punkte über uniqueId", () => {
    const puzzleItems = [
      {
        uniqueId: "baum",
        name: "Baum",
        content: null,
        punkte: {
          climate: { bonus: 3, isMission: true },
          green_spaces: { bonus: 2, isBonus: true },
        },
      },
    ];
    const score = tilePlacementScore(tile, puzzleItems, level);
    expect(score).toBe(3 * MISSION_POINTS_WEIGHT + 2 * BONUS_POINTS_WEIGHT);
  });

  it("tilePlacementScoreBreakdown stimmt mit tilePlacementScore überein", () => {
    const puzzleItems = [
      {
        uniqueId: "baum",
        name: "Baum",
        content: null,
        punkte: {
          climate: { bonus: 3, isMission: true },
          green_spaces: { bonus: 2, isBonus: true },
        },
      },
    ];
    const b = tilePlacementScoreBreakdown(tile, puzzleItems, level);
    expect(b.total).toBe(tilePlacementScore(tile, puzzleItems, level));
    expect(b.missionPoints).toBe(3);
    expect(b.bonusPoints).toBe(2);
    expect(b.basePoints).toBe(0);
  });
});

describe("sumMissionCategoryPointsFromPlaced", () => {
  const level: Pick<Level, "goalFocusWeights"> = {
    goalFocusWeights: { cooling: 2, biodiversity: 2 },
  };

  const tile: Tile = {
    id: 1,
    configId: "a",
    name: "A",
    content: null,
    image: { id: 1, url: "" },
    position: { x: 0, y: 0 },
    size: { x: 10, y: 10 },
    placed: true,
    helper: null,
    socket: null,
    measureEffective: true,
    pointMatrix: emptyPoints(),
  };

  it("summiert nur aktive Missions-Kategorien aus CMS", () => {
    const puzzleItems = [
      {
        uniqueId: "a",
        name: "A",
        content: null,
        punkte: {
          climate: { bonus: 3, isMission: true },
          bio: { bonus: 2, isMission: true },
          flood_prevention: { bonus: 9, isBonus: true },
        },
      },
    ];
    const totals = sumMissionCategoryPointsFromPlaced(
      [{ tile }],
      puzzleItems,
      level,
    );
    expect(totals.get("climate")).toBe(3);
    expect(totals.get("bio")).toBe(2);
    expect(totals.has("flood_prevention")).toBe(false);
    const breakdown = sumPlacedTilesScoreBreakdown(
      [{ tile }],
      puzzleItems,
      level,
    );
    expect(breakdown.missionPoints).toBe(5);
  });
});
