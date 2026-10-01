export function puzzleCountBadgeValues(input: {
  score: number;
  maxScore: number;
  puzzlePlaced?: number;
  maxPuzzleItems?: number;
}): { badgeScore: number; badgeMax: number } {
  const safeMax = Math.max(1, input.maxScore);
  const safeScore = Math.min(safeMax, Math.max(0, input.score));

  const puzzleMax =
    typeof input.maxPuzzleItems === "number" &&
    Number.isFinite(input.maxPuzzleItems) &&
    input.maxPuzzleItems > 0
      ? Math.floor(input.maxPuzzleItems)
      : null;

  const badgeMax = puzzleMax ?? safeMax;
  const badgeScore =
    puzzleMax != null
      ? Math.min(puzzleMax, Math.max(0, Math.round(input.puzzlePlaced ?? 0)))
      : safeScore;

  return { badgeScore, badgeMax };
}
