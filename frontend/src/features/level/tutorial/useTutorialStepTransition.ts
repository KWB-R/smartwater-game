import { useEffect, useRef, useState } from "react";
import type { LevelPlayTutorialStepConfig } from "@/features/level/tutorial/types";

const TUTORIAL_STEP_FADE_MS = 260;

type UseTutorialStepTransitionArgs = {
  active: boolean;
  step: LevelPlayTutorialStepConfig | null;
  uiSuspended: boolean;
};

export function useTutorialStepTransition({
  active,
  step,
  uiSuspended,
}: UseTutorialStepTransitionArgs): {
  displayStep: LevelPlayTutorialStepConfig | null;
  visible: boolean;
} {
  const [displayStep, setDisplayStep] = useState<LevelPlayTutorialStepConfig | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const shownStepIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !step) {
      shownStepIdRef.current = null;
      setVisible(false);
      setDisplayStep(null);
      return;
    }

    if (uiSuspended) {
      // Nach Detail oder Menü nur den aktuellen Tutorialschritt zeigen.
      shownStepIdRef.current = null;
      setVisible(false);
      setDisplayStep(null);
      return;
    }

    if (shownStepIdRef.current === step.id) {
      setDisplayStep(step);
      requestAnimationFrame(() => setVisible(true));
      return;
    }

    setVisible(false);
    const isFirst = shownStepIdRef.current === null;
    const delay = isFirst ? 0 : TUTORIAL_STEP_FADE_MS;

    const timer = window.setTimeout(() => {
      shownStepIdRef.current = step.id;
      setDisplayStep(step);
      requestAnimationFrame(() => setVisible(true));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [active, step, uiSuspended]);

  return {
    displayStep,
    visible: visible && !uiSuspended,
  };
}
