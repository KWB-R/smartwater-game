export type LevelMascotVariant =
  | "levelentry"
  | "happy"
  | "wartend"
  | "puzzlestückaufgenommen"
  | "puzzlestückrichtiggelegt"
  | "levelend"
  | "maximalpunktzahl";

export type LevelPlayPhase = "placing" | "quiz" | "result";

export type LevelMascotInput = {
  hasPlayed: boolean;
  phase: LevelPlayPhase;
  displayScore: number;
  maxScore: number;
  draggingTile: boolean;
  placementRewardBlocking: boolean;
  /** Quiz: nach Absenden der Antwort (Feedback), nicht während der Auswahl. */
  quizFeedback?: boolean;
  /** Puzzleabschluss unter der Bestehensgrenze. */
  puzzleFailed?: boolean;
};

export function resolveLevelMascotVariant(
  input: LevelMascotInput,
): LevelMascotVariant {
  if (!input.hasPlayed) {
    return "levelentry";
  }

  if (input.puzzleFailed) {
    return "levelentry";
  }

  const atMax =
    input.maxScore > 0 && input.displayScore >= input.maxScore - 0.001;

  if (input.phase === "result") {
    return atMax ? "maximalpunktzahl" : "levelend";
  }

  if (input.phase === "quiz") {
    if (!input.quizFeedback) {
      return "puzzlestückaufgenommen";
    }
    return atMax ? "maximalpunktzahl" : "happy";
  }

  if (input.placementRewardBlocking) {
    return "puzzlestückrichtiggelegt";
  }

  if (input.draggingTile) {
    return "puzzlestückaufgenommen";
  }

  if (atMax) {
    return "maximalpunktzahl";
  }

  return "happy";
}

/** Maskottchen-Variante im `map-game-header__mascot` — Fallback: Level-Einstieg. */
export function mapGameHeaderMascotVariant(
  snapshotVariant: LevelMascotVariant | null | undefined,
): LevelMascotVariant {
  return snapshotVariant ?? "levelentry";
}
