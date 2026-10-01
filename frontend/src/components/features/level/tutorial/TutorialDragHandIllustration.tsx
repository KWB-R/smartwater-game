import { TutorialHand } from "@/internal_assets/tutorial/TutorialHand";

/**
 * Reserviert die feste SVG-Größe, damit die Sprechblase beim ersten Zeichnen nicht nach unten wächst.
 */
export function TutorialDragHandIllustration() {
  return (
    <div
      className="tutorial-drag-hand-illustration aspect-[133/171] h-[7.5rem] w-auto shrink-0 overflow-hidden [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
      aria-hidden
    >
      <TutorialHand animateHandTowardPuzzlePiece />
    </div>
  );
}
