import {
  LEVEL_PLAY_PHASE,
  type LevelPlayPhase,
} from "@/routes/level/navigation/levelPlayPhase";
import { buildShareComboSearch } from "@/routes/level/params/shareComboSearchParam";

/**
 * Leitet die Spielansicht aus URL und Sitzung ab und berechnet nötige URL-Korrekturen.
 * Die Entscheidung erfolgt ohne React, Navigation oder Speicherzugriffe.
 */

/** Zielansicht aus der URL-Phase oder dem älteren postQuizWinning-Zustand. */
export type LevelPhaseRestoreIntent =
  | "quiz"
  | "preQuiz"
  | "failed"
  | "share"
  | null;

export function resolvePhaseRestoreIntent(
  playPhase: LevelPlayPhase,
  postQuizWinning: boolean,
): LevelPhaseRestoreIntent {
  if (playPhase === LEVEL_PLAY_PHASE.quiz) {
    return "quiz";
  }
  if (playPhase === LEVEL_PLAY_PHASE.share) {
    return "share";
  }
  if (
    playPhase === LEVEL_PLAY_PHASE.preQuiz ||
    playPhase === LEVEL_PLAY_PHASE.winning ||
    postQuizWinning
  ) {
    return "preQuiz";
  }
  if (playPhase === LEVEL_PLAY_PHASE.failed) {
    return "failed";
  }
  return null;
}

/**
 * Ergebnis der Sitzungswiederherstellung für ein Level und eine Phase.
 * Nach einem Phasenwechsel bleibt das Ergebnis unbekannt, bis die Wiederherstellung versucht wurde.
 */
export type LevelPhaseHydration = { key: string; restored: boolean };

export function levelPhaseHydrationKey(
  levelKey: string,
  playPhase: LevelPlayPhase,
): string {
  return `${levelKey}|${playPhase}`;
}

/**
 * Die Sitzung erst wiederherstellen, wenn die Puzzleteile geladen sind.
 * Sonst würde ein vorzeitiger Fehlschlag etwa /failed zur Platzierungsphase umleiten.
 */
export function canResolvePhaseHydration(input: {
  playAdvanced: boolean;
  levelTileCount: number;
  hasSession: boolean;
}): boolean {
  if (input.playAdvanced) {
    return true;
  }
  if (!input.hasSession) {
    return true;
  }
  return input.levelTileCount > 0;
}

/**
 * Gemeinsamer Zustand der Levelansicht aus URL, wiederhergestellter Sitzung
 * und Vergleichsansicht unter dem Quiz.
 */
export type LevelUiPhase =
  | { kind: "placing" }
  /** Vergleichsansicht nach Puzzleabschluss und vor dem Quiz. */
  | { kind: "preQuiz" }
  /** Quizansicht; preQuizUnderlay hält den Vergleich während der Einblendung sichtbar. */
  | { kind: "quiz"; preQuizUnderlay: boolean }
  | { kind: "failed" }
  /** boardRestored erlaubt die Synchronisierung der Teilen-URL nach erfolgreicher Wiederherstellung. */
  | { kind: "share"; boardRestored: boolean };

export type LevelUiPhaseInput = {
  playPhase: LevelPlayPhase;
  /** Älterer Router-Zustand postQuizWinning wird als Quizvorbereitung behandelt. */
  postQuizWinning: boolean;
  /** Ergebnis der Wiederherstellung; null bedeutet noch nicht versucht. */
  phaseBoardHydrated: boolean | null;
  quizUnderlayActive: boolean;
  shareComboFromUrl: boolean;
};

export function resolveLevelUiPhase(input: LevelUiPhaseInput): LevelUiPhase {
  if (input.playPhase === LEVEL_PLAY_PHASE.quiz) {
    return { kind: "quiz", preQuizUnderlay: input.quizUnderlayActive };
  }
  const intent = resolvePhaseRestoreIntent(
    input.playPhase,
    input.postQuizWinning,
  );
  if (intent === "share") {
    return {
      kind: "share",
      boardRestored:
        input.phaseBoardHydrated === true || input.shareComboFromUrl,
    };
  }
  // Overlay-Phasen benötigen ein wiederhergestelltes Brett. Bis dahin die Platzierungsansicht zeigen;
  // bei fehlender Sitzung korrigiert resolvePhaseUrlCorrection anschließend die URL.

  if (intent === "preQuiz" && input.phaseBoardHydrated === true) {
    return { kind: "preQuiz" };
  }
  if (intent === "failed" && input.phaseBoardHydrated === true) {
    return { kind: "failed" };
  }
  return { kind: "placing" };
}

