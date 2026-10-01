import type { GalleryComboUrls } from "@/features/level/gallery/resolveGalleryComboUrls";
import type { GalleryEntry } from "@/features/gallery/collectGalleryEntries";
import { GalleryImageDecorations } from "@/components/features/gallery/GalleryImageDecorations";
import { LevelAiModifiedLabel } from "@/components/features/level/library/LevelAiModifiedLabel";
import { useLevelProgress } from "@/features/level/hooks/useLevelProgress";
import { levelProgressKey } from "@/features/level/levelProgress";
import { GeschenkIcon } from "@/internal_assets/icons/GeschenkIcon";
import { cn } from "@/lib/cn";

type Props = {
  entry: GalleryEntry;
  combo: GalleryComboUrls;
  onActivate?: () => void;
};

export function GalleryCard({ entry, combo, onActivate }: Props) {
  const locked = !entry.isComplete;
  const progress = useLevelProgress(levelProgressKey(entry.level));
  const imageSrc = locked
    ? entry.backgroundImageUrl
    : (combo.finishedImageUrl ?? entry.backgroundImageUrl);

  return (
    <button
      type="button"
      className={cn(
        "m-0 flex w-full cursor-pointer flex-col rounded-[0.35rem] border-2 border-transparent bg-white p-0 text-left font-[inherit] text-inherit",
        !locked && "border-swg-green bg-swg-green",
      )}
      onClick={onActivate}
      aria-label={
        entry.isBonusLevel
          ? locked
            ? `Bonuslevel ${entry.levelLabel}: Vorschau ansehen`
            : `Bonuslevel ${entry.levelLabel}: Vorher und Nachher ansehen`
          : locked
            ? `${entry.levelLabel}: Vorschau ansehen`
            : `${entry.levelLabel}: Vorher und Nachher ansehen`
      }
    >
      <div
        className={cn(
          "relative aspect-square overflow-hidden bg-[#e8e4dc]",
          locked && "gallery-unsolved-wash",
        )}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={entry.districtName}
            className={cn(
              "block size-full object-cover",
              locked && "gallery-unsolved-photo",
            )}
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="size-full bg-[#d8d4cc]" aria-hidden />
        )}
        {locked ? (
          <LevelAiModifiedLabel
            bare
            className="pointer-events-none absolute bottom-[0.45rem] left-1/2 z-[1] h-auto w-[32%] max-w-[3.25rem] -translate-x-1/2 object-contain drop-shadow-[0_1px_2px_rgb(0_0_0_/0.35)]"
          />
        ) : null}
        <GalleryImageDecorations
          level={entry.level}
          progress={progress}
        />
        {entry.isBonusLevel ? (
          <span
            className={cn(
              "pointer-events-none absolute top-[0.35rem] right-[0.35rem] z-[3] block w-7 drop-shadow-[0_1px_2px_rgb(0_0_0_/0.2)]",
              locked && "grayscale opacity-55",
            )}
            aria-hidden
          >
            <GeschenkIcon className="block h-auto w-full" />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "m-0 px-[0.35rem] pt-2 pb-[0.55rem] text-center font-display text-[1.15rem] font-normal uppercase leading-[1.15] hyphens-auto",
          !locked && "bg-[rgb(159_214_181_/0.35)]",
        )}
      >
        {entry.levelLabel}
      </p>
    </button>
  );
}
