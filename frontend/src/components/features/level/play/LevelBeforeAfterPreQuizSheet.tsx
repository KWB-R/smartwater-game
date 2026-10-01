import { BeforeAfterSlider } from "@/components/features/gallery/BeforeAfterSlider";
import { GalleryDetailAfterLayer } from "@/components/features/gallery/GalleryDetailAfterLayer";
import { BEFORE_AFTER_INTRO_HOLD_MS_DEFAULT } from "@/components/features/level/play/preQuizBeforeAfterIntroTiming";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import { useAppSettings } from "@/components/layout/appSettingsContext";
import { usePrimeShareFiles } from "@/features/level/hooks/usePrimeShareFiles";
import { shareLevelNative } from "@/features/level/services/shareLevelVideo";
import { Button } from "@/components/ui/Button";
import { ShareNodesIcon } from "@/internal_assets/icons/ShareNodesIcon";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useModalAssistiveHide } from "@/hooks/useModalAssistiveHide";

const PRE_QUIZ_OVERLAY_ENTER_MS = 480;
/** Auch bei langsamen Medien den Weg zur Quiz-Runde freigeben. */
const PRE_QUIZ_MEDIA_READY_FALLBACK_MS = 1_600;

type LevelBeforeAfterPreQuizSheetProps = {
  open: boolean;
  reducedMotion?: boolean;
  backgroundImageUrl: string | null;
  finishedImageUrl: string | null;
  videoUrl: string | null;
  /** Kombivideo für die native Teilen-Funktion. */
  shareFileVideoUrl?: string | null;
  levelName?: string | null;
  /** Bei shareable: false die Teilen-Schaltfläche ausblenden. */
  shareable?: boolean;
  onContinueToQuiz: () => void;
};

/**
 * Pre-Quiz als volle Overlay-Schicht: Level darunter bleibt unverändert.
 * Der Slider vergleicht das Vorher-Bild sofort mit dem fertigen Puzzle darunter.
 * WebP oder Video ersetzen die transparente Nachher-Seite, sobald sie bereit sind.
 */
