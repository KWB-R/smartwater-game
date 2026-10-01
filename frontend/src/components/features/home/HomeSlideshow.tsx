import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { useLatestRef } from "@/hooks/useLatestRef";
import { strapiImgCrossOrigin } from "@/api/strapiMediaImg";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import {
  attachHomeSlideshowVideo,
  warmHomepageSlideshowSlides,
} from "@/features/home/homeSlideshowWarmup";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { HomepageSlide } from "@/types/content";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import "./HomeSlideshow.scss";

const IMAGE_SLIDE_DURATION_MS = 3_000;
const FALLBACK_VIDEO_SLIDE_DURATION_MS = 6_000;
const SWIPE_THRESHOLD_PX = 44;
const SWIPE_VERTICAL_TOLERANCE_PX = 80;
const TAP_MOVE_TOLERANCE_PX = 12;
const MOUSE_TAP_MOVE_TOLERANCE_PX = 32;
const TAP_ZONE_FRACTION = 0.28;
const LAST_SLIDE_CTA_LABEL = "Verwandle Grau in Blau-Grün!";

type SlideMediaPhase = "active" | "hidden";

function tapMoveTolerancePx(pointerType: string): number {
  return pointerType === "mouse"
    ? MOUSE_TAP_MOVE_TOLERANCE_PX
    : TAP_MOVE_TOLERANCE_PX;
}

type Props = {
  slides: HomepageSlide[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onComplete: () => void;
  fallbackVideoSlideDurationMs?: number;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("button, a, input, textarea, select") != null
  );
}

function HomeSlideMedia({
  slide,
  phase,
  paused,
  onVideoDurationMsChange,
  onVideoEnded,
}: {
  slide: HomepageSlide;
  phase: SlideMediaPhase;
  paused: boolean;
  onVideoDurationMsChange: (slideId: string, durationMs: number) => void;
  onVideoEnded: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const active = phase === "active";
  const wasActiveRef = useRef(active);
  const activeRef = useLatestRef(active);

  const mediaClassName = cn(
    "home-slideshow__media",
    phase === "active" && "home-slideshow__media--active",
    phase === "hidden" && "home-slideshow__media--hidden",
  );

  useEffect(() => {
    if (slide.mediaKind !== "video") {
      videoRef.current = null;
      return;
    }

    const host = hostRef.current;
    if (!host) {
      return;
    }

    const video = attachHomeSlideshowVideo(
      slide.mediaUrl,
      host,
      slide.posterUrl,
    );
    if (!video) {
      return;
    }
    videoRef.current = video;

    const reportDuration = () => {
      const durationMs = video.duration * 1000;
      if (Number.isFinite(durationMs) && durationMs > 0) {
        onVideoDurationMsChange(slide.id, durationMs);
      }
    };

    const onEnded = () => {
      if (activeRef.current) {
        onVideoEnded();
      }
    };

    video.addEventListener("loadedmetadata", reportDuration);
    video.addEventListener("ended", onEnded);
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      reportDuration();
    }

    return () => {
      video.removeEventListener("loadedmetadata", reportDuration);
      video.removeEventListener("ended", onEnded);
    };
  }, [
    slide.id,
    slide.mediaKind,
    slide.mediaUrl,
    slide.posterUrl,
    onVideoDurationMsChange,
    onVideoEnded,
    activeRef,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || slide.mediaKind !== "video") {
      return;
    }

    video.className = mediaClassName;
    video.setAttribute("aria-hidden", active ? "false" : "true");
    video.oncontextmenu = (event) => event.preventDefault();

    if (phase === "hidden") {
      video.pause();
      if (video.currentTime !== 0) {
        try {
          video.currentTime = 0;
        } catch {
          // Vor dem Laden der Metadaten lässt sich die Abspielposition unter Umständen noch nicht setzen.
        }
      }
      wasActiveRef.current = false;
      return;
    }

    if (!wasActiveRef.current) {
      wasActiveRef.current = true;
    }

    if (paused) {
      video.pause();
      return;
    }

    void video.play().catch(() => {
      // Bei blockierter automatischer Wiedergabe läuft der Folienwechsel weiter.
    });
  }, [active, paused, phase, slide.mediaKind, mediaClassName]);

  if (slide.mediaKind === "video") {
    return (
      <div
        ref={hostRef}
        className={cn(
          "home-slideshow__media-host",
          phase === "active" && "home-slideshow__media-host--active",
          phase === "hidden" && "home-slideshow__media-host--hidden",
        )}
        aria-hidden={!active}
      />
    );
  }

  return (
    <img
      className={mediaClassName}
      src={slide.mediaUrl}
      alt={slide.alt}
      draggable={false}
      crossOrigin={strapiImgCrossOrigin(slide.mediaUrl)}
      aria-hidden={!active}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}

