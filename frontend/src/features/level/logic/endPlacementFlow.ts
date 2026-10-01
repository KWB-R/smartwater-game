import {
  hasPassedBarThreshold,
  isMaxBarScore,
} from "@/features/level/logic/levelBarCompletion";

export type EndPlacementFlow =
  | { kind: "failed" }
  | { kind: "winning" }
  | { kind: "preQuiz" };

export function resolveEndOfPlacementFlow(
  placementScore: number,
  barMaxScore: number,
  minimumScorePercentage?: number | null,
): EndPlacementFlow {
  if (
    !hasPassedBarThreshold(
      placementScore,
      barMaxScore,
      minimumScorePercentage,
    )
  ) {
    return { kind: "failed" };
  }
  if (isMaxBarScore(placementScore, barMaxScore)) {
    return { kind: "winning" };
  }
  return { kind: "preQuiz" };
}

export { isMaxBarScore as isWinningMaxBarScore } from "@/features/level/logic/levelBarCompletion";