export function LevelBeforeAfterPreQuizSheet({
  open,
  reducedMotion = false,
  backgroundImageUrl,
  finishedImageUrl,
  videoUrl,
  shareFileVideoUrl = null,
  levelName,
  shareable = true,
  onContinueToQuiz,
}: LevelBeforeAfterPreQuizSheetProps) {
  const { settings } = useAppSettings();
  usePrimeShareFiles(
    open && shareable,
    shareFileVideoUrl,
    finishedImageUrl,
    settings.shareFallbackImageUrl,
  );
  const [beforeImageReady, setBeforeImageReady] = useState(
    () => !backgroundImageUrl,
  );
  const [mediaReadyTimedOut, setMediaReadyTimedOut] = useState(false);

  useEffect(() => {
    setBeforeImageReady(!backgroundImageUrl);
    setMediaReadyTimedOut(false);
  }, [backgroundImageUrl]);

  useEffect(() => {
    if (!open) {
      setMediaReadyTimedOut(false);
      return;
    }

    let cancelled = false;
    let beforeWarmupCleanup: (() => void) | undefined;

    if (!backgroundImageUrl) {
      setBeforeImageReady(true);
    } else {
      const img = new Image();
      const markReady = () => {
        if (!cancelled) {
          setBeforeImageReady(true);
        }
      };
      img.onload = markReady;
      img.onerror = markReady;
      img.src = backgroundImageUrl;
      if (img.complete && img.naturalWidth > 0) {
        markReady();
      }
      beforeWarmupCleanup = () => {
        cancelled = true;
      };
    }

    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setMediaReadyTimedOut(true);
      }
    }, PRE_QUIZ_MEDIA_READY_FALLBACK_MS);

    return () => {
      cancelled = true;
      beforeWarmupCleanup?.();
      window.clearTimeout(timer);
    };
  }, [open, backgroundImageUrl]);

  const handleBeforeImageLoaded = useCallback(() => {
    setBeforeImageReady(true);
  }, []);

  const {
    sheetOpen,
    sheetPlaybackReady,
    sheetMotionClass,
    sheetTransitionClass,
    sheetWillChangeClass,
    enterTransitionMs,
    enterEaseClass,
    handleSheetTransitionEnd,
  } = useBottomSheet({
    open: open && beforeImageReady,
    reducedMotion,
    enterMotion: "fade",
    enterDurationMs: PRE_QUIZ_OVERLAY_ENTER_MS,
  });

  const dialogRef = useRef<HTMLDivElement>(null);
  useModalAssistiveHide(open, dialogRef);

  if (!open) {
    return null;
  }

  // Der Timeout zeigt nur den Footer, niemals einen noch leeren Vergleich.
  const footerVisible = sheetOpen || mediaReadyTimedOut;

  return (
    <div
      ref={dialogRef}
      className="level-before-after-gate pointer-events-none absolute inset-0 flex h-full min-h-0 w-full flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-before-after-gate-title"
      aria-hidden={!footerVisible}
    >
      <div
        className={cn(
          "level-before-after-gate__scene motion-reduce:transition-none",
          sheetWillChangeClass,
          sheetTransitionClass,
          enterEaseClass,
          beforeImageReady ? sheetMotionClass : "opacity-0",
        )}
        style={{ transitionDuration: `${enterTransitionMs}ms` }}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget) {
            handleSheetTransitionEnd(event);
          }
        }}
        inert={!sheetPlaybackReady}
      >
        <div className="level-before-after-gate__board-frame">
          <div className="level-before-after-gate__compare-layer level-before-after-gate__compare-layer--visible">
            <BeforeAfterSlider
              className="level-before-after-gate__slider"
              introAnimation
              compareLabels
              transparentBackground
              reducedMotion={reducedMotion}
              introHoldMs={BEFORE_AFTER_INTRO_HOLD_MS_DEFAULT}
              introPlaybackReady={sheetPlaybackReady}
              beforeSrc={backgroundImageUrl}
              onBeforeImageLoaded={handleBeforeImageLoaded}
              afterContent={
                <GalleryDetailAfterLayer
                  finishedImageUrl={finishedImageUrl}
                  videoUrl={videoUrl}
                  transparentWhileLoading
                  playbackActive={sheetPlaybackReady}
                />
              }
            />
          </div>
        </div>
      </div>

      <footer
        className={cn(
          "level-before-after-gate__footer shrink-0 border-t border-swg-black/10 bg-swg-bg transition-opacity motion-reduce:transition-none",
          enterEaseClass,
          footerVisible ? "pointer-events-auto opacity-100" : "opacity-0",
        )}
        style={{ transitionDuration: `${enterTransitionMs}ms` }}
        inert={!footerVisible}
      >
        {shareable ? (
          <div
            id="level-before-after-gate-title"
            className="mb-3 px-4 text-swg-blue-dark [&_.strapi-blocks-view__heading]:uppercase"
          >
            <StrapiBlocksView
              blocks={settings.shareCta}
              className="strapi-blocks-view--align-center font-text"
              emptyLabel="Teile Deine Vision der Schwammstadt!"
            />
          </div>
        ) : (
          <h2 id="level-before-after-gate-title" className="sr-only">
            Weiter zur Quiz-Runde
          </h2>
        )}
        <div className="flex items-center justify-center gap-3 px-4">
          {shareable ? (
            <Button
              shape="roundIcon"
              className="[&_svg]:size-6"
              aria-label="Teilen"
              onClick={() => {
                void shareLevelNative({
                  pageUrl:
                    typeof window !== "undefined"
                      ? window.location.href
                      : undefined,
                  title: settings.siteTitle,
                  text: settings.shareContent,
                  levelName,
                  videoUrl: shareFileVideoUrl,
                  imageUrl: finishedImageUrl,
                  fallbackImageUrl: settings.shareFallbackImageUrl,
                });
              }}
            >
              <ShareNodesIcon />
            </Button>
          ) : null}
          <Button
            grow
            className="flex max-w-md gap-2"
            onClick={onContinueToQuiz}
          >
            Weiter zur Quiz-Runde
          </Button>
        </div>
      </footer>
    </div>
  );
}