export function HomeSlideshow({
  slides,
  activeIndex,
  onActiveIndexChange,
  onComplete,
  fallbackVideoSlideDurationMs = FALLBACK_VIDEO_SLIDE_DURATION_MS,
}: Props) {
  const [videoDurationsMs, setVideoDurationsMs] = useState<
    Record<string, number>
  >({});
  const [videoInteractionPaused, setVideoInteractionPaused] = useState(false);
  const [lastSlideFinished, setLastSlideFinished] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const activeSlide = slides[activeIndex];
  const isLastSlide = activeIndex === slides.length - 1;
  const isVideoSlide = activeSlide?.mediaKind === "video";
  const activeSlideDurationMs =
    activeSlide?.mediaKind === "image"
      ? IMAGE_SLIDE_DURATION_MS
      : activeSlide
        ? (videoDurationsMs[activeSlide.id] ?? fallbackVideoSlideDurationMs)
        : fallbackVideoSlideDurationMs;
  const timerRef = useRef<number | null>(null);
  const timerStartedAtRef = useRef(0);
  const remainingMsRef = useRef(activeSlideDurationMs);
  const pointerRef = useRef<{
    id: number;
    startX: number;
    startY: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    warmHomepageSlideshowSlides(slides);
  }, [slides]);

  const complete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      if (
        nextIndex === activeIndex ||
        nextIndex < 0 ||
        nextIndex >= slides.length
      ) {
        return;
      }
      setVideoInteractionPaused(false);
      onActiveIndexChange(nextIndex);
    },
    [activeIndex, onActiveIndexChange, slides.length],
  );

  const goNext = useCallback(() => {
    goToIndex(activeIndex + 1);
  }, [activeIndex, goToIndex]);

  const advanceSlide = useCallback(() => {
    if (activeIndex >= slides.length - 1) {
      setVideoInteractionPaused(false);
      setLastSlideFinished(true);
      return;
    }
    goToIndex(activeIndex + 1);
  }, [activeIndex, goToIndex, slides.length]);

  const goPrevious = useCallback(() => {
    goToIndex(activeIndex - 1);
  }, [activeIndex, goToIndex]);

  const onVideoDurationMsChange = useCallback(
    (slideId: string, durationMs: number) => {
      setVideoDurationsMs((durations) => {
        if (durations[slideId] === durationMs) {
          return durations;
        }
        return { ...durations, [slideId]: durationMs };
      });
    },
    [],
  );

  const pauseVideoInteraction = useCallback(() => {
    if (!isVideoSlide) {
      return;
    }
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsedMs = Math.max(0, Date.now() - timerStartedAtRef.current);
    remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsedMs);
    setVideoInteractionPaused(true);
  }, [isVideoSlide]);

  const resumeVideoInteraction = useCallback(() => {
    if (!isVideoSlide) {
      return;
    }
    setVideoInteractionPaused(false);
  }, [isVideoSlide]);

  useEffect(() => {
    setVideoInteractionPaused(false);
    setLastSlideFinished(false);
    remainingMsRef.current = activeSlideDurationMs;
  }, [activeSlide?.id, activeSlideDurationMs]);

  useEffect(() => {
    if (!activeSlide) {
      complete();
      return;
    }
    if (videoInteractionPaused) {
      return;
    }
    if (isLastSlide && lastSlideFinished) {
      return;
    }

    timerStartedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(advanceSlide, remainingMsRef.current);
    return () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    activeSlide,
    activeSlideDurationMs,
    videoInteractionPaused,
    advanceSlide,
    complete,
    isLastSlide,
    lastSlideFinished,
  ]);

  const navigateFromTapZone = useCallback(
    (clientX: number) => {
      const zoneWidth = window.innerWidth * TAP_ZONE_FRACTION;
      if (clientX < zoneWidth) {
        resumeVideoInteraction();
        goPrevious();
        return true;
      }
      if (clientX > window.innerWidth - zoneWidth) {
        resumeVideoInteraction();
        goNext();
        return true;
      }
      resumeVideoInteraction();
      return false;
    },
    [goNext, goPrevious, resumeVideoInteraction],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }
      if (isInteractiveTarget(event.target)) {
        return;
      }
      pointerRef.current = {
        id: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      pauseVideoInteraction();
    },
    [pauseVideoInteraction],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const pointer = pointerRef.current;
      if (!pointer || pointer.id !== event.pointerId) {
        return;
      }

      pointerRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const dx = event.clientX - pointer.startX;
      const dy = event.clientY - pointer.startY;
      const moveTolerance = tapMoveTolerancePx(event.pointerType);
      const isHorizontalSwipe =
        Math.abs(dx) >= SWIPE_THRESHOLD_PX &&
        Math.abs(dy) <= SWIPE_VERTICAL_TOLERANCE_PX;

      if (isHorizontalSwipe) {
        suppressClickRef.current = true;
        resumeVideoInteraction();
        if (dx < 0) {
          goNext();
        } else {
          goPrevious();
        }
        return;
      }

      const isTap =
        Math.abs(dx) <= moveTolerance && Math.abs(dy) <= moveTolerance;
      if (!isTap || isInteractiveTarget(event.target)) {
        resumeVideoInteraction();
        return;
      }

      if (navigateFromTapZone(event.clientX)) {
        suppressClickRef.current = true;
      }
    },
    [goNext, goPrevious, navigateFromTapZone, resumeVideoInteraction],
  );

  const onPointerCancel = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const pointer = pointerRef.current;
      if (!pointer || pointer.id !== event.pointerId) {
        return;
      }
      pointerRef.current = null;
      resumeVideoInteraction();
    },
    [resumeVideoInteraction],
  );

  const onClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      if (event.button !== 0 || isInteractiveTarget(event.target)) {
        return;
      }
      navigateFromTapZone(event.clientX);
    },
    [navigateFromTapZone],
  );

  const onContextMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
  }, []);

  if (!activeSlide) {
    return null;
  }

  return (
    <section
      className="home-slideshow"
      aria-label="Homepage Slideshow"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <div className="home-slideshow__media-layer" aria-hidden="true">
        {slides.map((slide, index) => {
          const phase: SlideMediaPhase =
            index === activeIndex ? "active" : "hidden";
          return (
            <HomeSlideMedia
              key={slide.id}
              slide={slide}
              phase={phase}
              paused={
                index === activeIndex &&
                slide.mediaKind === "video" &&
                videoInteractionPaused
              }
              onVideoDurationMsChange={onVideoDurationMsChange}
              onVideoEnded={advanceSlide}
            />
          );
        })}
      </div>

      <div className="home-slideshow__chrome">
        <div
          className="home-slideshow__progress"
          aria-label="Slideshow Fortschritt"
        >
          {slides.map((slide, index) => {
            const isActive = index === activeIndex;
            const isComplete =
              index < activeIndex ||
              (isLastSlide && isActive && lastSlideFinished);
            return (
              <button
                key={slide.id}
                type="button"
                className="home-slideshow__progress-item"
                aria-label={`Slide ${index + 1} anzeigen`}
                aria-current={isActive ? "step" : undefined}
                onClick={() => {
                  goToIndex(index);
                }}
              >
                <span className="home-slideshow__progress-track">
                  <span
                    key={
                      isActive
                        ? `${slide.id}-active-${activeSlideDurationMs}`
                        : slide.id
                    }
                    className={cn(
                      "home-slideshow__progress-fill",
                      isActive &&
                        !(isLastSlide && lastSlideFinished) &&
                        "home-slideshow__progress-fill--active",
                      isActive &&
                        videoInteractionPaused &&
                        "home-slideshow__progress-fill--paused",
                      isComplete && "home-slideshow__progress-fill--complete",
                      reducedMotion && "home-slideshow__progress-fill--reduced",
                    )}
                    style={
                      isActive
                        ? {
                            animationDuration: `${activeSlideDurationMs}ms`,
                          }
                        : undefined
                    }
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {slides.map((slide, index) => {
        if (!slide.content) {
          return null;
        }
        const phase: SlideMediaPhase =
          index === activeIndex ? "active" : "hidden";
        return (
          <div
            key={slide.id}
            className={cn(
              "home-slideshow__content",
              phase === "active" && "home-slideshow__content--active",
              phase === "hidden" && "home-slideshow__content--hidden",
            )}
            aria-hidden={phase !== "active"}
          >
            <StrapiBlocksView blocks={slide.content} emptyLabel="" />
          </div>
        );
      })}

      {isLastSlide ? (
        <footer className="home-slideshow__footer">
          <Button grow className="home-slideshow__cta" onClick={complete}>
            {LAST_SLIDE_CTA_LABEL}
          </Button>
        </footer>
      ) : null}
    </section>
  );
}
