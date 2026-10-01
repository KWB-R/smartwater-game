import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Tile } from "@/features/level/types";
import { LEVEL_PLAY_TUTORIAL_STEPS } from "@/features/level/tutorial/levelPlayTutorialConfig";
import {
  isLevelPlayTutorialCompleted,
  markLevelPlayTutorialCompleted,
} from "@/features/level/tutorial/levelPlayTutorialStorage";
import type { LevelPlayTutorialStepConfig } from "@/features/level/tutorial/types";

export type UseLevelPlayTutorialArgs = {
  enabled: boolean;
  stripTiles: ReadonlyArray<Tile>;
  detailTileId: number | null;
  mainMenuOpen: boolean;
  draggingTileId: number | null;
  missionDismissActive: boolean;
  hasPlacedTiles: boolean;
  /** Die Rückmeldung zum Ziehen erst nach offenen Bonus-, Kombi- oder Platzierungshinweisen fortsetzen. */
  placementRewardUiBlocking: boolean;
  /** Das Bibliotheksintro blendet die Teile noch nacheinander ein. */
  libraryIntroActive: boolean;
  /** Intro inkl. Einflug-Animation abgeschlossen — Tutorial darf starten. */
  libraryIntroSettled: boolean;
};

export type UseLevelPlayTutorialResult = {
  active: boolean;
  step: LevelPlayTutorialStepConfig | null;
  stepIndex: number;
  draggingTileId: number | null;
  /** Menü oder Puzzle-Detail offen — Tutorial-UI ausblenden. */
  uiSuspended: boolean;
  /** Ziehen aus der Bibliothek nur im dafür vorgesehenen Tutorialschritt erlauben. */
  blocksLibraryDrag: boolean;
  /** Kachel-Infos-Button blockieren (nur Detail-Schritt erlaubt). */
  blocksTileCardsMenu: boolean;
  /** Kachel-Infos-Button muss klickbar sein (Detail-Schritt). */
  requiresTileCardsMenuClick: boolean;
  blocksBoardPointer: boolean;
  showTutorial: () => void;
  dismissTutorial: () => void;
  goNextFromButton: () => void;
};

function advanceStepIndex(
  complete: () => void,
): (i: number) => number {
  return (i) => {
    const next = i + 1;
    if (next >= LEVEL_PLAY_TUTORIAL_STEPS.length) {
      complete();
      return i;
    }
    return next;
  };
}

