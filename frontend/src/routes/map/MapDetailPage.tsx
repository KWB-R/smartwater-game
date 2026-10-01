import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useLocation } from "react-router-dom";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { cn } from "@/lib/cn";
import { ContentStatus } from "@/components/ui/ContentStatus";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useMapSession } from "@/components/features/map/mapSession";
import { useLevelProgress } from "@/features/level/hooks/useLevelProgress";
import {
  getSelectedLevelMascotUrl,
  getSelectedLevelMascotAlt,
} from "@/features/level/logic/levelMascotDisplay";
import {
  isPuzzleMaxBarScoreProgress,
  isQuizPassedProgress,
  levelProgressKey,
  levelRouteSlug,
} from "@/features/level/levelProgress";
import type { DistrictLevelSummary } from "@/types/content";
import { ROUTES } from "@/routes/paths";
import type { LevelIntroLocationState } from "@/routes/level/navigation/levelIntroTypes";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import { CmsSvgImage } from "@/components/features/strapi/CmsSvgImage";
import { BonuslevelIcon } from "@/internal_assets/map/Bonuslevel";
import { ArrowIcon } from "@/internal_assets/icons/ArrowIcon";
import { RewindIcon } from "@/internal_assets/icons/RewindIcon";
import { StarIcon } from "@/internal_assets/icons/StarIcon";
import { KronenIcon } from "@/internal_assets/icons/KronenIcon";
import { PlacementParticleBurst } from "@/components/features/level/PlacementParticleBurst";
import { getLevelDetailReturnTo } from "@/features/map/mapDistrictDetailUrl";
import {
  isMapPostLevelDetailPending,
  readMapPostLevelCelebration,
} from "@/features/map/mapPostLevelCelebration";
import { useMapDetailStarReveal } from "@/features/map/useMapDetailStarReveal";
import {
  MAP_DETAIL_SHEET_ENTER_DURATION_MS,
  MAP_DETAIL_SHEET_OPEN_DELAY_MS,
} from "@/features/map/mapDetailTiming";
import { MAP_POST_LEVEL_DETAIL_CROWN_REVEAL_DELAY_MS } from "@/features/map/mapPostLevelMapIntroTiming";
import { LevelMaxScoreBadge } from "@/components/features/level/play/LevelMaxScoreBadge";
import { playSound } from "@/lib/sound/globalSound";

const MAP_DETAIL_PEEK_FOCUS_BUCKET_PX = 28;
const MAP_DETAIL_STAR_SIZE_CLASS = "h-[1.75rem]";
const MAP_DETAIL_STAR_SLOTS = [1, 2, 3] as const;

/** Route-/Play-Slug; Persistenz bleibt bei `levelProgressKey`. */
function levelPlayRouteKey(level: DistrictLevelSummary): string {
  return levelRouteSlug(level);
}

function completedStarCount(
  progress: ReturnType<typeof useLevelProgress>,
): 0 | 1 | 2 | 3 {
  if (progress?.completed !== true) {
    return 0;
  }
  return progress.stars === 0 ? 1 : progress.stars;
}

function MapDetailStars({
  displayedStars,
  burstSlot,
  reducedMotion,
  onBurstComplete,
}: {
  displayedStars: number;
  burstSlot: 1 | 2 | 3 | null;
  reducedMotion: boolean;
  onBurstComplete: () => void;
}) {
  return (
    <div
      className="map-detail-sheet__stars-row"
      role="img"
      aria-label={`${displayedStars} von 3 Sternen erreicht`}
    >
      {MAP_DETAIL_STAR_SLOTS.map((slot) => (
        <span
          key={slot}
          className="relative inline-block leading-none "
          aria-hidden
        >
          <StarIcon
            fill={
              slot <= displayedStars ? "var(--color-swg-yellow)" : "#eeeeee"
            }
            className={cn("block w-auto", MAP_DETAIL_STAR_SIZE_CLASS)}
          />
          {burstSlot === slot && !reducedMotion ? (
            <PlacementParticleBurst
              key={`star-burst-${slot}`}
              embedded
              celebration
              mode="explosion"
              from={{ x: 0, y: 0 }}
              to={{ x: 0, y: 0 }}
              intensity={14}
              onComplete={onBurstComplete}
            />
          ) : null}
        </span>
      ))}
    </div>
  );
}

