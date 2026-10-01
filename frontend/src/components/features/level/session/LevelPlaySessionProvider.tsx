import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePublishLevelHeaderSnapshots } from "@/routes/level/hooks/usePublishLevelHeaderSnapshots";
import { useLatestRef } from "@/hooks/useLatestRef";
import type { PlacedTile } from "@/features/level/logic/levelState";
import { readLevelProgress } from "@/features/level/levelProgress";
import { resolveLevelBeforeAfterMedia } from "@/features/level/gallery/resolveLevelBeforeAfterMedia";
import { usePreloadLevelBeforeAfterMedia } from "@/features/level/hooks/usePreloadLevelBeforeAfterMedia";
import { isWinningMaxBarScore } from "@/features/level/logic/endPlacementFlow";
import { useMainMenu } from "@/components/layout/mainMenuContext";
import { LevelPlayTutorialLayer } from "@/components/features/level/tutorial/LevelPlayTutorialLayer";
import { useLevelPlayTutorial } from "@/features/level/tutorial/useLevelPlayTutorial";
import { isKombiChildTile } from "@/features/level/logic/tilePuzzleMatch";
import { LevelDiscardProgressScreen } from "@/components/features/level/play/LevelDiscardProgressScreen";
import {
  placedTilesInCmsOrder,
  placedTilesWithEndAnimation,
} from "@/features/level/mappers/endAnimationPlacement";
import { LevelTileDockInner } from "@/components/features/level/LevelTileDockInner";
import { LibraryStripSkeleton } from "@/components/features/level/library/LibraryStripSkeleton";
import { useLevelTileDetailUrl } from "@/components/features/level/library/useLevelTileDetailUrl";
import {
  buildAvailableTilesForLibrary,
  scheduleScrollLibraryStripToTile,
  buildLetterByTileId,
} from "@/features/level/logic/levelPageUtils";
import { clearLevelPlaySession } from "@/features/level/session/levelPlaySession";
import { FullscreenLoadingScreen } from "@/components/ui/FullscreenLoadingScreen";
import {
  LEVEL_SESSION_CLEAR_PLAY_BOARD_OVERLAYS,
  useLevelSessionBoard,
} from "@/components/features/level/session/levelSessionChromeContext";
import { useLevelQuizChrome } from "@/components/features/level/play/useLevelQuizChrome";
import { QuizCrownOverlay } from "@/components/features/level/play/QuizCrownOverlay";
import {
  LEVEL_PLAY_PHASE,
  type LevelPlayPhase,
} from "@/routes/level/navigation/levelPlayPhase";
import { readLevelPlayLocationState } from "@/routes/level/navigation/levelPlayLocationState";
import { parseShareComboPartIds } from "@/routes/level/params/shareComboSearchParam";
import {
  phaseBoardHydratedFrom,
  preQuizGateOpenFrom,
  resolveLevelUiPhase,
  type LevelPhaseHydration,
} from "@/features/level/play/levelPhaseSyncPlan";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import {
  LevelWinConfetti,
  LEVEL_BEFORE_AFTER_CONFETTI_PARTICLE_COUNT,
  LEVEL_BEFORE_AFTER_CONFETTI_STOP_SPAWN_MS,
} from "@/components/features/level/play/LevelWinConfetti";
import { useLevelDiscardProgress } from "@/routes/level/useLevelDiscardProgress";
import {
  buildBoardSceneStaticFingerprint,
  buildPlacedTilesSceneFingerprint,
  dropTargetTiles,
  placedTileIds,
} from "@/features/level/play/levelPageHelpers";
import { LevelPlayChrome } from "@/components/features/level/session/LevelPlayChrome";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useMissionDismissSheet } from "@/features/level/play/useMissionDismissSheet";
import { useLevelShareState } from "@/features/level/play/useLevelShareState";
import { useLevelBoardSceneSync } from "@/features/level/play/useLevelBoardSceneSync";
import { useLevelPhaseSync } from "@/features/level/play/useLevelPhaseSync";
import { useLevelPlacementFlow } from "@/features/level/play/useLevelPlacementFlow";
import { useLevelComboOrchestrator } from "@/features/level/play/useLevelComboOrchestrator";
import { useLevelRestartFlow } from "@/features/level/play/useLevelRestartFlow";
import { useLevelLibraryIntro } from "@/features/level/play/useLevelLibraryIntro";
import {
  createInitialLevelPlayBoardState,
  levelPlayBoardReducer,
} from "@/features/level/play/levelPlayBoardState";
import { useLevelRouteModel } from "@/features/level/play/useLevelRouteModel";
import { useLevelPlayFlowRefs } from "@/features/level/play/useLevelPlayFlowRefs";
import {
  resolveHeaderBarScore,
  useLevelScoringModel,
} from "@/features/level/play/useLevelScoringModel";
import { useLevelProgressPersistence } from "@/features/level/play/useLevelProgressPersistence";
import { useLevelPostLevelNavigation } from "@/features/level/play/useLevelPostLevelNavigation";
import {
  isWaitingForCmsPuzzle,
  resolveLibrarySkeletonSlotCount,
  resolveLibraryStripLoading,
} from "@/features/level/play/libraryStripModel";
import { buildLevelPlayTutorialChromeKey } from "@/features/level/play/buildLevelPlayTutorialChromeKey";
import { useLevelMainMenuBridge } from "@/features/level/play/useLevelMainMenuBridge";
import {
  LevelPlayBoardProvider,
  LevelPlayCommandsProvider,
  LevelPlayConfigProvider,
  LevelPlayPhaseProvider,
  LevelPlayScoringProvider,
  type LevelPlayBoardValue,
  type LevelPlayCommands,
  type LevelPlayConfigValue,
  type LevelPlayPhaseValue,
  type LevelPlayScoringValue,
} from "@/components/features/level/session/levelPlaySessionContext";
import "@/components/features/level/session/levelGame.scss";

