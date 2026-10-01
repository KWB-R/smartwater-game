import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  type TransitionEvent,
} from "react";
import { useLatestRef } from "@/hooks/useLatestRef";

const SHEET_TRANSITION_MS = 320;

type SheetPhase = "closed" | "enter" | "open" | "exit";

type BottomSheetEnterMotion = "slide" | "fade";

/**
 * Zustandsfolge des Sheets: closed, enter, open, exit, closed.
 * entered meldet die abgeschlossene Einblendung während open.
 */
type SheetState = {
  phase: SheetPhase;
  entered: boolean;
};

type SheetEvent =
  /** Das open-Prop öffnet das Sheet; erneutes Öffnen wartet auf das Ende der Ausblendung. */
  | { type: "openRequested"; reducedMotion: boolean }
  | { type: "closeRequested" }
  /** Die Einblendung wurde nach Verzögerung und zwei Animationsbildern gestartet. */
  | { type: "enterTransitionStarted"; reducedMotion: boolean }
  /** Die Einblendung ist über transitionend oder den Ersatz-Timer abgeschlossen. */
  | { type: "enterFinished" }
  /** Die Ausblendung ist abgeschlossen, bei reduzierten Animationen sofort. */
  | { type: "exitFinished" };

function sheetReducer(state: SheetState, event: SheetEvent): SheetState {
  switch (event.type) {
    case "openRequested":
      if (state.phase !== "closed") {
        return state;
      }
      return { phase: "enter", entered: event.reducedMotion };
    case "closeRequested":
      if (state.phase === "closed" || state.phase === "exit") {
        return state;
      }
      return { phase: "exit", entered: false };
    case "enterTransitionStarted":
      if (state.phase !== "enter") {
        return state;
      }
      return { phase: "open", entered: event.reducedMotion };
    case "enterFinished":
      if (state.phase !== "open" || state.entered) {
        return state;
      }
      return { phase: "open", entered: true };
    case "exitFinished":
      if (state.phase !== "exit") {
        return state;
      }
      return { phase: "closed", entered: false };
  }
}

type UseBottomSheetOptions = {
  open: boolean;
  reducedMotion?: boolean;
  /** Von unten einblenden oder an derselben Position überblenden. */
  enterMotion?: BottomSheetEnterMotion;
  /** Verzögerung vor dem Einblenden in Millisekunden. */
  enterDelayMs?: number;
  /** Dauer der Einblendung in Millisekunden; Standard sind 320. */
  enterDurationMs?: number;
  /** Lineare Einblendung statt der standardmäßigen Abbremsung. */
  enterTimingLinear?: boolean;
  /** Wird nach der Ausblendung aufgerufen, bei reduzierten Animationen sofort. */
  onClosed?: () => void;
  /** Wird einmal nach der Einblendung aufgerufen, bei reduzierten Animationen sofort. */
  onEntered?: () => void;
};