/** Prüft, ob der Vergleich allein oder unter dem Quiz sichtbar sein soll. */
export function preQuizGateOpenFrom(phase: LevelUiPhase): boolean {
  return (
    phase.kind === "preQuiz" ||
    (phase.kind === "quiz" && phase.preQuizUnderlay)
  );
}

/** true oder false beschreibt das Wiederherstellungsergebnis; null bedeutet noch unbekannt. */
export function phaseBoardHydratedFrom(
  hydration: LevelPhaseHydration | null,
  levelKey: string,
  playPhase: LevelPlayPhase,
): boolean | null {
  if (hydration?.key !== levelPhaseHydrationKey(levelKey, playPhase)) {
    return null;
  }
  return hydration.restored;
}

export type LevelPhaseUrlCorrectionInput = {
  quizScreenFromUrl: boolean;
  playPhase: LevelPlayPhase;
  postQuizWinning: boolean;
  /** Ergebnis der Wiederherstellung; null bedeutet noch nicht versucht. */
  phaseBoardHydrated: boolean | null;
  shareScreenOpen: boolean;
  shareComboPartIds: ReadonlyArray<string>;
  /** `location.search`, mit oder ohne führendes `?`. */
  locationSearch: string;
};

export type LevelPhaseUrlCorrectionAction =
  | { kind: "none" }
  | { kind: "navigate"; phase: LevelPlayPhase; search: string };

/**
 * Normalisiert ältere URLs und korrigiert Phasen ohne wiederherstellbare Sitzung.
 * search: "" entfernt Suchparameter wie goToLevelPhase ohne search.
 */
export function resolvePhaseUrlCorrection(
  input: LevelPhaseUrlCorrectionInput,
): LevelPhaseUrlCorrectionAction {
  if (input.quizScreenFromUrl) {
    return { kind: "none" };
  }
  // Die ältere Phase winning entspricht dem Vergleich vor dem Quiz.
  if (input.playPhase === LEVEL_PLAY_PHASE.winning) {
    return { kind: "navigate", phase: LEVEL_PLAY_PHASE.preQuiz, search: "" };
  }
  const intent = resolvePhaseRestoreIntent(
    input.playPhase,
    input.postQuizWinning,
  );
  // Den älteren postQuizWinning-Zustand erst nach erfolgreicher Wiederherstellung in die URL übernehmen.
  if (
    intent === "preQuiz" &&
    input.playPhase !== LEVEL_PLAY_PHASE.preQuiz &&
    input.phaseBoardHydrated === true
  ) {
    return { kind: "navigate", phase: LEVEL_PLAY_PHASE.preQuiz, search: "" };
  }
  // Ohne wiederherstellbare Sitzung aus failed zur Platzierungsphase zurückkehren.
  if (
    input.playPhase === LEVEL_PLAY_PHASE.failed &&
    input.phaseBoardHydrated === false
  ) {
    return { kind: "navigate", phase: LEVEL_PLAY_PHASE.placing, search: "" };
  }
  // Der combo-Parameter ermöglicht Neuladen und Weitergabe der Teilen-Seite.
  if (input.playPhase === LEVEL_PLAY_PHASE.share && input.shareScreenOpen) {
    const currentSearch = input.locationSearch.startsWith("?")
      ? input.locationSearch.slice(1)
      : input.locationSearch;
    const wantSearch = buildShareComboSearch(input.shareComboPartIds);
    if (wantSearch && wantSearch !== currentSearch) {
      return {
        kind: "navigate",
        phase: LEVEL_PLAY_PHASE.share,
        search: wantSearch,
      };
    }
  }
  return { kind: "none" };
}

export type PostPlacementGateInput = {
  /** Die letzte Platzierung hat den Übergang zur Abschlussansicht vorgemerkt. */
  armed: boolean;
  preQuizGateOpen: boolean;
  puzzleFailedOpen: boolean;
  shareScreenActive: boolean;
  placedCount: number;
  currentMaxTileCount: number;
  comboDialogOpen: boolean;
};

/** Prüft die Bedingungen für den Wechsel zum Vergleich oder zum Fehlerpanel. */
export function shouldOpenPostPlacementGate(
  input: PostPlacementGateInput,
): boolean {
  if (!input.armed) {
    return false;
  }
  if (input.preQuizGateOpen || input.puzzleFailedOpen) {
    return false;
  }
  if (input.shareScreenActive) {
    return false;
  }
  if (input.placedCount < input.currentMaxTileCount) {
    return false;
  }
  if (input.comboDialogOpen) {
    return false;
  }
  return true;
}
