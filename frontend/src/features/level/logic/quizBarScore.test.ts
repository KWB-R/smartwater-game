import { describe, expect, it } from "vitest";
import { emptyPoints } from "@/features/level/logic/points";
import { pointMatrixForBarBonus } from "@/features/level/logic/quizBonusPoints";
import {
  readQuizAnswerCorrect,
  totalBarScoreAfterQuiz,
} from "@/features/level/logic/quizBarScore";

describe("totalBarScoreAfterQuiz", () => {
  it("fills bar to max when quiz was correct", () => {
    expect(totalBarScoreAfterQuiz(12, 20, true)).toBe(20);
  });

  it("keeps placement score when quiz was wrong", () => {
    expect(totalBarScoreAfterQuiz(12, 20, false)).toBe(12);
  });

  it("keeps placement when quiz outcome unknown", () => {
    expect(totalBarScoreAfterQuiz(12, 20, undefined)).toBe(12);
  });
});

describe("readQuizAnswerCorrect", () => {
  const dims = new Set<import("@/features/level/types").GoalFocusDimension>();

  it("prefers explicit session flag", () => {
    expect(
      readQuizAnswerCorrect(
        { quizAnswerCorrect: false, quizPoints: emptyPoints() },
        dims,
      ),
    ).toBe(false);
  });

  it("infers from quiz bonus when flag missing", () => {
    expect(
      readQuizAnswerCorrect(
        {
          quizPoints: pointMatrixForBarBonus(5),
        },
        dims,
      ),
    ).toBe(true);
  });
});