export function useBottomSheet({
  open,
  reducedMotion = false,
  enterMotion = "slide",
  enterDelayMs = 0,
  enterDurationMs = SHEET_TRANSITION_MS,
  enterTimingLinear = false,
  onClosed,
  onEntered,
}: UseBottomSheetOptions) {
  const transitionPropertyName =
    enterMotion === "fade" ? "opacity" : "transform";
  const [state, dispatch] = useReducer(
    sheetReducer,
    null,
    (): SheetState =>
      open
        ? { phase: "enter", entered: reducedMotion }
        : { phase: "closed", entered: false },
  );
  const { phase, entered } = state;
  const prevPhaseRef = useRef<SheetPhase>(phase);
  const onClosedRef = useLatestRef(onClosed);
  const onEnteredRef = useLatestRef(onEntered);
  const enteredNotifiedRef = useRef(false);

  useEffect(() => {
    if (prevPhaseRef.current === "exit" && phase === "closed") {
      onClosedRef.current?.();
    }
    prevPhaseRef.current = phase;
  }, [phase, onClosedRef]);

  useEffect(() => {
    if (!open) {
      enteredNotifiedRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !entered || phase !== "open") {
      return;
    }
    if (enteredNotifiedRef.current) {
      return;
    }
    enteredNotifiedRef.current = true;
    onEnteredRef.current?.();
  }, [open, entered, phase, onEnteredRef]);

  // phase als Abhängigkeit berücksichtigen, damit erneutes Öffnen nach einer laufenden Ausblendung
  // sobald der Zustand closed erreicht ist nachgeholt wird.
  useEffect(() => {
    if (open) {
      dispatch({ type: "openRequested", reducedMotion });
    } else {
      dispatch({ type: "closeRequested" });
    }
  }, [open, phase, reducedMotion]);

  // Vor der Einblendung Verzögerung und zwei Animationsbilder abwarten, damit der Browser
  // den unsichtbaren Ausgangszustand einmal gezeichnet hat.
  useEffect(() => {
    if (phase !== "enter") {
      return;
    }
    if (reducedMotion) {
      dispatch({ type: "enterTransitionStarted", reducedMotion: true });
      return;
    }
    let cancelled = false;
    let frame2 = 0;
    let frame1 = 0;
    const timer = window.setTimeout(() => {
      frame1 = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(() => {
          if (!cancelled) {
            dispatch({ type: "enterTransitionStarted", reducedMotion: false });
          }
        });
      });
    }, enterDelayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cancelAnimationFrame(frame1);
      if (frame2) {
        cancelAnimationFrame(frame2);
      }
    };
  }, [phase, reducedMotion, enterDelayMs]);

  // transitionend schließt die Ausblendung ab; ein Timer dient als Ersatz.
  useEffect(() => {
    if (phase !== "exit") {
      return;
    }
    if (reducedMotion) {
      dispatch({ type: "exitFinished" });
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: "exitFinished" });
    }, SHEET_TRANSITION_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, reducedMotion]);

  // transitionend meldet die fertige Einblendung; ein Timer dient als Ersatz.
  useEffect(() => {
    if (phase !== "open" || reducedMotion || entered) {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: "enterFinished" });
    }, enterDurationMs + 80);
    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, reducedMotion, entered, enterDurationMs]);

  const handleSheetTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (reducedMotion) {
        return;
      }
      if (event.propertyName !== transitionPropertyName) {
        return;
      }
      dispatch(
        phase === "open"
          ? { type: "enterFinished" }
          : { type: "exitFinished" },
      );
    },
    [phase, reducedMotion, transitionPropertyName],
  );

  const sheetOpen = phase === "open";
  const sheetPlaybackReady = sheetOpen && entered;
  const visible = phase !== "closed";
  /**
   * will-change nur während der Animation setzen.
   * Eine dauerhafte zusätzliche Ebene kann SVGs auf Smartphones unscharf darstellen.
   */
  const animatingLayer =
    phase === "enter" || phase === "exit" || (phase === "open" && !entered);

  const sheetMotionClass =
    enterMotion === "fade"
      ? sheetOpen
        ? "opacity-100"
        : "opacity-0"
      : sheetOpen
        ? "translate-y-0"
        : "translate-y-full";
  const sheetTransitionClass =
    enterMotion === "fade" ? "transition-opacity" : "transition-transform";
  const sheetWillChangeClass = !animatingLayer
    ? ""
    : enterMotion === "fade"
      ? "will-change-opacity"
      : "will-change-transform";
  const backdropMotionClass = sheetOpen ? "opacity-100" : "opacity-0";

  const enterTransitionMs = enterDurationMs;
  const enterEaseClass = enterTimingLinear
    ? "ease-linear"
    : "ease-[cubic-bezier(0.22,1,0.36,1)]";

  return {
    visible,
    sheetOpen,
    sheetPlaybackReady,
    sheetMotionClass,
    sheetTransitionClass,
    sheetWillChangeClass,
    backdropMotionClass,
    enterTransitionMs,
    enterEaseClass,
    handleSheetTransitionEnd,
  };
}
