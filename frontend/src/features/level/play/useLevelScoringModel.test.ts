import { describe, expect, it } from "vitest";
import { resolveHeaderBarScore } from "@/features/level/play/useLevelScoringModel";

describe("resolveHeaderBarScore", () => {
  it("keeps placement score when quiz header briefly reports 0", () => {
    const { barDisplayScore, headerBarScore } = resolveHeaderBarScore({
      shareScreenActive: false,
      quizScreenFromUrl: true,
      winningTotalBarScore: 40,
      quizHeaderScore: 0,
      placementScoreSum: 24,
      barScoreAnimationOverride: null,
      beforeAfterGateActive: false,
    });
    expect(barDisplayScore).toBe(24);
    expect(headerBarScore).toBe(24);
  });

  it("allows quiz feedback score above placement", () => {
    const { headerBarScore } = resolveHeaderBarScore({
      shareScreenActive: false,
      quizScreenFromUrl: true,
      winningTotalBarScore: 40,
      quizHeaderScore: 40,
      placementScoreSum: 24,
      barScoreAnimationOverride: null,
      beforeAfterGateActive: false,
    });
    expect(headerBarScore).toBe(40);
  });

  it("uses placement sum during play", () => {
    const { headerBarScore } = resolveHeaderBarScore({
      shareScreenActive: false,
      quizScreenFromUrl: false,
      winningTotalBarScore: 0,
      quizHeaderScore: 0,
      placementScoreSum: 18,
      barScoreAnimationOverride: null,
      beforeAfterGateActive: false,
    });
    expect(headerBarScore).toBe(18);
  });
});
