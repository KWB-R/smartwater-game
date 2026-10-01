/** Kurzer Hinweis auf den gesammelten Punktezuwachs. */
export function formatPlacementScoreGainLabel(
  missionPoints: number,
  bonusPoints: number,
  basePoints = 0,
): string {
  const total = missionPoints + bonusPoints + basePoints;
  if (total <= 0) {
    return "";
  }
  if (missionPoints === 0) {
    return `+${total} Bonus`;
  }
  return `+${total} Punkt${total === 1 ? "" : "e"}`;
}
