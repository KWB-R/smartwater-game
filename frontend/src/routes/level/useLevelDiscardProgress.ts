import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import type { LevelLeavePromptOptions } from "@/components/layout/mainMenuContext";
import { useLatestRef } from "@/hooks/useLatestRef";
import { shouldConfirmDiscardLevelProgress } from "@/features/level/logic/levelDiscardProgress";
import { readLevelPlaySession } from "@/features/level/session/levelPlaySession";
import type { LevelPlayPhase } from "@/routes/level/navigation/levelPlayPhase";
import { isLeavingLevelRoute } from "@/routes/level/navigation/isLeavingLevelRoute";

type UseLevelDiscardProgressArgs = {
  playPhase: LevelPlayPhase;
  placedTileCount: number;
  levelKey: string;
  onSessionDiscarded: () => void;
};

export function useLevelDiscardProgress({
  playPhase,
  placedTileCount,
  levelKey,
  onSessionDiscarded,
}: UseLevelDiscardProgressArgs) {
  const [open, setOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const skipNextBlockerRef = useRef(false);
  const playPhaseRef = useLatestRef(playPhase);
  const placedTileCountRef = useLatestRef(placedTileCount);
  const levelKeyRef = useLatestRef(levelKey);

  const shouldPrompt = useCallback(() => {
    const session = readLevelPlaySession(levelKeyRef.current);
    // Nach der Quizantwort ist der Versuch abgeschlossen; die Abschlussnavigation darf fortfahren.
    const quizAttemptOpen = session?.quizAnswerCorrect === undefined;
    return shouldConfirmDiscardLevelProgress({
      playPhase: playPhaseRef.current,
      placedTileCount: placedTileCountRef.current,
      quizAttemptOpen,
    });
  }, [playPhaseRef, placedTileCountRef, levelKeyRef]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const isLeavingLevel = isLeavingLevelRoute(
      currentLocation.pathname,
      nextLocation.pathname,
    );
    if (!isLeavingLevel) {
      return false;
    }
    if (skipNextBlockerRef.current) {
      skipNextBlockerRef.current = false;
      return false;
    }
    return shouldPrompt();
  });

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }
    pendingActionRef.current = () => blocker.proceed();
    setOpen(true);
  }, [blocker.state, blocker]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const promptLeave = useCallback(
    (action: () => void, options?: LevelLeavePromptOptions) => {
      if (!options?.force && !shouldPrompt()) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setOpen(true);
    },
    [shouldPrompt],
  );

  const handleStay = useCallback(() => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
    pendingActionRef.current = null;
    setOpen(false);
  }, [blocker]);

  const armSkipAndRun = useCallback((action: () => void) => {
    skipNextBlockerRef.current = true;
    action();
    // Bei asynchroner Navigation kann die Blockierprüfung erst nach dem aktuellen Microtask laufen.
    // Die Freigabe deshalb bis zur Prüfung erhalten; der Timer ist nur ein Ersatz.
    window.setTimeout(() => {
      skipNextBlockerRef.current = false;
    }, 0);
  }, []);

  const handleDiscard = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setOpen(false);
    onSessionDiscarded();
    if (action) {
      armSkipAndRun(action);
    }
  }, [onSessionDiscarded, armSkipAndRun]);

  /** Gibt das Verlassen der Levelroute nach abgeschlossenem Quiz ohne zusätzlichen Dialog frei. */
  const leaveWithoutDiscardPrompt = useCallback(
    (action: () => void) => {
      armSkipAndRun(action);
    },
    [armSkipAndRun],
  );

  return {
    open,
    promptLeave,
    handleStay,
    handleDiscard,
    leaveWithoutDiscardPrompt,
  };
}
