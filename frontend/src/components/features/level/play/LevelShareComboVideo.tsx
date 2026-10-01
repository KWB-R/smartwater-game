import { memo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type LevelShareComboVideoProps = {
  src: string;
  posterSrc?: string | null;
  reducedMotion?: boolean;
  /** false während der Einblendung, damit mobile Browser die Wiedergabe erst bei sichtbarem Sheet starten. */
  playbackActive?: boolean;
  onMediaDurationMs?: (durationMs: number) => void;
  /** Meldet das erste abspielbare Bild, um einen leeren Zwischenzustand zu vermeiden. */
  onFirstFrameReady?: () => void;
};

function applyInlineMutedPlayback(el: HTMLVideoElement): void {
  el.muted = true;
  el.defaultMuted = true;
  el.setAttribute("muted", "");
  el.playsInline = true;
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "");
}

async function playMutedInline(el: HTMLVideoElement): Promise<boolean> {
  applyInlineMutedPlayback(el);
  try {
    await el.play();
    return !el.paused;
  } catch {
    return false;
  }
}

/** Auf Mobilgeräten play() kurz erneut versuchen, wenn die Einblendung den ersten Start verhindert. */
function scheduleMutedPlayAttempts(
  el: HTMLVideoElement,
  isActive: () => boolean,
): () => void {
  let cancelled = false;
  const attempt = () => {
    if (cancelled || !isActive()) {
      return;
    }
    void playMutedInline(el);
  };

  attempt();
  const raf = requestAnimationFrame(attempt);
  const t1 = window.setTimeout(attempt, 120);
  const t2 = window.setTimeout(attempt, 380);
  const interval = window.setInterval(() => {
    if (cancelled || !isActive()) {
      return;
    }
    if (!el.paused) {
      window.clearInterval(interval);
      return;
    }
    attempt();
  }, 450);

  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(t1);
    window.clearTimeout(t2);
    window.clearInterval(interval);
  };
}

/** Vorgefertigtes Kombivideo über dem Brett auf der Teilen-Seite. */
function LevelShareComboVideoInner({
  src,
  posterSrc,
  reducedMotion = false,
  playbackActive = true,
  onMediaDurationMs,
  onFirstFrameReady,
}: LevelShareComboVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const firstFrameReportedRef = useRef(false);

  useEffect(() => {
    firstFrameReportedRef.current = false;
  }, [src]);

  const reportFirstFrameReady = useCallback(() => {
    if (firstFrameReportedRef.current) {
      return;
    }
    firstFrameReportedRef.current = true;
    onFirstFrameReady?.();
  }, [onFirstFrameReady]);

  const ensurePlaying = useCallback(() => {
    const el = videoRef.current;
    if (!el || reducedMotion || !playbackActive) {
      return;
    }
    applyInlineMutedPlayback(el);
    el.playbackRate = 1;
    if (el.paused) {
      void playMutedInline(el);
    }
  }, [reducedMotion, playbackActive]);

  const handleEnded = useCallback(() => {
    const el = videoRef.current;
    if (!el || reducedMotion) {
      return;
    }
    el.currentTime = 0;
    ensurePlaying();
  }, [reducedMotion, ensurePlaying]);

  const handleLoadedMetadata = useCallback(() => {
    const el = videoRef.current;
    if (!el) {
      return;
    }
    const seconds = el.duration;
    if (Number.isFinite(seconds) && seconds > 0) {
      onMediaDurationMs?.(seconds * 1000);
    }
  }, [onMediaDurationMs]);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      reportFirstFrameReady();
    }
  }, [src, reportFirstFrameReady]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || reducedMotion) {
      return;
    }
    applyInlineMutedPlayback(el);
    if (!playbackActive) {
      el.pause();
      return;
    }
    return scheduleMutedPlayAttempts(el, () => playbackActive);
  }, [playbackActive, reducedMotion, src]);

  const backdropClass = posterSrc?.trim()
    ? "bg-transparent"
    : "bg-black";

  return (
    <div
      className={cn(
        "level-scene__share-combo-video pointer-events-none absolute inset-0 z-10 flex items-center justify-center",
        backdropClass,
      )}
      aria-hidden
    >
      <video
        ref={videoRef}
        key={src}
        className="h-full w-full object-cover"
        src={src}
        poster={posterSrc?.trim() ? posterSrc : undefined}
        autoPlay={!reducedMotion && playbackActive}
        loop={!reducedMotion}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        aria-label="Fertiges Level-Video"
        onCanPlay={() => {
          reportFirstFrameReady();
          ensurePlaying();
        }}
        onLoadedData={() => {
          reportFirstFrameReady();
          ensurePlaying();
        }}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
    </div>
  );
}

export const LevelShareComboVideo = memo(LevelShareComboVideoInner);
