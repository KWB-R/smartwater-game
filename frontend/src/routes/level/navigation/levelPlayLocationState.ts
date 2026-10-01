export type LevelPlayLocationState = {
  /** Älterer Navigationszustand für die Vergleichsansicht vor dem Quiz. */
  postQuizWinning?: boolean;
};

export function readLevelPlayLocationState(
  value: unknown,
): LevelPlayLocationState | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const v = value as LevelPlayLocationState;
  if (v.postQuizWinning === true) {
    return { postQuizWinning: true };
  }
  return null;
}
