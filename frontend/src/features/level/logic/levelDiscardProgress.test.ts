import { describe, expect, it } from "vitest";
import { shouldConfirmDiscardLevelProgress } from "@/features/level/logic/levelDiscardProgress";
import { LEVEL_PLAY_PHASE } from "@/routes/level/navigation/levelPlayPhase";

describe("shouldConfirmDiscardLevelProgress", () => {
  it("prompts when tiles are placed during main play", () => {
    expect(
      shouldConfirmDiscardLevelProgress({
        playPhase: LEVEL_PLAY_PHASE.placing,
        placedTileCount: 1,
      }),
    ).toBe(true);
  });

  it("does not prompt before the first placement", () => {
    expect(
      shouldConfirmDiscardLevelProgress({
        playPhase: LEVEL_PLAY_PHASE.placing,
        placedTileCount: 0,
      }),
    ).toBe(false);
  });

  it("prompts during open quiz attempt", () => {
    expect(
      shouldConfirmDiscardLevelProgress({
        playPhase: LEVEL_PLAY_PHASE.quiz,
        placedTileCount: 0,
      }),
    ).toBe(true);
    expect(
      shouldConfirmDiscardLevelProgress({
        playPhase: LEVEL_PLAY_PHASE.quiz,
        placedTileCount: 0,
        quizAttemptOpen: true,
      }),
    ).toBe(true);
  });

  it("does not prompt after quiz answer persisted (Weiter → Map)", () => {
    expect(
      shouldConfirmDiscardLevelProgress({
        playPhase: LEVEL_PLAY_PHASE.quiz,
        placedTileCount: 3,
        quizAttemptOpen: false,
      }),
    ).toBe(false);
  });

  it("does not prompt on completed result screens", () => {
    expect(
      shouldConfirmDiscardLevelProgress({
        playPhase: LEVEL_PLAY_PHASE.winning,
        placedTileCount: 5,
      }),
    ).toBe(false);
    expect(
      shouldConfirmDiscardLevelProgress({
        playPhase: LEVEL_PLAY_PHASE.preQuiz,
        placedTileCount: 5,
      }),
    ).toBe(false);
    expect(
      shouldConfirmDiscardLevelProgress({
        playPhase: LEVEL_PLAY_PHASE.share,
        placedTileCount: 5,
      }),
    ).toBe(false);
  });

  it("does not prompt on not-enough-points fail screen", () => {
    expect(
      shouldConfirmDiscardLevelProgress({
        playPhase: LEVEL_PLAY_PHASE.failed,
        placedTileCount: 5,
      }),
    ).toBe(false);
  });
});
