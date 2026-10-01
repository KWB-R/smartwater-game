import { LevelShareComboVideo } from "@/components/features/level/play/LevelShareComboVideo";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  finishedImageUrl: string | null;
  videoUrl: string | null;
  alt?: string;
  className?: string;
  playbackActive?: boolean;
  /** Zeigt das Puzzle darunter, bis WebP oder Video eingeblendet werden können. */
  transparentWhileLoading?: boolean;
  onVideoDurationMs?: (durationMs: number) => void;
};

/** Nachher-Seite: WebP-Basis; optional Combo-MP4 darüber (Loop). */
export function GalleryDetailAfterLayer({
  finishedImageUrl,
  videoUrl,
  alt = "",
  className = "",
  playbackActive = true,
  transparentWhileLoading = false,
  onVideoDurationMs,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const showVideo = Boolean(videoUrl) && !reducedMotion;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const finishedImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImageLoaded(false);
    setVideoReady(false);
  }, [finishedImageUrl, videoUrl, reducedMotion]);

  useEffect(() => {
    if (!finishedImageUrl) {
      return;
    }
    const img = finishedImgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, [finishedImageUrl]);

  const handleVideoFirstFrame = useCallback(() => {
    setVideoReady(true);
  }, []);

  const mediaReady =
    (Boolean(finishedImageUrl) && imageLoaded) || (showVideo && videoReady);

  return (
    <div
      className={cn(
        "relative size-full overflow-hidden",
        transparentWhileLoading &&
          "transition-opacity duration-200 motion-reduce:transition-none",
        transparentWhileLoading && !mediaReady && "opacity-0",
        className,
      )}
    >
      {finishedImageUrl ? (
        <img
          ref={finishedImgRef}
          src={finishedImageUrl}
          alt={alt}
          className={cn(
            "gallery-detail-after-img block size-full object-cover",
            transparentWhileLoading && !imageLoaded && "opacity-0",
          )}
          draggable={false}
          onLoad={() => setImageLoaded(true)}
        />
      ) : !transparentWhileLoading ? (
        <div className="size-full bg-[#555]" aria-hidden />
      ) : null}
      {showVideo && videoUrl ? (
        <div
          className={cn(
            "absolute inset-0 z-[1] transition-opacity duration-200 [&_.level-scene__share-combo-video]:absolute [&_.level-scene__share-combo-video]:inset-0 [&_.level-scene__share-combo-video]:bg-transparent [&_video]:object-cover",
            videoReady ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <LevelShareComboVideo
            src={videoUrl}
            posterSrc={finishedImageUrl}
            reducedMotion={reducedMotion}
            playbackActive={playbackActive}
            onMediaDurationMs={onVideoDurationMs}
            onFirstFrameReady={handleVideoFirstFrame}
          />
        </div>
      ) : null}
    </div>
  );
}
