import { getSelectedLevelMascotUrl } from "@/features/level/logic/levelMascotDisplay";
import {
  isQuizPassedProgress,
  type LevelProgress,
} from "@/features/level/levelProgress";
import { KronenIcon } from "@/internal_assets/icons/KronenIcon";
import { cn } from "@/lib/cn";
import type { DistrictLevelSummary } from "@/types/content";

type Props = {
  level: DistrictLevelSummary;
  progress: LevelProgress | null | undefined;
  className?: string;
};

/**
 * Zeigt auf Galeriekarten das Maskottchen zum Spielstand und bei bestandenem Quiz eine Krone.
 */
export function GalleryImageDecorations({ level, progress, className }: Props) {
  const mascotUrl = getSelectedLevelMascotUrl(level, progress);
  const showCrown = isQuizPassedProgress(progress);

  if (!mascotUrl && !showCrown) {
    return null;
  }

  const locked = progress?.completed !== true;

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-[2]", className)}
      aria-hidden
    >
      {showCrown ? (
        <span className="absolute top-[0.35rem] left-[0.35rem] block w-11 -rotate-[18deg] drop-shadow-[0_1px_2px_rgb(0_0_0_/0.25)]">
          <KronenIcon className="block h-auto w-full" />
        </span>
      ) : null}
      {mascotUrl ? (
        <img
          src={mascotUrl}
          alt=""
          className={cn(
            "absolute right-4 bottom-4 h-[56%] max-h-[11.2rem] w-auto max-w-[56%] object-contain object-right-bottom drop-shadow-[0_2px_6px_rgb(0_0_0_/0.28)]",
            locked && "grayscale",
          )}
          draggable={false}
        />
      ) : null}
    </div>
  );
}
