import { useEffect, useState, type ReactNode } from "react";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useAppSettings } from "@/components/layout/appSettingsContext";
import { districtRouteId } from "@/features/map/berlinMapLayout";
import { mapDistrictDetailLocation } from "@/features/map/mapDistrictDetailUrl";
import { levelProgressKey } from "@/features/level/levelProgress";
import { usePrimeShareFiles } from "@/features/level/hooks/usePrimeShareFiles";
import { shareLevelNative } from "@/features/level/services/shareLevelVideo";
import { ShareNodesIcon } from "@/internal_assets/icons/ShareNodesIcon";
import { BeforeAfterSlider } from "@/components/features/gallery/BeforeAfterSlider";
import { GalleryDetailAfterLayer } from "@/components/features/gallery/GalleryDetailAfterLayer";
import { GalleryHeroFallback } from "@/components/features/gallery/GalleryHeroFallback";
import { getGalleryComboUrlsForEntry } from "@/features/gallery/getGalleryComboUrlsForEntry";
import type { GalleryEntry } from "@/features/gallery/collectGalleryEntries";
import { BEFORE_AFTER_INTRO_HOLD_MS_DEFAULT } from "@/components/features/level/play/preQuizBeforeAfterIntroTiming";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ROUTES } from "@/routes/paths";

type Props = {
  entry: GalleryEntry;
  open: boolean;
  onClose: () => void;
};

export function GalleryEntrySheet({ entry, open, onClose }: Props) {
  const { settings } = useAppSettings();
  const reducedMotion = usePrefersReducedMotion();
  const complete = entry.isComplete;
  const levelShareable = entry.level.shareable !== false;
  const combo = getGalleryComboUrlsForEntry(entry);
  const missingSnapshot =
    complete && !combo.finishedImageUrl && !combo.videoUrl;
  const [sheetPlaybackReady, setSheetPlaybackReady] = useState(false);

  usePrimeShareFiles(
    open && complete && levelShareable,
    combo.shareFileVideoUrl,
    combo.finishedImageUrl,
    settings.shareFallbackImageUrl,
  );

  useEffect(() => {
    if (!open) {
      setSheetPlaybackReady(false);
    }
  }, [open]);

  const mapDetailLink = mapDistrictDetailLocation(
    districtRouteId(entry.district),
    { detail: true, levelKey: entry.levelKey },
  );

  const imageAlt = entry.districtName;

  let media: ReactNode = null;
  if (complete) {
    if (missingSnapshot) {
      media = (
        <GalleryHeroFallback src={entry.backgroundImageUrl} alt={imageAlt} />
      );
    } else {
      media = (
        <BeforeAfterSlider
          className="min-h-0 h-full w-full flex-1 rounded-none"
          introAnimation
          compareLabels
          reducedMotion={reducedMotion}
          introHoldMs={BEFORE_AFTER_INTRO_HOLD_MS_DEFAULT}
          introPlaybackReady={sheetPlaybackReady}
          beforeSrc={entry.backgroundImageUrl}
          beforeAlt={imageAlt}
          afterContent={
            <GalleryDetailAfterLayer
              finishedImageUrl={combo.finishedImageUrl}
              videoUrl={combo.videoUrl}
              alt={imageAlt}
              playbackActive={sheetPlaybackReady}
            />
          }
        />
      );
    }
  } else if (entry.backgroundImageUrl) {
    media = (
      <GalleryHeroFallback
        src={entry.backgroundImageUrl}
        alt={imageAlt}
        muted
      />
    );
  }

  const footer = complete ? (
    levelShareable ? (
      <div className="flex items-center gap-3 px-4 py-[0.85rem]">
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
              levelName: entry.level.name,
              videoUrl: combo.shareFileVideoUrl,
              imageUrl: combo.finishedImageUrl,
              fallbackImageUrl: settings.shareFallbackImageUrl,
            });
          }}
        >
          <ShareNodesIcon />
        </Button>
        <Button grow onClick={onClose}>
          Schließen
        </Button>
      </div>
    ) : (
      <div className="flex flex-col gap-[0.65rem] px-4 py-[0.85rem]">
        <ButtonLink
          block
          to={mapDetailLink}
          state={{
            levelStartKey: levelProgressKey(entry.level),
            levelDetailReturnTo: ROUTES.gallerieLevel(entry.levelKey),
          }}
          viewTransition
        >
          Nochmal spielen
        </ButtonLink>
        <Button block onClick={onClose}>
          Schließen
        </Button>
      </div>
    )
  ) : (
    <div className="px-4 py-[0.85rem]">
      <div className="flex flex-col gap-[0.65rem]">
        <ButtonLink
          grow
          to={mapDetailLink}
          state={{
            levelStartKey: levelProgressKey(entry.level),
            levelDetailReturnTo: ROUTES.gallerieLevel(entry.levelKey),
          }}
          viewTransition
        >
          Bezirk freispielen
        </ButtonLink>
        <Button grow onClick={onClose}>
          Schließen
        </Button>
      </div>
    </div>
  );

  return (
    <OverlayPortal>
      <div
        className="pointer-events-none absolute inset-0 z-[59] bg-swg-bg"
        aria-hidden
      />
      <BottomSheet
        open={open}
        reducedMotion={reducedMotion}
        size="full"
        sheetMaxHeight="100%"
        rootClassName="top-[calc(100px+env(safe-area-inset-top,0px))] z-[60]"
        labelledBy="gallery-entry-sheet-title"
        onBackdropClick={onClose}
        onEntered={() => setSheetPlaybackReady(true)}
        footer={footer}
        footerClassName="box-content flex h-[170px] min-h-[170px] flex-col justify-center landscape:pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
        footerBodyScroll="hidden"
        bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {media ? (
          <div className="relative flex min-h-0 flex-1 flex-col">{media}</div>
        ) : null}

        {!complete ? (
          // Die Überschrift verwendet dieselbe Typografie wie GalleryCard.
          <p
            id="gallery-entry-sheet-title"
            role="heading"
            aria-level={2}
            className="mb-[0.65rem] shrink-0 px-4 pt-2 text-center font-display text-[1.15rem] font-normal uppercase leading-[1.15] hyphens-auto"
          >
            {entry.levelLabel}
          </p>
        ) : (
          <h2 id="gallery-entry-sheet-title" className="sr-only">
            {entry.levelLabel}
          </h2>
        )}
      </BottomSheet>
    </OverlayPortal>
  );
}
