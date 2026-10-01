/**
 * Zustandsübergänge des Bibliotheksintros: idle, running, done.
 * Timer und Scrollen übernimmt useLevelLibraryIntro.
 */

/** Wie `settled` nach dem Abschluss erreicht wird. */
type LibraryIntroSettleMode =
  /** Sofort bei reduzierten Animationen oder einem bereits bespielten Brett. */
  | "immediate"
  /** Nach der Einblendung des letzten Teils. */
  | "afterAnim"
  /** Nach dem Rückscrollen zum ersten Teil. */
  | "afterScrollBack";

export type LibraryIntroState = {
  phase: "idle" | "running" | "done";
  /** Während running die Zahl eingeblendeter Teile, bei done die Gesamtzahl. */
  visibleCount: number;
  /** Aktuell einfliegendes Puzzleteil, höchstens eines gleichzeitig. */
  enterTileIds: ReadonlySet<number>;
  /** Intro und Rückscrollen sind beendet; die Ablageziele dürfen erscheinen. */
  settled: boolean;
  settleMode: LibraryIntroSettleMode;
};

export type LibraryIntroEvent =
  /** Bei Levelwechsel oder Neustart das Intro erneut freigeben. */
  | { type: "reset" }
  /** Ohne Einflug abschließen, etwa bei reduzierten Animationen oder einer gespeicherten Sitzung. */
  | { type: "completedImmediately"; tileCount: number }
  | { type: "started" }
  /**
   * Der Timer hat das nächste Teil eingeblendet.
   * tileId: null bedeutet, dass der inzwischen verkürzte Streifen kein weiteres Teil enthält.
   */
  | { type: "tileRevealed"; tileId: number | null; tileCount: number }
  /** Der Bibliotheksinhalt hat sich während oder nach dem Intro geändert. */
  | { type: "tilesSynced"; tileCount: number }
  | { type: "enterHighlightCleared" }
  | { type: "settled" };

const EMPTY_ID_SET: ReadonlySet<number> = new Set<number>();

export function createInitialLibraryIntroState(): LibraryIntroState {
  return {
    phase: "idle",
    visibleCount: 0,
    enterTileIds: EMPTY_ID_SET,
    settled: false,
    settleMode: "afterAnim",
  };
}

export function libraryIntroReducer(
  state: LibraryIntroState,
  event: LibraryIntroEvent,
): LibraryIntroState {
  switch (event.type) {
    case "reset":
      // Ein unveränderter Startzustand soll keinen zusätzlichen Render auslösen.
      if (
        state.phase === "idle" &&
        state.visibleCount === 0 &&
        state.enterTileIds.size === 0 &&
        !state.settled
      ) {
        return state;
      }
      return createInitialLibraryIntroState();
    case "completedImmediately":
      if (state.phase === "done") {
        return state;
      }
      return {
        phase: "done",
        visibleCount: event.tileCount,
        enterTileIds: EMPTY_ID_SET,
        settled: true,
        settleMode: "immediate",
      };
    case "started":
      if (state.phase !== "idle") {
        return state;
      }
      return { ...state, phase: "running", visibleCount: 0 };
    case "tileRevealed": {
      if (state.phase !== "running") {
        return state;
      }
      const nextCount = Math.min(state.visibleCount + 1, event.tileCount);
      const isLast = nextCount >= event.tileCount;
      return {
        phase: isLast ? "done" : "running",
        visibleCount: nextCount,
        // Auch das letzte Teil vollständig einblenden; bei tileId: null gibt es kein Teil mehr zu animieren.

        enterTileIds:
          event.tileId != null ? new Set([event.tileId]) : EMPTY_ID_SET,
        settled: false,
        settleMode: isLast
          ? event.tileCount > 1
            ? "afterScrollBack"
            : "afterAnim"
          : state.settleMode,
      };
    }
    case "tilesSynced":
      if (state.phase !== "done" || state.visibleCount === event.tileCount) {
        return state;
      }
      return { ...state, visibleCount: event.tileCount };
    case "enterHighlightCleared":
      if (state.enterTileIds.size === 0) {
        return state;
      }
      return { ...state, enterTileIds: EMPTY_ID_SET };
    case "settled":
      if (state.phase !== "done" || state.settled) {
        return state;
      }
      return { ...state, settled: true };
  }
}
