import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TransitionEvent,
} from "react";
import type { Tile } from "@/features/level/types";

const SHEET_TRANSITION_MS = 320;

type SheetPhase = "closed" | "enter" | "open" | "exit";

type UseTileDetailSheetOptions = {
  tile: Tile | null;
  reducedMotion?: boolean;
  onClose: () => void;
};

export function useTileDetailSheet({
  tile,
  reducedMotion = false,
  onClose,
}: UseTileDetailSheetOptions) {
  const [phase, setPhase] = useState<SheetPhase>("closed");
  const [presentedTile, setPresentedTile] = useState<Tile | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  /** Bleibt während des Schließens true, bis der Detailparameter aus der URL entfernt ist. */
  const pendingUrlClearRef = useRef(false);

  const activeTile = presentedTile;

  useEffect(() => {
    if (tile == null) {
      pendingUrlClearRef.current = false;
      setPhase((p) => (p === "closed" ? "closed" : "exit"));
      return;
    }

    if (pendingUrlClearRef.current || phase === "exit") {
      return;
    }

    if (exitTimerRef.current != null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setPresentedTile(tile);
    setPhase((p) => (p === "closed" || p === "exit" ? "enter" : "open"));
  }, [tile, phase]);

  useEffect(() => {
    if (phase !== "enter") {
      return;
    }
    if (reducedMotion) {
      setPhase("open");
      return;
    }
    let cancelled = false;
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        if (!cancelled) {
          setPhase("open");
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame1);
      if (frame2) {
        cancelAnimationFrame(frame2);
      }
    };
  }, [phase, reducedMotion]);

  const finishClose = useCallback(() => {
    setPresentedTile(null);
    setPhase("closed");
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (phase === "exit" || phase === "closed") {
      return;
    }
    pendingUrlClearRef.current = true;
    setPhase("exit");
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit") {
      return;
    }
    if (reducedMotion) {
      finishClose();
      return;
    }
    exitTimerRef.current = window.setTimeout(() => {
      finishClose();
    }, SHEET_TRANSITION_MS);
    return () => {
      if (exitTimerRef.current != null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [phase, reducedMotion, finishClose]);

  const handleSheetTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (reducedMotion || phase !== "exit") {
        return;
      }
      if (event.propertyName !== "transform") {
        return;
      }
      if (exitTimerRef.current != null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      finishClose();
    },
    [finishClose, phase, reducedMotion],
  );

  const sheetOpen = phase === "open";

  const sheetMotionClass = sheetOpen ? "translate-y-0" : "translate-y-full";

  const backdropMotionClass = sheetOpen ? "opacity-100" : "opacity-0";

  const enterTransitionMs = SHEET_TRANSITION_MS;
  const enterEaseClass = "ease-[cubic-bezier(0.22,1,0.36,1)]";

  return {
    activeTile,
    showPanel: phase !== "closed" && activeTile != null,
    sheetMotionClass,
    backdropMotionClass,
    enterTransitionMs,
    enterEaseClass,
    requestClose,
    handleSheetTransitionEnd,
  };
}
