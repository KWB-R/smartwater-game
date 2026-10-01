import type { LevelIntroLocationState } from "@/routes/level/navigation/levelIntroTypes";

export type LevelQuizNavigateState =
  | (LevelIntroLocationState & { skipQuizNotEnough?: true })
  | { skipQuizNotEnough: true };

export function buildLevelQuizNavigateState(
  introState: LevelIntroLocationState | null,
): LevelQuizNavigateState {
  if (introState) {
    return { ...introState, skipQuizNotEnough: true };
  }
  return { skipQuizNotEnough: true };
}
