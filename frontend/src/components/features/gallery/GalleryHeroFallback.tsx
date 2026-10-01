import { LevelAiModifiedLabel } from "@/components/features/level/library/LevelAiModifiedLabel";
import { cn } from "@/lib/cn";

type GalleryHeroFallbackProps = {
  src: string | null;
  alt?: string;
  /** Zeigt ungelöste Level entsättigt und aufgehellt. */
  muted?: boolean;
  className?: string;
  onLoad?: () => void;
};

/** Ersatzbild für Galerie-Details und den Vergleich vor dem Quiz. */
export function GalleryHeroFallback({
  src,
  alt = "",
  muted = false,
  className,
  onLoad,
}: GalleryHeroFallbackProps) {
  return (
    <div
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden bg-swg-blue-dark",
        muted && "gallery-unsolved-wash",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className={cn(
            "block size-full object-cover object-center",
            muted && "gallery-unsolved-photo",
          )}
          draggable={false}
          onLoad={onLoad}
        />
      ) : null}
      {muted ? (
        <LevelAiModifiedLabel
          bare
          className="pointer-events-none absolute bottom-[0.65rem] left-1/2 z-[1] h-auto w-[28%] max-w-[4.5rem] -translate-x-1/2 object-contain drop-shadow-[0_1px_2px_rgb(0_0_0_/0.35)]"
        />
      ) : null}
    </div>
  );
}