type LevelPlaySessionProviderProps = {
  playPhase: LevelPlayPhase;
};

/**
 * Koordiniert die Spielphase und stellt Konfiguration, Brettzustand, Punkte und Aktionen
 * über getrennte Contexts bereit. LevelPage bindet diesen Provider in die Route ein.
 */
export function LevelPlaySessionProvider({
  playPhase,
}: LevelPlaySessionProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Leveldaten, Medienpaket, Puzzlelimit und Kartenreferenzen vorbereiten.
  const route = useLevelRouteModel();
  const {
    levelIdParam,
    introState,
    cmsLevel,
    cmsLevelStatus,
    levelPlayAssets,
    missionLevelSummary,
    endAnimation,
    endAnimations,
    levelKey,
    puzzleItems,
    placementOrder,
    level,
    cappedLevel,
    missionGoalDimensions,
    districtName,
    missionLabel,
    assetPreload,
    libraryStripReady,
    postLevelDistrictRef,
    postLevelDistrictRouteIdRef,
  } = route;

  const playSurfaceReadyRaw = assetPreload.ready && libraryStripReady;
  // Einmal erreichte Bereitschaft bis zum Levelwechsel beibehalten.
  // Ein Levelwechsel bindet den Provider über den key in LevelPlayRouter neu ein.
  const [playSurfaceLatched, setPlaySurfaceLatched] = useState(false);
  if (playSurfaceReadyRaw && !playSurfaceLatched) {
    setPlaySurfaceLatched(true);
  }
  const playSurfaceReady = playSurfaceReadyRaw || playSurfaceLatched;
  const {
    boardSceneRef,
    canvasHostRef,
    boardSceneReady,
    designFrameRef,
    setChrome,
  } = useLevelSessionBoard();

  useEffect(() => {
    return () => {
      setChrome(LEVEL_SESSION_CLEAR_PLAY_BOARD_OVERLAYS);
    };
  }, [setChrome]);

  // Die Ablauf-Hooks teilen sich ein stabiles Objekt mit gemeinsamen Refs.

  const flowRefs = useLevelPlayFlowRefs();
  const {
    playAdvancedRef,
    pendingSocketTilesRef,
    comboRevealTileIdsRef,
    preQuizGateOpenTimerRef,
    replayProgressResetKeyRef,
    mapReturnFromStarCountRef,
    postLevelBestStarsRef,
    postLevelShouldCelebrateRef,
    postLevelIsFirstCompletionRef,
    postLevelMapSnapshotRef,
    missionBarTrackRef,
    missionProgressRowRef,
    puzzleCountBadgeRef,
    tileCardsButtonRef,
    headerSpongeRef,
  } = flowRefs;

  // Den Brettzustand zentral über den Reducer verwalten.

  const [boardState, dispatchBoard] = useReducer(
    levelPlayBoardReducer,
    cappedLevel,
    createInitialLevelPlayBoardState,
  );
  const {
    placedTiles,
    availableTiles,
    levelPoints,
    placementRewardBlocking,
    draggingTileId,
    comboDialogOpen,
    comboRevealReservedTileIds,
  } = boardState;
  // Das Puzzlelimit aktualisieren, sobald die CMS-Daten vorliegen.
  if (boardState.maxTileCount.base !== cappedLevel.maximumTileCount) {
    dispatchBoard({
      type: "maxTileCountBaseChanged",
      base: cappedLevel.maximumTileCount,
    });
  }
  const currentMaxTileCount =
    boardState.maxTileCount.base === cappedLevel.maximumTileCount
      ? boardState.maxTileCount.count
      : Math.max(1, cappedLevel.maximumTileCount);

  const availableTilesForSyncRef = useLatestRef(availableTiles);
  const [libraryIntroRunId, setLibraryIntroRunId] = useState(0);
  const bumpLibraryIntroRunId = useCallback(() => {
    setLibraryIntroRunId((n) => n + 1);
  }, []);
  const placedTilesForSceneRef = useLatestRef(placedTiles);

  // Beim erneuten Spielen nur die laufende Sitzung leeren; gespeicherte Sterne und Kronen behalten.
  useEffect(() => {
    if (playPhase !== LEVEL_PLAY_PHASE.placing) {
      return;
    }
    if (playAdvancedRef.current || placedTiles.length > 0) {
      return;
    }
    const prior = readLevelProgress(levelKey);
    if (prior?.completed !== true) {
      return;
    }
    const resetKey = `${levelKey}|${location.key}`;
    if (replayProgressResetKeyRef.current === resetKey) {
      return;
    }
    replayProgressResetKeyRef.current = resetKey;
    clearLevelPlaySession(levelKey);
  }, [levelKey, playPhase, placedTiles.length, location.key]);

  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionForSceneRef = useLatestRef(reducedMotion);

  const [particleBursts, setParticleBursts] = useState<
    Array<{
      key: number;
      from: { x: number; y: number };
      to: { x: number; y: number };
      intensity: number;
      endScatter?: { alongMax: number; perpMax: number };
      fillAbsorb?: {
        fillDeltaPx: number;
        barHalfHeight: number;
        fillDurationMs?: number;
        fillStartDelayMs?: number;
      };
      mode?: "placement" | "explosion";
      relaxedFlight?: boolean;
      explosionSpreadPx?: number;
    }>
  >([]);
  const [postPlacementConfettiActive, setPostPlacementConfettiActive] =
    useState(false);
  const startPostPlacementConfetti = useCallback(() => {
    setPostPlacementConfettiActive(true);
  }, []);
  const clearPostPlacementConfetti = useCallback(() => {
    setPostPlacementConfettiActive(false);
  }, []);

  const tileLibrarySyncToken = useMemo(() => {
    const puzzleKey = puzzleItems.map((item) => item.uniqueId).join("\0");
    return `${levelIdParam ?? ""}|${cmsLevelStatus}|${puzzleKey}|${level.tiles.length}`;
  }, [levelIdParam, cmsLevelStatus, puzzleItems, level.tiles.length]);

  const placedLibrarySyncKey = useMemo(
    () =>
      placedTiles
        .map((p) => p.tile.id)
        .sort((a, b) => a - b)
        .join(","),
    [placedTiles],
  );

  const syncAvailableTilesFromPlaced = useCallback(() => {
    if (pendingSocketTilesRef.current.length > 0) {
      return;
    }
    if (flowRefs.comboRevealReservedRef.current.size > 0) {
      return;
    }
    if (comboRevealTileIdsRef.current.length > 0) {
      return;
    }
    const pendingKombiIds = new Set(
      pendingSocketTilesRef.current.map((t) => t.id),
    );
    // Außerhalb des State-Updaters berechnen: React kann reine Updater mehrfach ausführen.
    // Der Hervorhebungseffekt ist ein Seiteneffekt und gehört deshalb nicht in den Updater.
    const prev = availableTilesForSyncRef.current;
    const next = buildAvailableTilesForLibrary(
      prev,
      level,
      puzzleItems,
      placedTilesForSceneRef.current,
      pendingKombiIds,
    );
    availableTilesForSyncRef.current = next;
    dispatchBoard({ type: "librarySynced", availableTiles: next });
    const prevIds = new Set(prev.map((t) => t.id));
    const newKombi = next.find(
      (t) => !prevIds.has(t.id) && isKombiChildTile(t, puzzleItems),
    );
    if (newKombi) {
      flowRefs.flashKombiStripRevealRef.current(newKombi.id);
    }
  }, [
    level,
    puzzleItems,
    availableTilesForSyncRef,
    placedTilesForSceneRef,
    flowRefs,
    pendingSocketTilesRef,
    comboRevealTileIdsRef,
  ]);

  // Dieselbe Wartebedingung für die beteiligten Abläufe verwenden.
  useEffect(() => {
    if (
      isWaitingForCmsPuzzle({
        levelIdParam,
        puzzleItemsLength: puzzleItems.length,
        cmsLevelStatus,
        levelTilesLength: level.tiles.length,
      })
    ) {
      return;
    }

    syncAvailableTilesFromPlaced();
    dispatchBoard({ type: "placedTilesRefreshed", level });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Aktualisierung über tileLibrarySyncToken
  }, [tileLibrarySyncToken]);

  useEffect(() => {
    if (
      isWaitingForCmsPuzzle({
        levelIdParam,
        puzzleItemsLength: puzzleItems.length,
        cmsLevelStatus,
        levelTilesLength: level.tiles.length,
      })
    ) {
      return;
    }
    syncAvailableTilesFromPlaced();
  }, [placedLibrarySyncKey, syncAvailableTilesFromPlaced]);
  const [missionDialogOpen, setMissionDialogOpen] = useState(false);

  // Die URL bestimmt die Spielphase. levelUiPhase berücksichtigt zusätzlich
  // die wiederhergestellte Sitzung und die Vergleichsansicht unter dem Quiz.
  // Diese Ansicht bleibt als eigener Zustand erhalten, bis das Quiz vollständig eingeblendet ist.

  const playLocationState = readLevelPlayLocationState(location.state);
  const [phaseHydration, setPhaseHydration] =
    useState<LevelPhaseHydration | null>(null);
  const phaseBoardHydrated = phaseBoardHydratedFrom(
    phaseHydration,
    levelKey,
    playPhase,
  );
  const [quizUnderlayActive, setQuizUnderlayActive] = useState(false);
  const shareComboFromUrl = useMemo(
    () => parseShareComboPartIds(location.search),
    [location.search],
  );
  const levelUiPhase = resolveLevelUiPhase({
    playPhase,
    postQuizWinning: playLocationState?.postQuizWinning === true,
    phaseBoardHydrated,
    quizUnderlayActive,
    shareComboFromUrl: shareComboFromUrl.length > 0,
  });
  // Boolesche Hook-Parameter aus dem gemeinsamen Phasenzustand ableiten.
  const quizScreenFromUrl = levelUiPhase.kind === "quiz";
  const shareScreenActive = levelUiPhase.kind === "share";
  const shareScreenOpen =
    levelUiPhase.kind === "share" && levelUiPhase.boardRestored;
  const preQuizGateOpen = preQuizGateOpenFrom(levelUiPhase);
  const beforeAfterGateActive = levelUiPhase.kind === "preQuiz";
  const puzzleFailedOpen = levelUiPhase.kind === "failed";

  const {
    levelAssetsFolder,
    shareComboPartIds,
    comboShareVideoUrl,
    comboShareVideoPosterUrl,
    shareFileVideoUrl,
    shareUsesComboVideo,
  } = useLevelShareState({
    locationSearch: location.search,
    placedTiles,
    placementOrder,
    shareScreenActive,
    district: introState?.district,
    levelSummary: cmsLevel ?? introState?.level ?? null,
    cmsAssetsFolder: cmsLevel?.assetsFolder,
  });

  const resolvePlacedTilesForScene = useCallback((): PlacedTile[] => {
    const base = placedTilesForSceneRef.current;
    const cmsOrdered = placedTilesInCmsOrder(base, placementOrder);
    if (shareUsesComboVideo) {
      return cmsOrdered;
    }
    if (shareScreenActive && endAnimations.length > 0) {
      return placedTilesWithEndAnimation(
        cmsOrdered,
        endAnimations,
        placementOrder,
      );
    }
    return cmsOrdered;
  }, [
    shareUsesComboVideo,
    shareScreenActive,
    endAnimations,
    placementOrder,
    placedTilesForSceneRef,
  ]);

  const placedTilesSceneFingerprint = useMemo(
    () => buildPlacedTilesSceneFingerprint(placedTiles),
    [placedTiles],
  );

  const boardSceneStaticFingerprint = useMemo(
    () =>
      buildBoardSceneStaticFingerprint(
        shareScreenActive,
        endAnimations,
        placementOrder,
      ),
    [shareScreenActive, endAnimations, placementOrder],
  );

  const shareBoardSceneFingerprint = useMemo(
    () => [placedTilesSceneFingerprint, boardSceneStaticFingerprint].join("|"),
    [placedTilesSceneFingerprint, boardSceneStaticFingerprint],
  );

  const { setGameActions, setLevelLeaveGuard, isOpen: mainMenuOpen } =
    useMainMenu();

  // Kombifreischaltung, Rückmeldungen und Hervorhebung gemeinsam koordinieren.
  const {
    pendingComboAfterBonusRef,
    rewardTimersRef,
    comboDialogScheduleTimerRef,
    clearComboDialogScheduleTimer,
    clearRewardTimers,
    dismissComboUi,
    clearComboRevealTimer,
    finishComboRevealBurst,
    revealPendingComboTiles,
  } = useLevelComboOrchestrator({
    refs: flowRefs,
    level,
    puzzleItems,
    reducedMotion,
    preQuizGateOpen,
    puzzleFailedOpen,
    comboRevealReservedTileIds,
    dispatchBoard,
  });

  // Ladezustand und Bibliotheksplatzhalter aus libraryStripModel ableiten.
  const librarySkeletonSlotCount = useMemo(
    () =>
      resolveLibrarySkeletonSlotCount({
        cappedLevel,
        puzzleItems,
        levelIdParam,
        cmsLevelStatus,
      }),
    [cappedLevel, puzzleItems, levelIdParam, cmsLevelStatus],
  );

  const libraryStripLoading = useMemo(
    () =>
      resolveLibraryStripLoading({
        availableTilesLength: availableTiles.length,
        levelIdParam,
        puzzleItems,
        cmsLevelStatus,
        cappedLevel,
        placedTilesLength: placedTiles.length,
        currentMaxTileCount,
      }),
    [
      availableTiles.length,
      levelIdParam,
      puzzleItems,
      cmsLevelStatus,
      cappedLevel,
      placedTiles.length,
      currentMaxTileCount,
    ],
  );

  const libraryIntroSessionKey = useMemo(
    () => `${levelIdParam ?? ""}|${libraryIntroRunId}`,
    [levelIdParam, libraryIntroRunId],
  );

  const {
    stripTiles: libraryStripTiles,
    libraryIntroActive,
    libraryIntroSettled,
    libraryIntroEnterTileIds,
    libraryStripIntroLoading,
  } = useLevelLibraryIntro({
    availableTiles,
    puzzleItems,
    placedTilesLength: placedTiles.length,
    libraryStripLoading,
    boardSceneReady,
    playSurfaceReady,
    reducedMotion,
    libraryIntroRunId,
    levelSyncKey: libraryIntroSessionKey,
  });

  const libraryStripLoadingForUi =
    libraryStripLoading || libraryStripIntroLoading;

  const placedTileIdsForHints = useMemo(
    () => placedTileIds(placedTiles),
    [placedTiles],
  );
  const dropTargetHintTiles = useMemo(
    () => dropTargetTiles(libraryStripTiles, placedTileIdsForHints),
    [libraryStripTiles, placedTileIdsForHints],
  );

  const { detailTile, openDetail, closeDetail, selectDetail } =
    useLevelTileDetailUrl(libraryStripTiles);

  const lastDetailTileIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (detailTile != null) {
      lastDetailTileIdRef.current = detailTile.id;
    }
  }, [detailTile]);

  const handleDetailClose = useCallback(() => {
    const tileId = lastDetailTileIdRef.current;
    closeDetail();
    if (tileId == null) {
      return;
    }
    scheduleScrollLibraryStripToTile(
      tileId,
      reducedMotion ? "auto" : "smooth",
    );
  }, [closeDetail, reducedMotion]);

  const letterByTileId = useMemo(
    () => buildLetterByTileId(libraryStripTiles),
    [libraryStripTiles],
  );

  const preloadLibraryDock = useMemo(
    () => (
      <LevelTileDockInner>
        <LibraryStripSkeleton slotCount={librarySkeletonSlotCount} />
      </LevelTileDockInner>
    ),
    [librarySkeletonSlotCount],
  );

  const minimumScorePercentage = cmsLevel?.minimumScorePercentage ?? null;

  // Punktesumme, Balkenmaximum und Sterne aus dem aktuellen Spielstand berechnen.
  const {
    placementScoreSum,
    barMaxScore,
    computeWinningTotalBarScore,
    winningTotalBarScore,
    winningCompletionStars,
    bumpPlaySessionQuizRevision,
  } = useLevelScoringModel({
    placedTiles,
    puzzleItems,
    cappedLevel,
    currentMaxTileCount,
    levelKey,
    missionGoalDimensions,
    minimumScorePercentage,
  });

  const {
    armPostPlacementGateAfterCelebration,
    onPlacementParticleBurstsFinished,
    disarmPostPlacementGate,
  } = useLevelPhaseSync({
    route: {
      locationState: location.state,
      locationSearch: location.search,
      playPhase,
      quizScreenFromUrl,
      levelKey,
      levelRouteId: levelIdParam?.trim() || levelKey,
      introState,
      navigate,
    },
    board: {
      cappedLevel,
      puzzleItems,
      placedTilesForSceneRef,
      playAdvancedRef,
      levelPoints,
      currentMaxTileCount,
      barMaxScore,
      minimumScorePercentage,
      comboDialogOpen,
      dispatchBoard,
    },
    phase: {
      preQuizGateOpen,
      puzzleFailedOpen,
      shareScreenActive,
      shareScreenOpen,
      shareComboPartIds,
      phaseBoardHydrated,
      setPhaseHydration,
      preQuizGateOpenTimerRef,
      dismissComboUi,
    },
  });

  const handleRestartLevel = useLevelRestartFlow({
    config: {
      levelKey,
      levelRouteId: levelIdParam?.trim() || levelKey,
      cappedLevel,
      puzzleItems,
      barMaxScore,
      introState,
      navigate,
    },
    refs: {
      playAdvancedRef,
      preQuizGateOpenTimerRef,
      pendingSocketTilesRef,
      pendingComboAfterBonusRef,
      comboRevealTileIdsRef,
      reducedMotionForSceneRef,
    },
    scene: { boardSceneRef, boardSceneReady },
    actions: {
      disarmPostPlacementGate,
      clearRewardTimers,
      clearComboRevealTimer,
      dismissComboUi,
      finishComboRevealBurst,
      closeDetail,
      setQuizUnderlayActive,
      setMissionDialogOpen,
      bumpLibraryIntroRunId,
      setParticleBursts,
      clearPostPlacementConfetti,
      dispatchBoard,
    },
  });

  const discardSessionOnLeave = useCallback(() => {
    clearLevelPlaySession(levelKey);
  }, [levelKey]);

  const levelDiscardProgress = useLevelDiscardProgress({
    playPhase,
    placedTileCount: placedTiles.length,
    levelKey,
    onSessionDiscarded: discardSessionOnLeave,
  });
  const leaveWithoutDiscardPromptRef = useLatestRef(
    levelDiscardProgress.leaveWithoutDiscardPrompt,
  );

  const discardProgressOverlay = levelDiscardProgress.open ? (
    <OverlayPortal>
      <LevelDiscardProgressScreen
        onStay={levelDiscardProgress.handleStay}
        onDiscard={levelDiscardProgress.handleDiscard}
      />
    </OverlayPortal>
  ) : null;

  /**
   * Dieselbe Konfetti-Instanz beim Übergang zum Vergleich behalten, damit der Effekt nicht erneut startet.
   */
  const transitionConfettiActive =
    postPlacementConfettiActive || (preQuizGateOpen && !puzzleFailedOpen);
  const transitionConfettiOverlay = transitionConfettiActive ? (
    <OverlayPortal>
      <div
        className="pointer-events-none absolute inset-0 z-[200] overflow-hidden"
        aria-hidden
      >
        <LevelWinConfetti
          key="level-prequiz-transition-confetti"
          active={transitionConfettiActive}
          reducedMotion={reducedMotion}
          stopSpawningAfterMs={LEVEL_BEFORE_AFTER_CONFETTI_STOP_SPAWN_MS}
          stopSpawning={preQuizGateOpen}
          particleCount={LEVEL_BEFORE_AFTER_CONFETTI_PARTICLE_COUNT}
        />
      </div>
    </OverlayPortal>
  ) : null;

  const {
    missionDismissOverlayActive,
    missionDismissSheetOpen,
    handleMissionDismissSheetClosed,
  } = useMissionDismissSheet({
    introState,
    pathname: location.pathname,
    search: location.search,
    navigate,
  });

  const levelPlayTutorialEnabled =
    playSurfaceReady &&
    !quizScreenFromUrl &&
    !shareScreenActive &&
    !puzzleFailedOpen &&
    !preQuizGateOpen;

  const placementRewardUiBlocking = placementRewardBlocking || comboDialogOpen;

  const levelPlayTutorial = useLevelPlayTutorial({
    enabled: levelPlayTutorialEnabled,
    stripTiles: dropTargetHintTiles,
    detailTileId: detailTile?.id ?? null,
    mainMenuOpen,
    draggingTileId,
    missionDismissActive: missionDismissOverlayActive || missionDialogOpen,
    hasPlacedTiles: placedTiles.length > 0,
    placementRewardUiBlocking,
    libraryIntroActive,
    libraryIntroSettled,
  });

  // Levelaktionen und Verlassen-Dialog mit dem Hauptmenü verbinden.
  useLevelMainMenuBridge({
    setMissionDialogOpen,
    showTutorial: levelPlayTutorial.showTutorial,
    handleRestartLevel,
    promptLeave: levelDiscardProgress.promptLeave,
    setGameActions,
    setLevelLeaveGuard,
  });

  const { persistProgressAfterQuiz } = useLevelProgressPersistence({
    levelKey,
    placementScoreSum,
    barMaxScore,
    minimumScorePercentage,
    placedTilesForSceneRef,
    postLevelDistrictRef,
    mapReturnFromStarCountRef,
    postLevelBestStarsRef,
    postLevelShouldCelebrateRef,
    postLevelIsFirstCompletionRef,
    postLevelMapSnapshotRef,
    preQuizGateOpen,
    levelHasQuiz: Boolean(cmsLevel?.quiz),
    missionGoalDimensions,
    computeWinningTotalBarScore,
  });

  // Die gemeinsame leaveWithoutDiscardPromptRef auch für die Abschlussnavigation verwenden.

  const {
    quizCrownDialogOpen,
    setQuizCrownDialogOpen,
    openQuizCrownOverlay,
    exitPuzzleFailedToMap,
    finishQuizAndGoToMapDetail,
    goToQuiz: goToQuizRaw,
    clearPreQuizUnderlay,
    handleShareContinue,
  } = useLevelPostLevelNavigation({
    levelKey,
    levelRouteId: levelIdParam?.trim() || levelKey,
    navigate,
    introState,
    levelPlayAssetsDistrict: levelPlayAssets.district,
    postLevelDistrictRef,
    postLevelDistrictRouteIdRef,
    postLevelMapSnapshotRef,
    postLevelBestStarsRef,
    postLevelShouldCelebrateRef,
    leaveWithoutDiscardPromptRef,
    persistProgressAfterQuiz,
    bumpPlaySessionQuizRevision,
    setQuizUnderlayActive,
    levelHasQuiz: Boolean(cmsLevel?.quiz),
  });

  const goToQuiz = useCallback(() => {
    clearPostPlacementConfetti();
    goToQuizRaw();
  }, [clearPostPlacementConfetti, goToQuizRaw]);

  useEffect(() => {
    if (puzzleFailedOpen) {
      clearPostPlacementConfetti();
    }
  }, [puzzleFailedOpen, clearPostPlacementConfetti]);

  const quizChrome = useLevelQuizChrome({
    enabled: quizScreenFromUrl,
    levelKey,
    levelSlug: cmsLevel?.slug?.trim() || cmsLevel?.documentId || null,
    level: cappedLevel,
    cmsQuiz: cmsLevel?.quiz ?? null,
    puzzleItems,
    placementOrder,
    missionGoalDimensions,
    districtName,
    missionLabel,
    reducedMotion,
    missionDialogOpen,
    setMissionDialogOpen,
    onQuizComplete: finishQuizAndGoToMapDetail,
    onQuizAnswerCorrect: openQuizCrownOverlay,
    onQuizSheetEntered: clearPreQuizUnderlay,
    boardRebuildEnabled: !preQuizGateOpen,
    barMaxScore,
    minimumScorePercentage,
    placementScoreFallback: placementScoreSum,
  });

  // Während einer Punkteanimation den Zwischenwert verwenden, sonst den Ruhewert der Phase.
  const { barDisplayScore, headerBarScore } = resolveHeaderBarScore({
    shareScreenActive,
    quizScreenFromUrl,
    winningTotalBarScore,
    quizHeaderScore: quizChrome.headerScore,
    placementScoreSum,
    barScoreAnimationOverride: boardState.barScoreAnimationOverride,
    beforeAfterGateActive,
  });

  usePublishLevelHeaderSnapshots({
    levelKey,
    hasPlayed: placedTiles.length > 0,
    preQuizGateOpen,
    puzzleFailedOpen,
    shareScreenActive,
    quizScreenFromUrl,
    winningTotalBarScore,
    barDisplayScore,
    placementScoreSum,
    barMaxScore,
    placedCount: placedTiles.length,
    maxTileCount: cappedLevel.maximumTileCount,
    draggingTileId,
    placementRewardBlocking,
  });

  const beforeAfterMedia = useMemo(
    () =>
      resolveLevelBeforeAfterMedia({
        district: introState?.district,
        level: cmsLevel ?? introState?.level ?? null,
        playLevelBackgroundUrl: level.background.url,
        assetsFolder: cmsLevel?.assetsFolder ?? levelAssetsFolder,
        partIds: shareComboPartIds,
        endAnimation,
      }),
    [
      introState?.district,
      cmsLevel,
      introState?.level,
      level.background.url,
      cmsLevel?.assetsFolder,
      levelAssetsFolder,
      shareComboPartIds,
      endAnimation,
    ],
  );

  const showWinningMaxCelebration = useMemo(
    () => isWinningMaxBarScore(winningTotalBarScore, barMaxScore),
    [winningTotalBarScore, barMaxScore],
  );

  const puzzlePlacementComplete =
    puzzleItems.length > 0 && placedTiles.length >= puzzleItems.length;

  usePreloadLevelBeforeAfterMedia(
    beforeAfterMedia,
    puzzlePlacementComplete || preQuizGateOpen,
  );

  useLevelBoardSceneSync({
    scene: {
      boardSceneRef,
      boardSceneReady,
      reducedMotionForSceneRef,
      resolvePlacedTilesForScene,
    },
    flags: {
      shareUsesComboVideo,
      preQuizGateOpen,
      reducedMotion,
      quizScreenFromUrl,
      placedTilesLength: placedTiles.length,
      shareScreenActive,
      puzzleFailedOpen,
    },
    levelTiles: level.tiles,
    endAnimations,
    boardSceneStaticFingerprint,
    placedTilesSceneFingerprint,
    shareBoardSceneFingerprint,
  });

  const {
    handleThumbPointerDown,
    handleParticleBurstComplete,
  } = useLevelPlacementFlow({
    config: {
      level,
      cappedLevel,
      puzzleItems,
      placementOrder,
      missionGoalDimensions,
      currentMaxTileCount,
      barMaxScore,
      minimumScorePercentage,
      placementRewardBlocking,
      libraryIntroBlocking:
        libraryIntroActive || levelPlayTutorial.blocksLibraryDrag,
    },
    scene: {
      boardSceneRef,
      canvasHostRef,
      designFrameRef,
      missionBarTrackRef,
      reducedMotionForSceneRef,
    },
    flow: {
      placedTilesForSceneRef,
      pendingSocketTilesRef,
      pendingComboAfterBonusRef,
      comboRevealTileIdsRef,
      comboDialogScheduleTimerRef,
      rewardTimersRef,
      availableTilesRef: availableTilesForSyncRef,
      clearRewardTimers,
      clearComboDialogScheduleTimer,
      dispatchBoard,
      setParticleBursts,
      armPostPlacementGateAfterCelebration,
      onPlacementParticleBurstsFinished,
      onStartPostPlacementConfetti: startPostPlacementConfetti,
    },
  });

  const openFirstUnplacedTileDetail = useCallback(() => {
    if (levelPlayTutorial.blocksTileCardsMenu) {
      return;
    }
    const first =
      dropTargetHintTiles[0] ??
      (levelPlayTutorial.requiresTileCardsMenuClick
        ? libraryStripTiles[0]
        : undefined);
    if (!first) {
      return;
    }
    // Der globale SoundProvider übernimmt den Klicksound für Schaltflächen.
    openDetail(first);
  }, [
    levelPlayTutorial.blocksTileCardsMenu,
    levelPlayTutorial.requiresTileCardsMenuClick,
    dropTargetHintTiles,
    libraryStripTiles,
    openDetail,
  ]);

  const tileCardsMenuDisabled =
    dropTargetHintTiles.length === 0 &&
    !levelPlayTutorial.requiresTileCardsMenuClick;

  const levelPlayTutorialChromeKey = useMemo(
    () =>
      buildLevelPlayTutorialChromeKey({
        active: levelPlayTutorial.active,
        stepIndex: levelPlayTutorial.stepIndex,
        stepId: levelPlayTutorial.step?.id,
        requiresTileCardsMenuClick: levelPlayTutorial.requiresTileCardsMenuClick,
        blocksBoardPointer: levelPlayTutorial.blocksBoardPointer,
        blocksLibraryDrag: levelPlayTutorial.blocksLibraryDrag,
        tileCardsMenuDisabled,
      }),
    [
      levelPlayTutorial.active,
      levelPlayTutorial.stepIndex,
      levelPlayTutorial.step?.id,
      levelPlayTutorial.requiresTileCardsMenuClick,
      levelPlayTutorial.blocksBoardPointer,
      levelPlayTutorial.blocksLibraryDrag,
      tileCardsMenuDisabled,
    ],
  );

  const handleComboDialogOpenChange = useCallback((open: boolean) => {
    dispatchBoard({ type: "comboDialogOpenSet", open });
  }, []);

  // Context-Werte der Spielsitzung.
  const configValue = useMemo<LevelPlayConfigValue>(
    () => ({
      levelKey,
      cappedLevel,
      puzzleItems,
      placementOrder,
      missionGoalDimensions,
      districtName,
      missionLabel,
      level,
      endAnimation,
      endAnimations,
      introState,
      cmsLevel,
      cmsLevelStatus,
      missionLevelSummary,
      levelIdParam,
      levelPlayAssets,
      reducedMotion,
      boardSceneReady,
    }),
    [
      levelKey,
      cappedLevel,
      puzzleItems,
      placementOrder,
      missionGoalDimensions,
      districtName,
      missionLabel,
      level,
      endAnimation,
      endAnimations,
      introState,
      cmsLevel,
      cmsLevelStatus,
      missionLevelSummary,
      levelIdParam,
      levelPlayAssets,
      reducedMotion,
      boardSceneReady,
    ],
  );

  const boardValue = useMemo<LevelPlayBoardValue>(
    () => ({
      boardState,
      dispatchBoard,
      currentMaxTileCount,
      placedTilesForSceneRef,
      availableTilesForSyncRef,
    }),
    [
      boardState,
      dispatchBoard,
      currentMaxTileCount,
      placedTilesForSceneRef,
      availableTilesForSyncRef,
    ],
  );

  const phaseValue = useMemo<LevelPlayPhaseValue>(
    () => ({
      levelUiPhase,
      playPhase,
      setQuizUnderlayActive,
    }),
    [levelUiPhase, playPhase, setQuizUnderlayActive],
  );

  const scoringValue = useMemo<LevelPlayScoringValue>(
    () => ({
      placementScoreSum,
      barMaxScore,
      headerBarScore,
      barDisplayScore,
      winningTotalBarScore,
      winningCompletionStars,
      minimumScorePercentage,
      showWinningMaxCelebration,
    }),
    [
      placementScoreSum,
      barMaxScore,
      headerBarScore,
      barDisplayScore,
      winningTotalBarScore,
      winningCompletionStars,
      minimumScorePercentage,
      showWinningMaxCelebration,
    ],
  );

  const commandsValue = useMemo<LevelPlayCommands>(
    () => ({
      onShareContinue: handleShareContinue,
      onComboDialogOpenChange: handleComboDialogOpenChange,
      onComboDialogClosed: revealPendingComboTiles,
      onThumbPointerDown: handleThumbPointerDown,
      onOpenTileCardsMenu: openFirstUnplacedTileDetail,
      onDetailClose: handleDetailClose,
      onDetailSelectTile: selectDetail,
      onParticleBurstComplete: handleParticleBurstComplete,
      onRestartLevel: handleRestartLevel,
      onExitPuzzleFailedToMap: exitPuzzleFailedToMap,
      onGoToQuiz: goToQuiz,
    }),
    [
      handleShareContinue,
      handleComboDialogOpenChange,
      revealPendingComboTiles,
      handleThumbPointerDown,
      openFirstUnplacedTileDetail,
      handleDetailClose,
      selectDetail,
      handleParticleBurstComplete,
      handleRestartLevel,
      exitPuzzleFailedToMap,
      goToQuiz,
    ],
  );

  // Die Komponente für Header, Ablage und Overlays muss in jedem Rückgabezweig eingebunden sein.
  // So stehen diese Elemente auch während der Ladeansicht bereit.
  // Konfiguration und Zustand stammen aus den jeweiligen Contexts.

  const levelPlayChrome = (
    <LevelPlayChrome
      assetPreloadReady={playSurfaceReady}
      preloadLibraryDock={preloadLibraryDock}
      library={{
        detailStripTiles: libraryStripTiles,
        libraryStripLoading: libraryStripLoadingForUi,
        librarySkeletonSlotCount,
        letterByTileId,
        detailTile,
        libraryIntroEnterTileIds,
        libraryIntroBlocking:
          libraryIntroActive || levelPlayTutorial.blocksLibraryDrag,
        libraryIntroSettled,
        placedTileIdsForHints,
        dropTargetHintTiles,
      }}
      share={{
        shareFileVideoUrl,
        shareUsesComboVideo,
        comboShareVideoUrl,
        comboShareVideoPosterUrl,
      }}
      phase={{
        beforeAfterBackgroundUrl: beforeAfterMedia.backgroundImageUrl,
        beforeAfterFinishedImageUrl: beforeAfterMedia.finishedImageUrl,
        beforeAfterVideoUrl: beforeAfterMedia.videoUrl,
        postPlacementConfettiActive,
      }}
      mission={{
        missionDialogOpen,
        setMissionDialogOpen,
        missionDismissOverlayActive,
        missionDismissSheetOpen,
        missionDismissLevel: introState?.level ?? null,
        missionLevelSummary,
        onMissionDismissSheetClosed: handleMissionDismissSheetClosed,
      }}
      tutorial={{
        levelPlayTutorialBlocksBoardPointer: levelPlayTutorial.blocksBoardPointer,
        levelPlayTutorialChromeKey,
        tileCardsMenuDisabled,
        tileCardsButtonTutorialPromoted:
          levelPlayTutorial.requiresTileCardsMenuClick,
      }}
      quizChrome={quizChrome}
      particleBursts={particleBursts}
      domRefs={{
        missionBarTrackRef,
        missionProgressRowRef,
        puzzleCountBadgeRef,
        tileCardsButtonRef,
        headerSpongeRef,
      }}
    />
  );

  const quizCmsSettled =
    cmsLevelStatus === "success" || cmsLevelStatus === "error";

  let sessionContent: ReactNode;
  if (!playSurfaceReady) {
    sessionContent = (
      <>
        {levelPlayChrome}
        <FullscreenLoadingScreen progress={assetPreload.progress} />
        {discardProgressOverlay}
      </>
    );
  } else if (quizScreenFromUrl && (!quizCmsSettled || !cmsLevel?.quiz)) {
    sessionContent = (
      <>
        {levelPlayChrome}
        <p className="sr-only" role="status">
          Quiz wird geladen …
        </p>
        {discardProgressOverlay}
      </>
    );
  } else {
    sessionContent = (
      <>
        {levelPlayChrome}
        <QuizCrownOverlay
          open={quizCrownDialogOpen}
          reducedMotion={reducedMotion}
          onOpenChange={setQuizCrownDialogOpen}
        />
        {discardProgressOverlay}
        <LevelPlayTutorialLayer
          tutorial={levelPlayTutorial}
          refs={{
            missionProgressRowRef,
            puzzleCountBadgeRef,
            tileCardsButtonRef,
            headerSpongeRef,
            gameBoardRef: designFrameRef,
          }}
          stripTiles={dropTargetHintTiles}
          maxPuzzleItems={cappedLevel.maximumTileCount}
          onTileCardsButtonClick={openFirstUnplacedTileDetail}
          libraryIntroSettled={libraryIntroSettled}
        />
      </>
    );
  }

  return (
    <LevelPlayConfigProvider value={configValue}>
      <LevelPlayBoardProvider value={boardValue}>
        <LevelPlayPhaseProvider value={phaseValue}>
          <LevelPlayScoringProvider value={scoringValue}>
            <LevelPlayCommandsProvider value={commandsValue}>
              {sessionContent}
              {transitionConfettiOverlay}
            </LevelPlayCommandsProvider>
          </LevelPlayScoringProvider>
        </LevelPlayPhaseProvider>
      </LevelPlayBoardProvider>
    </LevelPlayConfigProvider>
  );
}
