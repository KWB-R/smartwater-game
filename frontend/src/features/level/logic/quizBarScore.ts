import type { LevelPlaySession } from "@/features/level/session/levelPlaySession";
import { scoreFromAccumulatedPointMatrix } from "@/features/level/logic/placementScoring";
import type { GoalFocusDimension } from "@/features/level/types";
import { pointMatrixForBarBonus } from "@/features/level/logic/quizBonusPoints";

/** Bonus-Punkte für den Header-Balken bis zur Maximalpunktzahl. */
function quizBarBonusPoints(
  placementScore: number,
  barMaxScore: number,
  quizAnswerCorrect: boolean,
): number {
  if (!quizAnswerCorrect) {
    return 0;
  }
  return Math.max(0, barMaxScore - placementScore);
}

export function totalBarScoreAfterQuiz(
  placementScore: number,
  barMaxScore: number,
  quizAnswerCorrect: boolean | undefined,
): number {
  if (quizAnswerCorrect === true) {
    return barMaxScore;
  }
  return placementScore;
}

export function readQuizAnswerCorrect(
  session: Pick<
    LevelPlaySession,
    "quizAnswerCorrect" | "quizPoints"
  > | null,
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>,
): boolean | undefined {
  if (!session) {
    return undefined;
  }
  if (session.quizAnswerCorrect === true) {
    return true;
  }
  if (session.quizAnswerCorrect === false) {
    return false;
  }
  if (session.quizPoints == null) {
    return undefined;
  }
  const bonus = scoreFromAccumulatedPointMatrix(
    session.quizPoints,
    missionGoalDimensions,
  );
  return bonus > 0.001;
}

export function quizPointsForSession(
  placementScore: number,
  barMaxScore: number,
  quizAnswerCorrect: boolean,
) {
  const bonus = quizBarBonusPoints(
    placementScore,
    barMaxScore,
    quizAnswerCorrect,
  );
  return pointMatrixForBarBonus(bonus);
}