export function useLevelPlayTutorial({
  enabled,
  stripTiles,
  detailTileId,
  mainMenuOpen,
  draggingTileId,
  missionDismissActive,
  hasPlacedTiles,
  placementRewardUiBlocking,
  libraryIntroActive = false,
  libraryIntroSettled = true,
}: UseLevelPlayTutorialArgs): UseLevelPlayTutorialResult {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [dragStepReleasePending, setDragStepReleasePending] = useState(false);
  const autoStartAttemptedRef = useRef(false);
  const prevDraggingTileIdRef = useRef<number | null>(null);
  const prevStepIdRef = useRef<string | null>(null);

  const step = active ? (LEVEL_PLAY_TUTORIAL_STEPS[stepIndex] ?? null) : null;

  const complete = useCallback(() => {
    markLevelPlayTutorialCompleted();
    setActive(false);
    setStepIndex(0);
    setDragStepReleasePending(false);
    prevDraggingTileIdRef.current = null;
  }, []);

  const showTutorial = useCallback(() => {
    if (!enabled) {
      return;
    }
    prevDraggingTileIdRef.current = null;
    setDragStepReleasePending(false);
    setStepIndex(0);
    setActive(true);
  }, [enabled]);

  const dismissTutorial = useCallback(() => {
    complete();
  }, [complete]);

  const goNextFromButton = useCallback(() => {
    setStepIndex(advanceStepIndex(complete));
  }, [complete]);

  useEffect(() => {
    if (!enabled || missionDismissActive || hasPlacedTiles) {
      return;
    }
    if (autoStartAttemptedRef.current || isLevelPlayTutorialCompleted()) {
      return;
    }
    if (stripTiles.length === 0) {
      return;
    }
    if (libraryIntroActive || !libraryIntroSettled) {
      return;
    }
    autoStartAttemptedRef.current = true;
    setActive(true);
    setStepIndex(0);
  }, [enabled, missionDismissActive, hasPlacedTiles, stripTiles.length, libraryIntroActive, libraryIntroSettled]);

  useEffect(() => {
    const stepId = step?.id ?? null;
    if (stepId === "drag-to-board" && prevStepIdRef.current !== "drag-to-board") {
      setDragStepReleasePending(false);
      prevDraggingTileIdRef.current = null;
    }
    prevStepIdRef.current = stepId;
  }, [step?.id]);

  useEffect(() => {
    if (!active || !step) {
      return;
    }
    // Nach Öffnen des Details weiterschalten und das Tutorial bis zum Schließen ausblenden.
    // Danach direkt den Ziehschritt zeigen, ohne den vorherigen Schritt kurz einzublenden.
    if (step.advance.type === "detailClosed" && detailTileId != null) {
      setStepIndex(advanceStepIndex(complete));
    }
  }, [active, step, detailTileId, complete]);

  useEffect(() => {
    if (!active || !step || step.advance.type !== "dragReleased") {
      prevDraggingTileIdRef.current = draggingTileId;
      return;
    }
    const wasDragging = prevDraggingTileIdRef.current != null;
    const isDragging = draggingTileId != null;
    if (wasDragging && !isDragging) {
      setDragStepReleasePending(true);
    }
    prevDraggingTileIdRef.current = draggingTileId;
  }, [active, step, draggingTileId]);

  useEffect(() => {
    if (!active || !step || step.advance.type !== "dragReleased") {
      return;
    }
    if (!dragStepReleasePending || draggingTileId != null) {
      return;
    }
    if (placementRewardUiBlocking) {
      return;
    }
    setDragStepReleasePending(false);
    setStepIndex(advanceStepIndex(complete));
  }, [
    active,
    step,
    dragStepReleasePending,
    draggingTileId,
    placementRewardUiBlocking,
    complete,
  ]);

  const uiSuspended = useMemo(() => {
    if (!active || !step) {
      return false;
    }
    if (
      step.advance.type === "dragReleased" &&
      draggingTileId != null
    ) {
      return false;
    }
    if (mainMenuOpen) {
      return true;
    }
    if (detailTileId != null) {
      return true;
    }
    if (step.advance.type === "dragReleased" && dragStepReleasePending) {
      return true;
    }
    return false;
  }, [
    active,
    step,
    draggingTileId,
    mainMenuOpen,
    detailTileId,
    dragStepReleasePending,
  ]);

  const interactionLocked = useMemo(() => {
    return active && step != null && !uiSuspended;
  }, [active, step, uiSuspended]);

  const blocksLibraryDrag = useMemo(() => {
    if (!interactionLocked || !step) {
      return false;
    }
    return step.advance.type !== "dragReleased";
  }, [interactionLocked, step]);

  const blocksTileCardsMenu = useMemo(() => {
    if (!interactionLocked || !step) {
      return false;
    }
    return step.advance.type !== "detailClosed";
  }, [interactionLocked, step]);

  const requiresTileCardsMenuClick = useMemo(() => {
    if (!interactionLocked || !step) {
      return false;
    }
    return step.advance.type === "detailClosed";
  }, [interactionLocked, step]);

  const blocksBoardPointer = useMemo(() => {
    if (!interactionLocked || !step) {
      return false;
    }
    return step.dimOverlay === true && step.target !== "gameBoard";
  }, [interactionLocked, step]);

  return {
    active: active && step != null,
    step,
    stepIndex,
    draggingTileId,
    uiSuspended,
    blocksLibraryDrag,
    blocksTileCardsMenu,
    requiresTileCardsMenuClick,
    blocksBoardPointer,
    showTutorial,
    dismissTutorial,
    goNextFromButton,
  };
}
