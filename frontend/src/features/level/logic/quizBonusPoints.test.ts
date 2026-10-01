import { describe, expect, it } from "vitest";
import { scoreFromAccumulatedPointMatrix } from "@/features/level/logic/placementScoring";
import { activeMissionGoalDimensions } from "@/features/level/logic/tileCategoryPoints";
import { pointMatrixForBarBonus } from "@/features/level/logic/quizBonusPoints";
import type { Level } from "@/features/level/types";

const stubLevel = { goalFocusWeights: {} } as Pick<Level, "goalFocusWeights">;

describe("pointMatrixForBarBonus", () => {
  it("adds the given score via default dimension", () => {
    const matrix = pointMatrixForBarBonus(4);
    const dims = activeMissionGoalDimensions([], stubLevel as Level);
    expect(scoreFromAccumulatedPointMatrix(matrix, dims)).toBe(4);
  });
});
