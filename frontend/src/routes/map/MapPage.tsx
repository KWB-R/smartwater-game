import { fetchDistricts } from "@/api/services/bezirkService";
import { fetchMapPage } from "@/api/services/mapPageService";
import { BerlinMap } from "@/components/features/map/BerlinMap";
import { MapSessionProvider } from "@/components/features/map/mapSession";
import { useMapSession } from "@/components/features/map/mapSession";
import { mapPageContentOpacity } from "@/features/map/mapPageContentOpacity";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import { ContentStatus } from "@/components/ui/ContentStatus";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useReloadOnOnline } from "@/hooks/useOfflineStatus";
import { cn } from "@/lib/cn";
import { isStrapiConfigured } from "@/lib/env";
import {
  INITIAL_MAP_VIEW_BOX,
  type MapViewBox,
} from "@/features/map/useBerlinMapViewBox";
import { useMapPageProgress } from "@/features/map/useMapPageProgress";
import { MapBonusLevelUnlockOverlay } from "@/components/features/map/MapBonusLevelUnlockOverlay";
import { useMapBonusUnlockOverlay } from "@/features/map/useMapBonusUnlockOverlay";
import { useMapPostLevelMapIntro } from "@/features/map/useMapPostLevelMapIntro";
import { useMapCelebrationDevReplay } from "@/features/map/useMapCelebrationDevReplay";
import { useTrackAllLevelsComplete } from "@/features/analytics/useTrackAllLevelsComplete";
import {
  isMapPostLevelDetailPending,
  readMapPostLevelCelebration,
  readMapPostLevelCelebrationDistrictRouteId,
  shouldDeferMapDistrictHighlightForIntro,
} from "@/features/map/mapPostLevelCelebration";
import { resolveMapNavigationState } from "@/features/map/mapPostLevelCelebrationStorage";
import { getRouteLevelStartKey } from "@/features/map/mapDistrictDetailUrl";
import { findDistrictByRouteParam } from "@/features/map/berlinMapLayout";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  MAP_POST_LEVEL_MAP_CONFETTI_PARTICLE_COUNT,
  MAP_POST_LEVEL_MAP_CONFETTI_STOP_SPAWN_MS,
} from "@/features/map/mapPostLevelMapIntroTiming";
import { LevelWinConfetti } from "@/components/features/level/play/LevelWinConfetti";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { District } from "@/types/content";
import {
  useLocation,
  useMatch,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ROUTES } from "@/routes/paths";
import { MapDetailPage } from "@/routes/map/MapDetailPage";
import { MapViewTabs } from "@/components/features/map/MapViewTabs";
import { GalleryMapSheet } from "@/components/features/gallery/GalleryMapSheet";
import { collectGalleryEntries } from "@/features/gallery/collectGalleryEntries";
import "./mapPage.scss";

const EMPTY_DISTRICTS: District[] = [];

function MapDetailMount() {
  const mapDetailMatch = useMatch({
    path: `${ROUTES.map}/:districtId/detail/:levelKey?`,
    end: true,
  });
  const { levelStartOpen } = useMapSession();
  if (!mapDetailMatch && !levelStartOpen) {
    return null;
  }
  return <MapDetailPage />;
}

function MapPostLevelIntroFinisher({
  bindIntroComplete,
}: {
  bindIntroComplete: (fn: () => void) => void;
}) {
  const { finishMapPostLevelMapIntro } = useMapSession();
  useLayoutEffect(() => {
    bindIntroComplete(finishMapPostLevelMapIntro);
  }, [bindIntroComplete, finishMapPostLevelMapIntro]);
  return null;
}

