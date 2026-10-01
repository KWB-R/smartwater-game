import aiModifiedLabelUrl from "@/internal_assets/ai_label/LABEL_AI-MODIFIED_white_transparent.png";
import { cn } from "@/lib/cn";

type LevelAiModifiedLabelProps = {
  className?: string;
  dodge?: boolean;
  /** Verwendet eigene Klassen, wenn die Bibliotheksstile nicht verfügbar sind. */
  bare?: boolean;
};

/** Hinweis KI-modifiziert; in der Bibliothek über levelGame.scss, sonst über className gestaltet. */
export function LevelAiModifiedLabel({
  className,
  dodge = false,
  bare = false,
}: LevelAiModifiedLabelProps) {
  return (
    <img
      src={aiModifiedLabelUrl}
      alt="KI-modifiziert"
      className={cn(
        !bare && "level-library-puzzle-badge-overlay__ai-label",
        !bare && dodge && "level-library-puzzle-badge-overlay__ai-label--dodge",
        className,
      )}
      draggable={false}
    />
  );
}
