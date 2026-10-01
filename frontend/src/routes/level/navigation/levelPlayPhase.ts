/**
 * Spielphasen als optionales Segment unter /level/:levelId/:phase.
 * Die Platzierungsphase verwendet die Levelroute ohne zusätzliches Segment.
 */
export const LEVEL_PLAY_PHASE = {
  placing: "placing",
  intro: "intro",
  mission: "mission",
  /** Puzzlelimit erreicht, Punktestand unter minimumScorePercentage. */
  failed: "failed",
  preQuiz: "pre-quiz",
  quiz: "quiz",
  winning: "winning",
  share: "share",
} as const;

export type LevelPlayPhase =
  (typeof LEVEL_PLAY_PHASE)[keyof typeof LEVEL_PLAY_PHASE];

/** URL-Segmente der Spielphasen; Platzieren hat kein eigenes Segment. */
export type LevelPlayPhaseSegment = Exclude<
  LevelPlayPhase,
  typeof LEVEL_PLAY_PHASE.placing
>;

const PHASE_SEGMENT_SET = new Set<string>(
  Object.values(LEVEL_PLAY_PHASE).filter(
    (phase) => phase !== LEVEL_PLAY_PHASE.placing,
  ),
);

function isLevelPlayPhaseSegment(
  value: string,
): value is LevelPlayPhaseSegment {
  return PHASE_SEGMENT_SET.has(value);
}

/** Fehlende oder unbekannte Segmente wählen die Platzierungsphase. */
export function parseLevelPlayPhaseParam(
  segment: string | undefined,
): LevelPlayPhase {
  if (segment != null && isLevelPlayPhaseSegment(segment)) {
    return segment;
  }
  return LEVEL_PLAY_PHASE.placing;
}

export function levelPlayPhaseToSegment(
  phase: LevelPlayPhase,
): LevelPlayPhaseSegment | null {
  if (phase === LEVEL_PLAY_PHASE.placing) {
    return null;
  }
  return phase;
}
