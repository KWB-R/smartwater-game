import { useRef, type RefObject } from "react";
import { cn } from "@/lib/cn";
import { PuzzleCountBadge } from "@/components/features/map/PuzzleCountBadge";
import { puzzleCountBadgeValues } from "@/features/map/puzzleCountBadgeDisplay";
import { PuzzleCardsIcon } from "@/internal_assets/icons/PuzzleCardsIcon";
import { LevelAiModifiedLabel } from "@/components/features/level/library/LevelAiModifiedLabel";
import { useLibraryBadgeDragDodge } from "./useLibraryBadgeDragDodge";

type LevelLibraryPuzzleBadgeOverlayProps = {
  puzzlePlaced: number;
  maxPuzzleItems: number;
  /** Ersatzwert, falls kein Puzzlelimit festgelegt ist. */
  score?: number;
  maxScore?: number;
  badgeRef?: RefObject<HTMLSpanElement | null>;
  tileCardsButtonRef?: RefObject<HTMLButtonElement | null>;
  onOpenTileCardsMenu?: () => void;
  tileCardsMenuDisabled?: boolean;
  tileCardsButtonTutorialPromoted?: boolean;
  /** Beim Ziehen weichen Zähler, Schaltfläche und Beschriftung dem Zeiger aus. */
  draggingTileId?: number | null;
  reducedMotion?: boolean;
};

/** Positioniert den Zähler an der Grenze zwischen Brett und Puzzleteilbibliothek. */
export function LevelLibraryPuzzleBadgeOverlay({
  puzzlePlaced,
  maxPuzzleItems,
  score = 0,
  maxScore = 1,
  badgeRef,
  tileCardsButtonRef,
  onOpenTileCardsMenu,
  tileCardsMenuDisabled = false,
  tileCardsButtonTutorialPromoted = false,
  draggingTileId = null,
  reducedMotion = false,
}: LevelLibraryPuzzleBadgeOverlayProps) {
  const { badgeScore, badgeMax } = puzzleCountBadgeValues({
    score,
    maxScore,
    puzzlePlaced,
    maxPuzzleItems,
  });

  const leftSlotRef = useRef<HTMLDivElement | null>(null);
  const centerSlotRef = useRef<HTMLDivElement | null>(null);
  const rightSlotRef = useRef<HTMLDivElement | null>(null);
  const { dodgeLeft, dodgeRight, dodgeCenter } = useLibraryBadgeDragDodge({
    dragging: draggingTileId != null,
    leftSlotRef,
    rightSlotRef,
    centerSlotRef,
  });

  return (
    <div
      className={cn(
        "level-library-puzzle-badge-overlay",
        tileCardsButtonTutorialPromoted &&
          "level-library-puzzle-badge-overlay--tutorial-tile-cards",
        reducedMotion && "level-library-puzzle-badge-overlay--reduced-motion",
      )}
    >
      <div
        ref={leftSlotRef}
        className="level-library-puzzle-badge-overlay__slot level-library-puzzle-badge-overlay__slot--left"
      >
        <PuzzleCountBadge
          ref={badgeRef}
          badgeScore={badgeScore}
          badgeMax={badgeMax}
          className={cn(
            "pointer-events-auto level-library-puzzle-badge-overlay__badge",
            dodgeLeft && "level-library-puzzle-badge-overlay__badge--dodge",
          )}
        />
      </div>

      <div className="level-library-puzzle-badge-overlay__slot level-library-puzzle-badge-overlay__slot--center">
        <div
          ref={centerSlotRef}
          className="level-library-puzzle-badge-overlay__ai-label-hit"
        >
          <LevelAiModifiedLabel dodge={dodgeCenter} />
        </div>
      </div>

      {onOpenTileCardsMenu ? (
        <div
          ref={rightSlotRef}
          className="level-library-puzzle-badge-overlay__slot level-library-puzzle-badge-overlay__slot--right"
        >
          <button
            ref={tileCardsButtonRef}
            type="button"
            className={cn(
              "level-library-tile-cards-button pointer-events-auto",
              dodgeRight && "level-library-tile-cards-button--dodge",
            )}
            onClick={onOpenTileCardsMenu}
            disabled={tileCardsMenuDisabled}
            aria-label="Kachel-Infos öffnen"
          >
            <PuzzleCardsIcon className="level-library-tile-cards-button__icon" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