export function MapDetailPage() {
  const reducedMotion = usePrefersReducedMotion();
  const location = useLocation();
  const {
    districtId,
    district,
    detailStatus,
    detailError,
    selectedLevel,
    levelStartOpen,
    closeLevelStart,
    closeLevelStartAfterPostLevelCelebration,
    setMapDetailPeekTopPx,
  } = useMapSession();
  const postLevelCelebration = readMapPostLevelCelebration(location.state, {
    districtRouteId: districtId,
  });
  /** Nur beim ersten Abschlussdetail aktivieren; nach dem Kartenintro nicht erneut starten. */
  const celebrationDetailActive =
    postLevelCelebration != null && isMapPostLevelDetailPending(location.state);
  const levelDetailReturnTo = getLevelDetailReturnTo(location.state);

  const sheetPanelRef = useRef<HTMLDivElement>(null);
  const sheetPrimaryActionRef = useRef<HTMLAnchorElement>(null);
  const sheetCelebrationContinueRef = useRef<HTMLButtonElement>(null);
  const mapMarkerFocusReturnRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!levelStartOpen) {
      const returnTarget = mapMarkerFocusReturnRef.current;
      mapMarkerFocusReturnRef.current = null;
      if (returnTarget?.isConnected) {
        queueMicrotask(() => returnTarget.focus());
      }
      return;
    }
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active.closest("[data-berlin-map-marker]")
    ) {
      mapMarkerFocusReturnRef.current = active;
    }
  }, [levelStartOpen]);

  const focusMapDetailSheet = useCallback(() => {
    if (celebrationDetailActive) {
      sheetCelebrationContinueRef.current?.focus();
      return;
    }
    sheetPrimaryActionRef.current?.focus();
  }, [celebrationDetailActive]);

  const reportMapPeekTop = useCallback(() => {
    const panel = sheetPanelRef.current;
    if (!panel) {
      return;
    }
    const top = panel.getBoundingClientRect().top;
    const rounded = Math.round(top);
    if (rounded >= 0) {
      setMapDetailPeekTopPx((prev) => {
        if (
          prev != null &&
          Math.abs(prev - rounded) < MAP_DETAIL_PEEK_FOCUS_BUCKET_PX
        ) {
          return prev;
        }
        return rounded;
      });
    }
  }, [setMapDetailPeekTopPx]);

  useLayoutEffect(() => {
    if (!levelStartOpen) {
      return;
    }
    reportMapPeekTop();
    const panel = sheetPanelRef.current;
    if (!panel) {
      return;
    }
    const observer = new ResizeObserver(reportMapPeekTop);
    observer.observe(panel);
    panel.addEventListener("transitionend", reportMapPeekTop);
    window.addEventListener("resize", reportMapPeekTop);
    return () => {
      observer.disconnect();
      panel.removeEventListener("transitionend", reportMapPeekTop);
      window.removeEventListener("resize", reportMapPeekTop);
    };
  }, [levelStartOpen, reportMapPeekTop]);

  const levelProgress = useLevelProgress(
    selectedLevel ? levelProgressKey(selectedLevel) : null,
  );
  const levelMascotUrl =
    selectedLevel != null
      ? getSelectedLevelMascotUrl(selectedLevel, levelProgress)
      : null;
  const levelMascotAlt =
    selectedLevel != null
      ? getSelectedLevelMascotAlt(selectedLevel, levelProgress)
      : "";
  const levelCompleted = levelProgress?.completed === true;
  const detailMascotUrl =
    selectedLevel != null
      ? levelCompleted
        ? levelMascotUrl
        : (selectedLevel.unhappyMascotUrl ?? levelMascotUrl)
      : null;
  const detailMascotAlt =
    selectedLevel != null
      ? levelCompleted
        ? levelMascotAlt
        : selectedLevel.unhappyMascotUrl
          ? selectedLevel.unhappyMascotAlt
          : levelMascotAlt
      : "";
  const detailBlocks = levelCompleted
    ? (selectedLevel?.winContent ?? null)
    : (selectedLevel?.problemContent ?? null);
  const showMaxScoreBadge =
    levelCompleted && isPuzzleMaxBarScoreProgress(levelProgress);
  const completedStars = completedStarCount(levelProgress);
  const hasPlayedLevel = levelProgress != null;
  const showQuizCrown = levelCompleted && isQuizPassedProgress(levelProgress);

  const celebrationTargetStars =
    postLevelCelebration?.starCount ?? completedStars;
  const starReveal = useMapDetailStarReveal({
    active: celebrationDetailActive && levelStartOpen,
    // Nach jedem Levelabschluss die Sterne nacheinander ab null anzeigen.
    fromStars: 0,
    targetStars:
      celebrationTargetStars >= 1 && celebrationTargetStars <= 3
        ? (celebrationTargetStars as 1 | 2 | 3)
        : 1,
    reducedMotion,
  });

  const arcDisplayedStars = celebrationDetailActive
    ? starReveal.displayedStars
    : completedStars;

  const finishPostLevelCelebration = useCallback(() => {
    closeLevelStartAfterPostLevelCelebration();
  }, [closeLevelStartAfterPostLevelCelebration]);

  const [crownRevealed, setCrownRevealed] = useState(
    () => !celebrationDetailActive,
  );
  const [crownBurstKey, setCrownBurstKey] = useState<number | null>(null);
  const crownBurstDoneRef = useRef(false);
  const postLevelCelebrationActive = celebrationDetailActive;

  useEffect(() => {
    if (!postLevelCelebrationActive || !showQuizCrown) {
      crownBurstDoneRef.current = false;
      setCrownRevealed(showQuizCrown);
      setCrownBurstKey(null);
      return;
    }
    if (reducedMotion) {
      if (!crownBurstDoneRef.current) {
        crownBurstDoneRef.current = true;
        // Bei reduzierten Animationen die Quizkrone sofort zeigen.
        playSound("points.collect");
      }
      setCrownRevealed(true);
      setCrownBurstKey(null);
      return;
    }
    if (starReveal.phase !== "ready") {
      setCrownRevealed(false);
      setCrownBurstKey(null);
      return;
    }
    if (crownBurstDoneRef.current) {
      setCrownRevealed(true);
      return;
    }
    crownBurstDoneRef.current = true;
    const timer = window.setTimeout(() => {
      setCrownRevealed(true);
      setCrownBurstKey(Date.now());
      // Die Quizkrone nach der Sternfolge anzeigen.
      playSound("points.collect");
    }, MAP_POST_LEVEL_DETAIL_CROWN_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [
    postLevelCelebrationActive,
    showQuizCrown,
    starReveal.phase,
    reducedMotion,
  ]);

  const showCrownInDetail = showQuizCrown && crownRevealed;

  if (!levelStartOpen || !district || !selectedLevel) {
    const showFailure =
      Boolean(districtId) &&
      (detailStatus === "error" ||
        (detailStatus === "success" && (!district || !selectedLevel)));

    if (!showFailure) {
      return null;
    }

    return (
      <ContentStatus
        status={detailStatus === "error" ? "error" : "success"}
        error={detailError}
        empty={detailStatus === "success" && (!district || !selectedLevel)}
        emptyMessage="Es konnte kein Level im Bezirk geladen werden."
      >
        {null}
      </ContentStatus>
    );
  }

  const introState: LevelIntroLocationState = {
    district,
    level: selectedLevel,
  };

  const missionTitle =
    selectedLevel.mission?.title?.trim() || selectedLevel.name.trim();
  const missionBlocks = selectedLevel.mission?.content ?? null;

  const sheetFooter = celebrationDetailActive ? (
    <div className="flex items-center gap-3 px-4 py-[0.85rem]">
      <ButtonLink
        shape="roundIcon"
        aria-label="Nochmal spielen"
        to={ROUTES.levelPlay(levelPlayRouteKey(selectedLevel))}
        state={introState}
        viewTransition
      >
        <RewindIcon />
      </ButtonLink>
      <Button grow onClick={finishPostLevelCelebration} ref={sheetCelebrationContinueRef}>
        weiter
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-3 px-4 py-[0.85rem]">
      <ButtonLink
        ref={sheetPrimaryActionRef}
        grow
        className="order-2"
        to={ROUTES.levelPlay(levelPlayRouteKey(selectedLevel))}
        state={introState}
        viewTransition
      >
        {levelDetailReturnTo || !hasPlayedLevel
          ? "Puzzle starten!"
          : "Nochmal spielen"}
      </ButtonLink>
      <Button
        shape="roundIcon"
        className="order-1 shrink-0"
        aria-label={
          levelDetailReturnTo ? "Zurück zur Galerie" : "Zurück zur Karte"
        }
        onClick={closeLevelStart}
      >
        <ArrowIcon />
      </Button>
    </div>
  );

  return (
    <OverlayPortal>
      <BottomSheet
        open={levelStartOpen}
        size="full"
        sheetMaxHeight="100%"
        reducedMotion={reducedMotion}
        // Das Abschlussdetail liegt über der Kartennavigation, da es auf /karte geöffnet wird.
        rootClassName="z-[70]"
        showBackdrop={!celebrationDetailActive}
        panelRef={sheetPanelRef}
        enterDelayMs={MAP_DETAIL_SHEET_OPEN_DELAY_MS}
        enterDurationMs={MAP_DETAIL_SHEET_ENTER_DURATION_MS}
        ariaLabel="Level im Bezirk"
        onEntered={focusMapDetailSheet}
        onBackdropClick={celebrationDetailActive ? undefined : closeLevelStart}
        footer={sheetFooter}
        footerBodyScroll="hidden"
        bodyClassName="flex min-h-0 flex-1 flex-col pt-[calc(env(safe-area-inset-top,0px))]"
      >
        <article className="map-detail-sheet min-h-0 flex-1 pb-3">
          <div className="map-detail-sheet__stack">
            <div className="map-detail-sheet__premise">
              {showCrownInDetail ? (
                <span
                  className="map-detail-sheet__premise-crown pointer-events-none"
                  aria-hidden
                >
                  <KronenIcon className="block h-auto w-full" />
                  {crownBurstKey != null && !reducedMotion ? (
                    <PlacementParticleBurst
                      key={crownBurstKey}
                      embedded
                      celebration
                      mode="explosion"
                      from={{ x: 0, y: 0 }}
                      to={{ x: 0, y: 0 }}
                      intensity={14}
                    />
                  ) : null}
                </span>
              ) : null}
              <div className="map-detail-sheet__premise-mascot">
                <p className="map-detail-sheet__district-name">
                  {district.name}
                </p>
                <div className="map-detail-sheet__stars">
                  <MapDetailStars
                    displayedStars={arcDisplayedStars}
                    burstSlot={starReveal.burstSlot}
                    reducedMotion={reducedMotion}
                    onBurstComplete={starReveal.onStarBurstComplete}
                  />
                </div>
                {showMaxScoreBadge ? (
                  <div className="map-detail-sheet__premise-max-badge">
                    <LevelMaxScoreBadge className="mb-0" />
                  </div>
                ) : null}
                {selectedLevel.primaryLevel === false && !levelCompleted ? (
                  <div
                    className="mx-auto mb-2 block w-12 [&_svg]:h-auto [&_svg]:w-full"
                    aria-hidden
                  >
                    <BonuslevelIcon />
                  </div>
                ) : null}
                {detailMascotUrl != null ? (
                  <CmsSvgImage
                    src={detailMascotUrl}
                    alt={detailMascotAlt}
                    className="map-detail-sheet__premise-mascot-img"
                  />
                ) : null}
              </div>
              <div className="map-detail-sheet__premise-text leading-snug text-swg-black">
                {levelCompleted ? (
                  <>
                    <header className="text-center">
                      <h2
                        className={
                          showMaxScoreBadge
                            ? "sr-only"
                            : "m-0 font-text text-[1.375rem] font-bold leading-tight text-swg-black"
                        }
                      >
                        {showMaxScoreBadge ? "Maximalpunktzahl erreicht" : ""}
                      </h2>
                    </header>
                    <StrapiBlocksView
                      className="strapi-blocks-view--align-center"
                      blocks={detailBlocks}
                      emptyLabel="Kein Hinweistext für dieses Level."
                    />
                  </>
                ) : (
                  <StrapiBlocksView
                    className="strapi-blocks-view--align-center"
                    blocks={detailBlocks}
                    emptyLabel="Kein Probleminhalt für dieses Level."
                  />
                )}
              </div>
            </div>

            <div className="map-detail-sheet__mission">
              <div className="map-detail-sheet__mission-body">
                <span className="map-detail-sheet__mission-kicker">
                  Schwammstadt-Ziel
                </span>
                <span className="map-detail-sheet__mission-name">
                  {missionTitle}
                </span>
                <div className="map-detail-sheet__mission-content font-text leading-snug text-swg-black">
                  <StrapiBlocksView
                    blocks={missionBlocks}
                    emptyLabel="Kein Missionsinhalt für dieses Level."
                  />
                </div>
              </div>
            </div>
          </div>
        </article>
      </BottomSheet>
    </OverlayPortal>
  );
}
