import {
  LEVEL_PLAY_PHASE,
  type LevelPlayPhase,
} from "@/routes/level/navigation/levelPlayPhase";

export type LevelDiscardProgressInput = {
  playPhase: LevelPlayPhase;
  placedTileCount: number;
  /**
   * Bleibt während des Quiz true, bis die Antwort gespeichert ist.
   * Nach Abschluss kann die Rückkehr zur Karte ohne Rückfrage erfolgen.
   */
  quizAttemptOpen?: boolean;
};

/** true, wenn beim Verlassen noch nicht abgeschlossener Puzzle- oder Quizfortschritt verloren ginge. */
export function shouldConfirmDiscardLevelProgress({
  playPhase,
  placedTileCount,
  quizAttemptOpen = true,
}: LevelDiscardProgressInput): boolean {
  if (
    playPhase === LEVEL_PLAY_PHASE.winning ||
    playPhase === LEVEL_PLAY_PHASE.preQuiz ||
    playPhase === LEVEL_PLAY_PHASE.share ||
    playPhase === LEVEL_PLAY_PHASE.failed ||
    playPhase === LEVEL_PLAY_PHASE.intro ||
    playPhase === LEVEL_PLAY_PHASE.mission
  ) {
    return false;
  }
  if (playPhase === LEVEL_PLAY_PHASE.quiz) {
    // Sterne schon nach Puzzle gespeichert; Prompt nur für offenen Quiz-Versuch.
    return quizAttemptOpen;
  }
  return placedTileCount > 0;
}
