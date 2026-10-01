import { describe, expect, it } from "vitest";
import {
  BONUS_POINTS_WEIGHT,
  MISSION_POINTS_WEIGHT,
} from "@/features/level/logic/scoringConstants";
import { resolvePlacementCommitPlan } from "@/features/level/logic/placementCommitPlan";
import { emptyPoints } from "@/features/level/logic/points";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import type { Tile } from "@/features/level/types";

function makeTile(id: number, configId: string): Tile {
  return {
    id,
    configId,
    name: configId,
    content: null,
    image: { id, url: "" },
    position: { x: 0, y: 0 },
    size: { x: 10, y: 10 },
    placed: false,
    helper: null,
    socket: null,
    measureEffective: true,
    pointMatrix: emptyPoints(),
  };
}

const level = {
  goalFocusWeights: {},
  pointMaximum: {
    default: 8,
    cooling: 8,
    flooding: 5,
    water: 5,
    biodiversity: 5,
    quality: 5,
  },
  maximumTileCount: 4,
};

const baumItem: DistrictLevelPuzzleItem = {
  uniqueId: "baum",
  name: "Baum",
  content: null,
  punkte: {
    climate: { bonus: 3, isMission: true },
    green_spaces: { bonus: 2, isBonus: true },
  },
};

const kombiParentItem: DistrictLevelPuzzleItem = {
  uniqueId: "eisdiele",
  name: "Eisdiele",
  content: null,
  kombiChild: "kaffeemaschine",
  punkte: {
    climate: { bonus: 1, isMission: true },
  },
};

const puzzleItems = [baumItem, kombiParentItem];

function commitInput(
  overrides: Partial<Parameters<typeof resolvePlacementCommitPlan>[0]>,
) {
  return {
    tile: makeTile(1, "baum"),
    puzzleItems,
    cappedLevel: level,
    placedTiles: [],
    currentMaxTileCount: 3,
    placementRewardBlocking: false,
    ...overrides,
  };
}

describe("resolvePlacementCommitPlan", () => {
  it("lehnt ab, solange die Reward-Sequenz blockiert", () => {
    expect(
      resolvePlacementCommitPlan(
        commitInput({ placementRewardBlocking: true }),
      ),
    ).toEqual({ kind: "rejected", reason: "rewardBlocking" });
  });

  it("lehnt ab, wenn das Board voll ist", () => {
    expect(
      resolvePlacementCommitPlan(
        commitInput({
          placedTiles: [
            { tile: makeTile(2, "a") },
            { tile: makeTile(3, "b") },
            { tile: makeTile(4, "c") },
          ],
        }),
      ),
    ).toEqual({ kind: "rejected", reason: "boardFull" });
  });

  it("lehnt doppelte Platzierung desselben Tiles ab", () => {
    expect(
      resolvePlacementCommitPlan(
        commitInput({ placedTiles: [{ tile: makeTile(1, "baum") }] }),
      ),
    ).toEqual({ kind: "rejected", reason: "alreadyPlaced" });
  });

  it("berechnet Score-Steps und Zielscore aus den CMS-Punkten", () => {
    const plan = resolvePlacementCommitPlan(commitInput({}));
    expect(plan.kind).toBe("commit");
    if (plan.kind !== "commit") return;
    expect(plan.prevWeighted).toBe(0);
    expect(plan.steps.baseDelta).toBe(3 * MISSION_POINTS_WEIGHT);
    expect(plan.steps.focusExtraDelta).toBe(2 * BONUS_POINTS_WEIGHT);
    expect(plan.targetWeighted).toBe(
      3 * MISSION_POINTS_WEIGHT + 2 * BONUS_POINTS_WEIGHT,
    );
    expect(plan.hasBarReward).toBe(true);
    expect(plan.hasSocket).toBe(false);
    expect(plan.puzzleCompletesWithPlacement).toBe(false);
    expect(plan.showComboAfterPlacement).toBe(false);
  });

  it("prevWeighted enthält bereits platzierte Tiles", () => {
    const plan = resolvePlacementCommitPlan(
      commitInput({ placedTiles: [{ tile: makeTile(5, "eisdiele") }] }),
    );
    if (plan.kind !== "commit") throw new Error("expected commit");
    expect(plan.prevWeighted).toBe(1 * MISSION_POINTS_WEIGHT);
    expect(plan.targetWeighted).toBe(
      plan.prevWeighted + plan.steps.baseDelta + plan.steps.focusExtraDelta,
    );
  });

  it("Tile ohne CMS-Punkte und leerer Matrix gibt keinen Bar-Reward", () => {
    const plan = resolvePlacementCommitPlan(
      commitInput({ tile: makeTile(9, "unbekannt") }),
    );
    if (plan.kind !== "commit") throw new Error("expected commit");
    expect(plan.hasBarReward).toBe(false);
    expect(plan.targetWeighted).toBe(plan.prevWeighted);
  });

  it("Kombi-Parent mitten im Spiel: Combo-Dialog, kein Abschluss", () => {
    const plan = resolvePlacementCommitPlan(
      commitInput({ tile: makeTile(6, "eisdiele") }),
    );
    if (plan.kind !== "commit") throw new Error("expected commit");
    expect(plan.hasSocket).toBe(true);
    // Limit steigt durch die Kombi-Freischaltung auf min(4, 3+1) = 4.
    expect(plan.puzzleCompletesWithPlacement).toBe(false);
    expect(plan.showComboAfterPlacement).toBe(true);
  });

  it("letztes Placement schließt das Puzzle: kein Combo-Dialog mehr", () => {
    const plan = resolvePlacementCommitPlan(
      commitInput({
        tile: makeTile(6, "eisdiele"),
        placedTiles: [
          { tile: makeTile(2, "a") },
          { tile: makeTile(3, "b") },
          { tile: makeTile(4, "c") },
        ],
        currentMaxTileCount: 4,
      }),
    );
    if (plan.kind !== "commit") throw new Error("expected commit");
    expect(plan.hasSocket).toBe(true);
    // countAfter = 4 >= min(levelMax 4, 4+1) = 4 → fertig.
    expect(plan.puzzleCompletesWithPlacement).toBe(true);
    expect(plan.showComboAfterPlacement).toBe(false);
  });

  it("Placement ohne Kombi schließt bei erreichtem Limit ab", () => {
    const plan = resolvePlacementCommitPlan(
      commitInput({
        placedTiles: [
          { tile: makeTile(2, "a") },
          { tile: makeTile(3, "b") },
        ],
      }),
    );
    if (plan.kind !== "commit") throw new Error("expected commit");
    expect(plan.puzzleCompletesWithPlacement).toBe(true);
    expect(plan.showComboAfterPlacement).toBe(false);
  });
});
