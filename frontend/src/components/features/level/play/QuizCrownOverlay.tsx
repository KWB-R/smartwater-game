import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { KronenIcon } from "@/internal_assets/icons/KronenIcon";
import { useMainMenu } from "@/components/layout/mainMenuContext";
import { CelebrationRays } from "@/components/ui/CelebrationRays";
import {
  OverlayCenterLayer,
  OverlayPortal,
} from "@/components/ui/OverlayPortal";

const QUIZ_CROWN_AUTO_DISMISS_MS = 2600;

type QuizCrownOverlayProps = {
  open: boolean;
  reducedMotion?: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QuizCrownOverlay({
  open,
  reducedMotion = false,
  onOpenChange,
}: QuizCrownOverlayProps) {
  const { isOpen: mainMenuOpen } = useMainMenu();
  const wasOpenRef = useRef(false);
  const [enterGeneration, setEnterGeneration] = useState(0);
  const visible = open && !mainMenuOpen;

  useEffect(() => {
    if (visible && !wasOpenRef.current) {
      setEnterGeneration((g) => g + 1);
    }
    wasOpenRef.current = visible;
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const dismissMs = reducedMotion ? 800 : QUIZ_CROWN_AUTO_DISMISS_MS;
    const timer = window.setTimeout(() => {
      onOpenChange(false);
    }, dismissMs);
    return () => window.clearTimeout(timer);
  }, [visible, reducedMotion, onOpenChange, enterGeneration]);

  if (!visible) {
    return null;
  }

  return (
    <OverlayPortal>
      <OverlayCenterLayer>
        <div
          key={enterGeneration}
          className={cn(
            "quiz-crown-overlay relative isolate flex aspect-square w-[min(100%-2rem,17.5rem)] max-w-[17.5rem] flex-col items-stretch overflow-hidden rounded-2xl border-[3px] border-swg-black bg-white",
            reducedMotion && "quiz-crown-overlay--instant",
          )}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="quiz-crown-overlay__rays" aria-hidden>
            <CelebrationRays reducedMotion={reducedMotion} />
          </div>
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 items-center justify-center px-6 pt-3 pb-2">
              <KronenIcon className="quiz-crown-overlay__crown max-h-[min(11.25rem,62%)] w-auto max-w-[92%]" />
            </div>
            <p className="m-0 shrink-0 px-4 pt-1 pb-5 text-center font-text text-[1.25rem] font-medium leading-snug text-swg-black">
              Yeah! Krone erhalten!
            </p>
          </div>
        </div>
      </OverlayCenterLayer>
    </OverlayPortal>
  );
}