export function MapPage() {
  const { districtId } = useParams();
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();
  const galleryMatch = useMatch({
    path: `${ROUTES.gallerie}/:levelKey?`,
    end: true,
  });
  const galleryOpen = galleryMatch != null;
  const galleryLevelKey = galleryMatch?.params.levelKey;
  const navigate = useNavigate();

  const districtsResource = useAsyncResource(fetchDistricts, []);
  const mapPageResource = useAsyncResource(fetchMapPage, []);

  useReloadOnOnline(districtsResource.reload);
  useReloadOnOnline(mapPageResource.reload);

  const districtsData =
    districtsResource.status === "success" ? districtsResource.data : undefined;
  const districts = useMemo(
    () => districtsData ?? EMPTY_DISTRICTS,
    [districtsData],
  );

  const { solvedDistricts, totalDistricts } = useMapPageProgress(districts);
  const allDistrictsWon =
    totalDistricts > 0 && solvedDistricts >= totalDistricts;
  useTrackAllLevelsComplete(allDistrictsWon);

  const mapPageData =
    mapPageResource.status === "success" ? mapPageResource.data : null;
  const mapContent = allDistrictsWon
    ? mapPageData?.winningContent
    : mapPageData?.content;
  const usabilityContent = allDistrictsWon
    ? mapPageData?.usabilityContentAfterWinning
    : mapPageData?.usabilityContent;

  const hasMapContent = Boolean(mapContent?.length);
  const hasUsabilityContent = Boolean(usabilityContent?.length);

  const mapDetailMatch = useMatch({
    path: `${ROUTES.map}/:districtId/detail/:levelKey?`,
    end: true,
  });
  const galleryEntryOpen = Boolean(galleryLevelKey?.trim());
  const postLevelDetailPending = isMapPostLevelDetailPending(location.state);
  const showViewTabs =
    mapDetailMatch == null && !galleryEntryOpen && !postLevelDetailPending;

  const [mapViewBox, setMapViewBox] =
    useState<MapViewBox>(INITIAL_MAP_VIEW_BOX);
  const mapChromeTopRef = useRef<HTMLDivElement>(null);
  const mapFooterContentRef = useRef<HTMLDivElement>(null);

  const onViewBoxChange = useCallback((viewBox: MapViewBox) => {
    setMapViewBox(viewBox);
  }, []);

  const viewBoxWidth = mapViewBox.width;

  const contentOpacity = mapPageContentOpacity(viewBoxWidth);

  const contentHidden = contentOpacity < 0.04;

  const {
    overlayDistrict,
    dismissBonusUnlock,
    bonusRevealedRevision,
    bonusRevealCelebration,
    clearBonusRevealCelebration,
    beginBonusRevealCelebration,
    commitBonusLevelsRevealed,
  } = useMapBonusUnlockOverlay(districts, districtId);

  const celebrationDistrictRouteId = useMemo(
    () =>
      readMapPostLevelCelebrationDistrictRouteId(location.state) ??
      districtId ??
      null,
    [location.state, districtId],
  );

  const celebrationDistrict = useMemo(
    () =>
      celebrationDistrictRouteId
        ? findDistrictByRouteParam(districts, celebrationDistrictRouteId)
        : undefined,
    [districts, celebrationDistrictRouteId],
  );

  const postLevelCelebration = readMapPostLevelCelebration(location.state, {
    districtRouteId: celebrationDistrictRouteId,
  });

  const introCompleteRef = useRef<() => void>(() => {});

  const bindIntroComplete = useCallback((fn: () => void) => {
    introCompleteRef.current = fn;
  }, []);
  const onRevealBonus = useCallback(() => {
    if (celebrationDistrict) {
      beginBonusRevealCelebration(celebrationDistrict);
    }
  }, [celebrationDistrict, beginBonusRevealCelebration]);

  const mapIntro = useMapPostLevelMapIntro({
    districtRouteId: celebrationDistrictRouteId ?? undefined,
    reducedMotion,
    onRevealBonus: postLevelCelebration?.mapRevealBonus ? onRevealBonus : null,
    onIntroComplete: () => introCompleteRef.current(),
  });

  useMapCelebrationDevReplay(districts, districtId);

  const deferHighlightedBezirkIds = useMemo(() => {
    const shouldDefer = shouldDeferMapDistrictHighlightForIntro({
      pathname: location.pathname,
      state: location.state,
      districtRouteId: celebrationDistrictRouteId,
      introPhase: mapIntro.phase,
      deferDistrictHighlightState: mapIntro.deferDistrictHighlight,
    });
    if (!shouldDefer || !celebrationDistrict?.bezirkId) {
      return undefined;
    }
    const id = celebrationDistrict.bezirkId.trim();
    return id ? new Set([id]) : undefined;
  }, [
    location.pathname,
    location.state,
    celebrationDistrictRouteId,
    mapIntro.phase,
    mapIntro.deferDistrictHighlight,
    celebrationDistrict?.bezirkId,
  ]);

  const deferMarkerSolvedAppearanceLevelKeys = useMemo(() => {
    if (!mapIntro.deferMarkerCompletedAppearance) {
      return undefined;
    }
    const merged = resolveMapNavigationState(
      location.state,
      celebrationDistrictRouteId,
    );
    const key = getRouteLevelStartKey(merged);
    return key ? new Set([key]) : undefined;
  }, [
    mapIntro.deferMarkerCompletedAppearance,
    location.state,
    celebrationDistrictRouteId,
  ]);

  const displaySolvedDistricts =
    mapIntro.deferSolvedDistrictIncrement && solvedDistricts > 0
      ? solvedDistricts - 1
      : solvedDistricts;

  const showOverviewChrome =
    showViewTabs &&
    (galleryOpen || !districtId || mapIntro.phase === "running");
  const progressRatio =
    totalDistricts > 0 ? displaySolvedDistricts / totalDistricts : 0;

  useEffect(() => {
    if (!galleryOpen || districtsResource.status !== "success") {
      return;
    }
    const key = galleryLevelKey?.trim();
    if (!key) {
      return;
    }
    const entries = collectGalleryEntries(districts);
    if (!entries.some((entry) => entry.levelKey === key)) {
      navigate(ROUTES.gallerie, { replace: true });
    }
  }, [
    galleryOpen,
    galleryLevelKey,
    districts,
    districtsResource.status,
    navigate,
  ]);

  return (
    <MapSessionProvider districtsFromList={districts}>
      <div className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-swg-bg">
        <div className="relative min-h-0 flex-1">
          <ContentStatus
            status={districtsResource.status}
            error={
              districtsResource.status === "error"
                ? districtsResource.error
                : undefined
            }
            empty={
              districtsResource.status === "success" && districts.length === 0
            }
            emptyMessage={
              isStrapiConfigured()
                ? "Keine Bezirke vom CMS geladen."
                : "Bezirke können online nicht geladen werden."
            }
          >
            <div className="absolute inset-0">
              <BerlinMap
                districts={districts}
                selectedDistrictId={districtId}
                onViewBoxChange={onViewBoxChange}
                bonusRevealRevision={bonusRevealedRevision}
                bonusRevealCelebration={bonusRevealCelebration}
                onBonusRevealCelebrationEnd={clearBonusRevealCelebration}
                onCommitBonusLevelsRevealed={commitBonusLevelsRevealed}
                deferHighlightedBezirkIds={deferHighlightedBezirkIds}
                districtHighlightBurstKey={mapIntro.districtHighlightBurstKey}
                districtHighlightBurstBezirkId={
                  celebrationDistrict?.bezirkId ?? null
                }
                onDistrictHighlightReveal={mapIntro.revealDistrictHighlight}
                deferMarkerSolvedAppearanceLevelKeys={
                  deferMarkerSolvedAppearanceLevelKeys
                }
              />

              {mapIntro.confettiActive ? (
                <div className="pointer-events-none absolute inset-0 z-[5]">
                  <LevelWinConfetti
                    active
                    reducedMotion={reducedMotion}
                    playCelebrationSound={false}
                    stopSpawningAfterMs={
                      MAP_POST_LEVEL_MAP_CONFETTI_STOP_SPAWN_MS
                    }
                    particleCount={MAP_POST_LEVEL_MAP_CONFETTI_PARTICLE_COUNT}
                  />
                </div>
              ) : null}

              {galleryOpen ? (
                <div className="absolute inset-0 z-50 flex min-h-0 flex-col bg-swg-bg">
                  {showViewTabs ? (
                    <div className="pointer-events-none flex shrink-0 justify-center px-4">
                      <div
                        ref={mapChromeTopRef}
                        className="map-page__chrome-top pointer-events-auto pb-3"
                      >
                        <MapViewTabs galleryActive />
                      </div>
                    </div>
                  ) : null}

                  <div className="relative min-h-0 flex-1">
                    <GalleryMapSheet
                      open
                      districts={districts}
                      districtsResource={districtsResource}
                      initialLevelKey={galleryLevelKey}
                    />
                  </div>

                  {showOverviewChrome &&
                  (hasMapContent || totalDistricts > 0) ? (
                    <div className="map-page flex shrink-0 flex-col">
                      <div
                        ref={mapFooterContentRef}
                        className="flex flex-col items-center gap-3 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-2"
                      >
                        {hasMapContent ? (
                          <div className="map-page__headline">
                            <StrapiBlocksView blocks={mapContent} />
                          </div>
                        ) : null}

                        {totalDistricts > 0 ? (
                          <div className="map-page__progress">
                            <div
                              className="map-page__progress-bar"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={totalDistricts}
                              aria-valuenow={displaySolvedDistricts}
                              aria-label="Gelöste Bezirke"
                            >
                              <span
                                className="map-page__progress-fill"
                                style={{
                                  width: `${Math.min(1, Math.max(0, progressRatio)) * 100}%`,
                                }}
                              />
                            </div>
                            <p className="map-page__progress-count">
                              {displaySolvedDistricts}/{totalDistricts} Bezirke
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  {showViewTabs ? (
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-x-0 top-0 z-[60] flex justify-center px-4",
                        contentHidden && "invisible",
                      )}
                      style={{ opacity: contentOpacity }}
                      aria-hidden={contentHidden}
                    >
                      <div
                        ref={mapChromeTopRef}
                        className="map-page__chrome-top pointer-events-auto"
                      >
                        <MapViewTabs galleryActive={false} />
                        {hasUsabilityContent ? (
                          <div className="map-page__usability">
                            <StrapiBlocksView blocks={usabilityContent} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {showOverviewChrome &&
                  (hasMapContent || totalDistricts > 0) ? (
                    <div
                      className={cn(
                        "map-page pointer-events-none absolute inset-0 z-[60] flex flex-col",
                        contentHidden && "invisible",
                      )}
                      style={{ opacity: contentOpacity }}
                      aria-hidden={contentHidden}
                    >
                      <div
                        ref={mapFooterContentRef}
                        className="mt-auto flex flex-col items-center gap-3 px-4 pb-[calc(2.25rem+env(safe-area-inset-bottom,0px))]"
                      >
                        {hasMapContent ? (
                          <div className="map-page__headline">
                            <StrapiBlocksView blocks={mapContent} />
                          </div>
                        ) : null}

                        {totalDistricts > 0 ? (
                          <div className="map-page__progress">
                            <div
                              className="map-page__progress-bar"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={totalDistricts}
                              aria-valuenow={displaySolvedDistricts}
                              aria-label="Gelöste Bezirke"
                            >
                              <span
                                className="map-page__progress-fill"
                                style={{
                                  width: `${Math.min(1, Math.max(0, progressRatio)) * 100}%`,
                                }}
                              />
                            </div>
                            <p className="map-page__progress-count">
                              {displaySolvedDistricts}/{totalDistricts} Bezirke
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </ContentStatus>
        </div>

        <MapPostLevelIntroFinisher bindIntroComplete={bindIntroComplete} />
        <MapDetailMount />

        {overlayDistrict ? (
          <MapBonusLevelUnlockOverlay
            district={overlayDistrict}
            onDismiss={dismissBonusUnlock}
          />
        ) : null}
      </div>
    </MapSessionProvider>
  );
}
