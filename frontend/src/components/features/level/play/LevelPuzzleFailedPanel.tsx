import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useModalAssistiveHide } from "@/hooks/useModalAssistiveHide";

type LevelPuzzleFailedPanelProps = {
  onRestart: () => void;
  onExit: () => void;
};

/**
 * Zentriert das Panel über dem Brett und verwendet denselben Designrahmen wie der Vorher-Nachher-Vergleich.
 */
export function LevelPuzzleFailedPanel({
  onRestart,
  onExit,
}: LevelPuzzleFailedPanelProps) {
  const gateRef = useRef<HTMLDivElement>(null);
  useModalAssistiveHide(true, gateRef);

  return (
    <div
      ref={gateRef}
      className="level-puzzle-failed-gate pointer-events-none absolute inset-0 z-[1]"
    >
      <div className="level-puzzle-failed-gate__scene">
        <div className="level-puzzle-failed-gate__board-frame">
          <div className="flex h-full w-full items-center justify-center p-4">
            <div
              className="level-puzzle-failed-panel pointer-events-auto flex flex-col items-center gap-4 px-4 py-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="puzzle-failed-panel-title"
            >
              <h2
                id="puzzle-failed-panel-title"
                className="m-0 text-center font-text text-[1.375rem] font-bold leading-tight text-swg-black"
              >
                Da geht noch mehr!
              </h2>
              <div className="flex w-full flex-col gap-3">
                <Button grow onClick={onRestart}>
                  nochmal spielen
                </Button>
                <Button grow onClick={onExit}>
                  beenden
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
