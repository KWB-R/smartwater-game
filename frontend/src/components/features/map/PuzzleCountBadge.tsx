import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type PuzzleCountBadgeProps = {
  badgeScore: number;
  badgeMax: number;
  className?: string;
};

export const PuzzleCountBadge = forwardRef<
  HTMLSpanElement,
  PuzzleCountBadgeProps
>(function PuzzleCountBadge({ badgeScore, badgeMax, className }, ref) {
  return (
    <span
      ref={ref}
      className={cn(
        "flex min-h-10 min-w-10  shrink-0 items-center justify-center rounded-[2rem] bg-white px-3.5 font-display text-base leading-none text-swg-blue-dark",
        className,
      )}
      aria-live="polite"
    >
      Züge: {badgeScore}/{badgeMax}
    </span>
  );
});
