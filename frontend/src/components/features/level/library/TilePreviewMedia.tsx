import { TileSpriteVisual } from "@/components/features/level/TileSpriteVisual";
import type { TilePreviewMediaState } from "./useTilePreviewMedia";

type TilePreviewMediaProps = {
  preview: TilePreviewMediaState;
  alt: string;
  imageAlt?: string;
  spriteClassName?: string;
  imageClassName?: string;
  loadingLabel?: string;
  showLoadingProgress?: boolean;
};

export function TilePreviewMedia({
  preview,
  alt,
  imageAlt = alt,
  spriteClassName = "",
  imageClassName = "",
  loadingLabel,
  showLoadingProgress = false,
}: TilePreviewMediaProps) {
  const { asset, previewUrl, sprite } = preview;

  if (previewUrl && sprite) {
    return (
      <TileSpriteVisual
        spritesheet={sprite}
        mode="strip"
        alt={alt}
        className={spriteClassName}
        resolvedAssetUrl={previewUrl}
      />
    );
  }

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={imageAlt}
        draggable={false}
        className={imageClassName}
      />
    );
  }

  if (!showLoadingProgress) {
    return null;
  }

  const progressPercent = asset.indeterminate
    ? undefined
    : Math.round(Math.min(100, Math.max(0, asset.progress * 100)));

  return (
    <>
      <div
        className="absolute inset-0 rounded-md bg-linear-to-br from-slate-400/35 via-slate-200/55 to-slate-400/35"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 bottom-0 left-0 z-[2] h-1"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        aria-label={loadingLabel}
      >
        <div className="h-full overflow-hidden bg-slate-900/22">
          <div
            className={
              asset.indeterminate
                ? "h-full w-[42%] origin-left animate-level-tile-thumb-progress-scan bg-linear-to-r from-sky-500 to-cyan-500"
                : "h-full w-full origin-left bg-linear-to-r from-sky-500 to-cyan-500 transition-transform duration-100 ease-out"
            }
            style={
              asset.indeterminate
                ? undefined
                : { transform: `scaleX(${asset.progress})` }
            }
          />
        </div>
      </div>
    </>
  );
}
