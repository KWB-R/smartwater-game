import { describe, expect, it } from "vitest";
import { barPassThresholdScore } from "@/features/level/logic/levelBarCompletion";
import { resolveEndOfPlacementFlow } from "@/features/level/logic/endPlacementFlow";

describe("resolveEndOfPlacementFlow", () => {
  const barMax = 100;
  const pass = barPassThresholdScore(barMax);

  it("routes below pass threshold to failed", () => {
    expect(resolveEndOfPlacementFlow(pass - 1, barMax)).toEqual({
      kind: "failed",
    });
  });

  it("routes at pass but below max to preQuiz", () => {
    expect(resolveEndOfPlacementFlow(pass, barMax)).toEqual({
      kind: "preQuiz",
    });
    expect(resolveEndOfPlacementFlow(90, barMax)).toEqual({ kind: "preQuiz" });
  });

  it("routes at max bar score to winning", () => {
    expect(resolveEndOfPlacementFlow(100, barMax)).toEqual({ kind: "winning" });
  });

  it("respects custom minimumScorePercentage", () => {
    expect(resolveEndOfPlacementFlow(59, barMax, 60)).toEqual({
      kind: "failed",
    });
    expect(resolveEndOfPlacementFlow(60, barMax, 60)).toEqual({
      kind: "preQuiz",
    });
  });
});
