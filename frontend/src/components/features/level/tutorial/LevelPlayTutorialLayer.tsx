import { OverlayPortal } from "@/components/ui/OverlayPortal";
import type { Tile } from "@/features/level/types";
import { TutorialDragHandIllustration } from "@/components/features/level/tutorial/TutorialDragHandIllustration";
import { TutorialSpeechBubble } from "@/components/features/level/tutorial/TutorialSpeechBubble";
import { TutorialSpotlight } from "@/components/features/level/tutorial/TutorialSpotlight";
import type { UseLevelPlayTutorialResult } from "@/features/level/tutorial/useLevelPlayTutorial";
import {
  useTutorialTargetRect,
  type TutorialTargetRefs,
} from "@/features/level/tutorial/useTutorialTargetRect";
import { useTutorialStepTransition } from "@/features/level/tutorial/useTutorialStepTransition";
import {
  resolveTutorialStepMessage,
  resolveTutorialStepMessageContent,
} from "@/features/level/tutorial/resolveTutorialStepMessage";
import { PuzzleCardsIcon } from "@/internal_assets/icons/PuzzleCardsIcon";
import { cn } from "@/lib/cn";
import "@/components/features/level/tutorial/tutorialLevelPlay.scss";

type LevelPlayTutorialLayerProps = {
  tutorial: UseLevelPlayTutorialResult;
  refs: TutorialTargetRefs;
  stripTiles: ReadonlyArray<Tile>;
  maxPuzzleItems: number;
  onTileCardsButtonClick?: () => void;
  libraryIntroSettled?: boolean;
};

export function LevelPlayTutorialLayer({
  tutorial,
  refs,
  stripTiles,
  maxPuzzleItems,
  onTileCardsButtonClick,
  libraryIntroSettled = true,
}: LevelPlayTutorialLayerProps) {
  const { active, step, uiSuspended, draggingTileId } = tutorial;

  const dragStepActiveDrag =
    step?.advance.type === "dragReleased" && draggingTileId != null;

  const { displayStep, visible } = useTutorialStepTransition({
    active,
    step,
    uiSuspended: uiSuspended && !dragStepActiveDrag,
  });

  const effectiveStep =
    active && step && (!uiSuspended || dragStepActiveDrag)
      ? (displayStep ?? step)
      : null;

  const rectStep = displayStep ?? step;
  const { highlightRect, speechBubbleAnchorRect, pointerAnchorRect, undimRects, secondaryHighlightRects, highlightClipRect } =
    useTutorialTargetRect(
    Boolean(active && step),
    uiSuspended && !dragStepActiveDrag ? step : rectStep,
    refs,
    stripTiles,
  );

  if (!active || !step || !libraryIntroSettled || (uiSuspended && !dragStepActiveDrag) || effectiveStep == null) {
    return null;
  }

  const showButton =
    effectiveStep.advance.type === "primaryButton" &&
    effectiveStep.primaryButtonLabel;

  const showSpeechBubble = !dragStepActiveDrag;

  const bubbleAnchorRect = effectiveStep.speechBubbleTarget
    ? speechBubbleAnchorRect
    : (speechBubbleAnchorRect ?? highlightRect);

  const spotlightUndimRects =
    dragStepActiveDrag && highlightRect != null
      ? [...undimRects, highlightRect]
      : undimRects;

  const showPromotedTileCardsButton =
    effectiveStep.advance.type === "detailClosed" &&
    highlightRect != null &&
    onTileCardsButtonClick != null;

  return (
    <OverlayPortal target="body">
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-[85]",
        "tutorial-step-layer",
        visible && "tutorial-step-layer--visible",
      )}
      aria-hidden={false}
    >
      <TutorialSpotlight
        highlightRect={highlightRect}
        undimRects={spotlightUndimRects}
        secondaryHighlightRects={secondaryHighlightRects}
        highlightClipRect={highlightClipRect}
        secondaryHighlightPadding={
          effectiveStep.libraryPieceHighlightPadding ?? 6
        }
        padding={effectiveStep.highlightPadding ?? 6}
        blockPointerEvents={
          effectiveStep.dimOverlay === true &&
          effectiveStep.advance.type !== "detailClosed" &&
          effectiveStep.advance.type !== "dragReleased"
        }
        blockPointerThroughHoles={
          effectiveStep.advance.type === "primaryButton"
        }
        showPrimaryHighlightRing={effectiveStep.showPrimaryHighlightRing !== false}
        highlightPulse={effectiveStep.highlightPulse === true}
        secondaryHighlightPulse={effectiveStep.secondaryHighlightPulse === true}
        showDimOverlay={effectiveStep.dimOverlay === true}
        dimPrimaryTarget={!dragStepActiveDrag}
        highlightRingBorderRadius={effectiveStep.highlightRingBorderRadius}
      />
      {showSpeechBubble && bubbleAnchorRect != null ? (
        <TutorialSpeechBubble
          key={effectiveStep.id}
          message={resolveTutorialStepMessageContent(
            effectiveStep,
            maxPuzzleItems,
          )}
          messageAriaLabel={resolveTutorialStepMessage(
            effectiveStep,
            maxPuzzleItems,
          )}
          primaryButtonLabel={showButton ? effectiveStep.primaryButtonLabel : undefined}
          onPrimaryAction={
            showButton ? tutorial.goNextFromButton : undefined
          }
          pointer={effectiveStep.pointer}
          anchorRect={bubbleAnchorRect}
          pointerAnchorRect={
            pointerAnchorRect ??
            (effectiveStep.bubblePlacement === "aboveTarget"
              ? bubbleAnchorRect
              : null)
          }
          placement={effectiveStep.bubblePlacement}
          bubbleGap={effectiveStep.bubbleGap}
          contentRow={effectiveStep.bubbleContentRow === true}
          pointerCentered={effectiveStep.bubblePointerCentered === true}
          pointerHorizontalAlign={
            effectiveStep.bubblePointerHorizontalAlign ?? "center"
          }
          illustration={
            effectiveStep.showDragHandIllustration ? (
              <TutorialDragHandIllustration />
            ) : undefined
          }
          pointerPassThrough={effectiveStep.advance.type === "dragReleased"}
        />
      ) : null}
      {showPromotedTileCardsButton && highlightRect != null ? (
        <OverlayPortal target="body">
          <button
            type="button"
            className="level-library-tile-cards-button level-library-tile-cards-button--tutorial-clone pointer-events-auto fixed z-[88] flex items-center justify-center"
            style={{
              top: highlightRect.top,
              left: highlightRect.left,
              width: highlightRect.width,
              height: highlightRect.height,
            }}
            onClick={onTileCardsButtonClick}
            aria-label="Kachel-Infos öffnen"
          >
            <PuzzleCardsIcon className="level-library-tile-cards-button__icon" />
          </button>
        </OverlayPortal>
      ) : null}
    </div>
    </OverlayPortal>
  );
}
