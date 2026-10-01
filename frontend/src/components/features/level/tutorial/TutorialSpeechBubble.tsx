import type { ReactNode } from "react";
import type {
  LevelPlayTutorialPointerSide,
  LevelPlayTutorialRect,
} from "@/features/level/tutorial/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

type TutorialSpeechBubbleProps = {
  message: ReactNode;
  /** Screenreader-Beschriftung als Text ohne Markup. */
  messageAriaLabel?: string;
  primaryButtonLabel?: string;
  onPrimaryAction?: () => void;
  pointer: LevelPlayTutorialPointerSide;
  anchorRect?: LevelPlayTutorialRect | null;
  /** Horizontale Pfeilspitze (Viewport); z. B. Mitte des Puzzle-Zählers. */
  pointerAnchorRect?: LevelPlayTutorialRect | null;
  placement: "belowTarget" | "aboveTarget" | "center" | "centerOverBoard";
  bubbleGap?: number;
  contentRow?: boolean;
  pointerCentered?: boolean;
  pointerHorizontalAlign?: "left" | "center" | "right";
  illustration?: ReactNode;
  /** Klicks durchreichen (z. B. Zieh-Schritt über Bibliothek). */
  pointerPassThrough?: boolean;
};

const BUBBLE_MAX_WIDTH = 320;
const VIEWPORT_PAD = 16;
const DEFAULT_GAP = 32;
/** Pfeil ragt unter die Blase (siehe SCSS). */
const BUBBLE_POINTER_EXTEND_PX = 24;
const BUBBLE_POINTER_EDGE_INSET_PX = 28;

function pointerClass(side: LevelPlayTutorialPointerSide): string {
  switch (side) {
    case "top":
      return "tutorial-speech-bubble__pointer tutorial-speech-bubble__pointer--top";
    case "bottom":
      return "tutorial-speech-bubble__pointer tutorial-speech-bubble__pointer--bottom";
    case "left":
      return "tutorial-speech-bubble__pointer tutorial-speech-bubble__pointer--left";
    case "right":
      return "tutorial-speech-bubble__pointer tutorial-speech-bubble__pointer--right";
    default:
      return "hidden";
  }
}

function computePosition(
  placement: TutorialSpeechBubbleProps["placement"],
  anchorRect: LevelPlayTutorialRect | null | undefined,
  bubbleWidth: number,
  bubbleHeight: number,
  bubbleGap: number,
  pointer: LevelPlayTutorialPointerSide,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampLeft = (left: number) =>
    Math.min(
      Math.max(VIEWPORT_PAD, left),
      Math.max(VIEWPORT_PAD, vw - bubbleWidth - VIEWPORT_PAD),
    );
  const clampTop = (top: number) =>
    Math.min(
      Math.max(VIEWPORT_PAD, top),
      Math.max(VIEWPORT_PAD, vh - bubbleHeight - VIEWPORT_PAD),
    );

  if (placement === "center" || !anchorRect) {
    return {
      top: clampTop((vh - bubbleHeight) / 2),
      left: clampLeft((vw - bubbleWidth) / 2),
    };
  }

  if (placement === "centerOverBoard" && anchorRect) {
    return {
      top: clampTop(anchorRect.top + anchorRect.height * 0.42),
      left: clampLeft(anchorRect.left + anchorRect.width / 2 - bubbleWidth / 2),
    };
  }

  if (placement === "belowTarget" && anchorRect) {
    return {
      top: clampTop(anchorRect.top + anchorRect.height + bubbleGap),
      left: clampLeft(anchorRect.left + anchorRect.width / 2 - bubbleWidth / 2),
    };
  }

  if (placement === "aboveTarget" && anchorRect) {
    const pointerClearance =
      pointer === "bottom" ? BUBBLE_POINTER_EXTEND_PX : 0;
    return {
      top: clampTop(
        anchorRect.top - bubbleHeight - bubbleGap - pointerClearance,
      ),
      left: clampLeft(anchorRect.left + anchorRect.width / 2 - bubbleWidth / 2),
    };
  }

  return {
    top: clampTop((vh - bubbleHeight) / 2),
    left: clampLeft((vw - bubbleWidth) / 2),
  };
}

export function TutorialSpeechBubble({
  message,
  messageAriaLabel,
  primaryButtonLabel,
  onPrimaryAction,
  pointer,
  anchorRect,
  pointerAnchorRect,
  placement,
  bubbleGap: bubbleGapProp,
  contentRow = false,
  pointerCentered = false,
  pointerHorizontalAlign = "center",
  illustration,
  pointerPassThrough = false,
}: TutorialSpeechBubbleProps) {
  const bubbleWidth = Math.min(
    BUBBLE_MAX_WIDTH,
    window.innerWidth - VIEWPORT_PAD * 2,
  );
  const bubbleGap = bubbleGapProp ?? DEFAULT_GAP;
  const estimatedHeight = primaryButtonLabel
    ? 200
    : contentRow && illustration
      ? 132
      : illustration
        ? 168
        : 118;
  const { top, left } = computePosition(
    placement,
    anchorRect,
    bubbleWidth,
    estimatedHeight,
    bubbleGap,
    pointer,
  );

  const pointerTipViewportX =
    pointerAnchorRect != null
      ? pointerAnchorRect.left + pointerAnchorRect.width / 2
      : null;
  const pointerLeftInBubble =
    pointerHorizontalAlign === "right"
      ? bubbleWidth - BUBBLE_POINTER_EDGE_INSET_PX
      : pointerHorizontalAlign === "left"
        ? BUBBLE_POINTER_EDGE_INSET_PX
        : pointerTipViewportX != null && !pointerCentered
          ? Math.min(
              bubbleWidth - BUBBLE_POINTER_EDGE_INSET_PX,
              Math.max(BUBBLE_POINTER_EDGE_INSET_PX, pointerTipViewportX - left),
            )
          : null;

  return (
    <div
      className={cn(
        "tutorial-speech-bubble fixed z-[2] box-border rounded-2xl border-[3px] border-black bg-white px-5 py-4 text-center font-text text-lg leading-snug text-swg-black shadow-lg",
        pointerPassThrough ? "pointer-events-none" : "pointer-events-auto",
      )}
      style={{ top, left, width: bubbleWidth }}
      role="dialog"
      aria-live="polite"
      aria-label={
        messageAriaLabel ??
        (typeof message === "string" ? message : undefined)
      }
    >
      {pointer !== "none" ? (
        <span
          className={pointerClass(pointer)}
          style={
            pointerLeftInBubble != null &&
            (pointer === "top" || pointer === "bottom")
              ? { left: pointerLeftInBubble }
              : pointerCentered && (pointer === "top" || pointer === "bottom")
                ? { left: "50%" }
                : undefined
          }
          aria-hidden
        />
      ) : null}
      {contentRow && illustration ? (
        <div className="mt-1 flex items-center gap-3 text-left">
          <p className="m-0 min-w-0 flex-1 whitespace-pre-line">{message}</p>
          <div className="shrink-0">{illustration}</div>
        </div>
      ) : (
        <>
          <p className="m-0 whitespace-pre-line">{message}</p>
          {illustration ? (
            <div className="mt-3 flex justify-center">{illustration}</div>
          ) : null}
        </>
      )}
      {primaryButtonLabel && onPrimaryAction ? (
        <Button className="mt-5 min-w-[9rem]" onClick={onPrimaryAction}>
          {primaryButtonLabel}
        </Button>
      ) : null}
    </div>
  );
}
