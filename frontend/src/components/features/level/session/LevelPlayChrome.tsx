import {
  useCallback,
  useMemo,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/cn";
import type { DistrictLevelSummary } from "@/types/content";
import type { Tile } from "@/features/level/types";
import type { ParticleBurstState } from "@/components/features/level/play/LevelPlacingGame";
import { Button } from "@/components/ui/Button";
import type { LevelSessionChromePatch } from "@/components/features/level/session/levelSessionChromeContext";
import { useLevelSessionChrome } from "@/components/features/level/session/levelSessionChromeContext";
import { LEVEL_BACKGROUND_REFERENCE_HEIGHT, LEVEL_BACKGROUND_REFERENCE_WIDTH } from "@/features/level/services/loadLevelBundle";
import { LevelMissionHeaderBar } from "@/components/features/level/play/LevelMissionHeaderBar";
import { DropTargetHints } from "@/components/features/level/DropTargetHints";
import { LevelLibraryPuzzleBadgeOverlay } from "@/components/features/level/library/LevelLibraryPuzzleBadgeOverlay";
import { LevelBeforeAfterPreQuizSheet } from "@/components/features/level/play/LevelBeforeAfterPreQuizSheet";
import { LevelPuzzleFailedPanel } from "@/components/features/level/play/LevelPuzzleFailedPanel";
import { LevelShareDock } from "@/components/features/level/play/LevelShareDock";
import { LevelShareComboVideo } from "@/components/features/level/play/LevelShareComboVideo";
import { LevelMissionDismissSheet } from "@/components/features/level/mission/LevelMissionDismissSheet";
import { LevelMissionMenuSheet } from "@/components/features/level/mission/LevelMissionMenuSheet";
import { LevelPlacingDock } from "@/components/features/level/session/LevelPlacingDock";
import { preQuizGateOpenFrom } from "@/features/level/play/levelPhaseSyncPlan";
import {
  buildPlayLevelChromeSyncKey,
  buildPreloadLevelChromeSyncKey,
} from "@/features/level/play/levelChromeSyncKey";
import {
  useLevelPlayBoard,
  useLevelPlayCommands,
  useLevelPlayConfig,
  useLevelPlayPhase,
  useLevelPlayScoring,
} from "@/components/features/level/session/levelPlaySessionContext";

type QuizChromeForPage = {
  chromePatch: LevelSessionChromePatch | null;
  chromeSyncKey: string | null;
  sceneStack: ReactNode;
  showMascotCrown?: boolean;
  headerScore?: number;
};

type LevelPlayChromeLibrary = {
  detailStripTiles: Tile[];
  libraryStripLoading: boolean;
  librarySkeletonSlotCount: number;
  letterByTileId: Map<number, string>;
  detailTile: Tile | null;
  libraryIntroEnterTileIds: ReadonlySet<number>;
  libraryIntroBlocking: boolean;
  /** Änderungen müssen levelChromeSyncKey erneuern, damit die Ablageziele aktualisiert werden. */
  libraryIntroSettled: boolean;
  placedTileIdsForHints: ReadonlySet<number>;
  /** Noch nicht platzierte Puzzleteile für Bibliothek und Ablagehinweise. */
  dropTargetHintTiles: Tile[];
};

type LevelPlayChromeShare = {
  shareFileVideoUrl: string | null;
  shareUsesComboVideo: boolean;
  comboShareVideoUrl: string | null;
  comboShareVideoPosterUrl: string | null;
};

type LevelPlayChromePhase = {
  beforeAfterBackgroundUrl: string | null;
  beforeAfterFinishedImageUrl: string | null;
  beforeAfterVideoUrl: string | null;
  /** Konfetti vom letzten platzierten Teil bis zum Vergleich vor dem Quiz. */
  postPlacementConfettiActive: boolean;
};

type LevelPlayChromeMission = {
  missionDialogOpen: boolean;
  setMissionDialogOpen: (open: boolean) => void;
  missionDismissOverlayActive: boolean;
  missionDismissSheetOpen: boolean;
  missionDismissLevel: DistrictLevelSummary | null;
  missionLevelSummary: DistrictLevelSummary | null;
  onMissionDismissSheetClosed: () => void;
};

type LevelPlayChromeTutorial = {
  levelPlayTutorialBlocksBoardPointer: boolean;
  levelPlayTutorialChromeKey: string;
  tileCardsMenuDisabled: boolean;
  /** Kachel-Infos-Button über Tutorial-Overlay (Detail-Schritt). */
  tileCardsButtonTutorialPromoted?: boolean;
};

type LevelPlayChromeDomRefs = {
  missionBarTrackRef: RefObject<HTMLDivElement | null>;
  missionProgressRowRef: RefObject<HTMLDivElement | null>;
  puzzleCountBadgeRef: RefObject<HTMLSpanElement | null>;
  tileCardsButtonRef: RefObject<HTMLButtonElement | null>;
  headerSpongeRef: RefObject<HTMLButtonElement | null>;
};

type LevelPlayChromeProps = {
  assetPreloadReady: boolean;
  preloadLibraryDock: ReactNode;
  library: LevelPlayChromeLibrary;
  share: LevelPlayChromeShare;
  phase: LevelPlayChromePhase;
  mission: LevelPlayChromeMission;
  tutorial: LevelPlayChromeTutorial;
  quizChrome: QuizChromeForPage;
  particleBursts: readonly ParticleBurstState[];
  domRefs: LevelPlayChromeDomRefs;
};

/**
 * Stellt Header, Ablage, Overlays und Sheets der Spielphase bereit.
 * Die Komponente rendert diese Elemente über den Context in der LevelSessionShell.
 */
export function LevelPlayChrome({
  assetPreloadReady,
  preloadLibraryDock,
  library: {
    detailStripTiles,
    libraryStripLoading,
    librarySkeletonSlotCount,
    letterByTileId,
    detailTile,
    libraryIntroEnterTileIds,
    libraryIntroBlocking,
    libraryIntroSettled,
    placedTileIdsForHints,
    dropTargetHintTiles,
  },
  share: {
    shareFileVideoUrl,
    shareUsesComboVideo,
    comboShareVideoUrl,
    comboShareVideoPosterUrl,
  },
  phase: {
    beforeAfterBackgroundUrl,
    beforeAfterFinishedImageUrl,
    beforeAfterVideoUrl,
    postPlacementConfettiActive,
  },
  mission: {
    missionDialogOpen,
    setMissionDialogOpen,
    missionDismissOverlayActive,
    missionDismissSheetOpen,
    missionDismissLevel,
    missionLevelSummary,
    onMissionDismissSheetClosed,
  },
  tutorial: {
    levelPlayTutorialBlocksBoardPointer,
    levelPlayTutorialChromeKey,
    tileCardsMenuDisabled,
    tileCardsButtonTutorialPromoted = false,
  },
  quizChrome,
  particleBursts,
  domRefs: {
    missionBarTrackRef,
    missionProgressRowRef,
    puzzleCountBadgeRef,
    tileCardsButtonRef,
    headerSpongeRef,
  },
}: LevelPlayChromeProps) {
  // Konfiguration, Brett, Phase, Punkte und Aktionen aus den jeweiligen Contexts lesen.
  const {
    levelKey,
    districtName,
    missionLabel,
    cappedLevel,
    puzzleItems,
    missionGoalDimensions,
    boardSceneReady,
    reducedMotion,
  } = useLevelPlayConfig();
  const { boardState: board, currentMaxTileCount } = useLevelPlayBoard();
  const { levelUiPhase: uiPhase } = useLevelPlayPhase();
  const {
    headerBarScore,
    placementScoreSum,
    barMaxScore,
    minimumScorePercentage,
    showWinningMaxCelebration,
  } = useLevelPlayScoring();
  const {
    onShareContinue,
    onComboDialogOpenChange,
    onComboDialogClosed,
    onThumbPointerDown,
    onOpenTileCardsMenu,
    onDetailClose,
    onDetailSelectTile,
    onParticleBurstComplete,
    onRestartLevel,
    onExitPuzzleFailedToMap,
    onGoToQuiz,
  } = useLevelPlayCommands();

  // Stabile boolesche Werte aus dem Phasenzustand ableiten.
  const quizScreenFromUrl = uiPhase.kind === "quiz";
  const shareScreenActive = uiPhase.kind === "share";
  const preQuizGateOpen = preQuizGateOpenFrom(uiPhase);
  const beforeAfterGateActive = uiPhase.kind === "preQuiz";
  const puzzleFailedOpen = uiPhase.kind === "failed";
  const endGameBoardOverlayActive = puzzleFailedOpen;

  const confettiFromPlacement = postPlacementConfettiActive;

  const shareFinishedImageUrl =
    beforeAfterFinishedImageUrl ?? comboShareVideoPosterUrl;
  const levelShareable = missionLevelSummary?.shareable !== false;

  const shareDock = useMemo(
    () => (
      <LevelShareDock
        shareFileVideoUrl={shareFileVideoUrl}
        finishedImageUrl={shareFinishedImageUrl}
        levelName={missionLevelSummary?.name}
        shareable={levelShareable}
        continueAction={
          <Button grow className="max-w-md" onClick={onShareContinue}>
            weiter
          </Button>
        }
      />
    ),
    [
      shareFileVideoUrl,
      shareFinishedImageUrl,
      missionLevelSummary?.name,
      levelShareable,
      onShareContinue,
    ],
  );

  const boardOverlayNode = useMemo((): ReactNode => {
    if (shareUsesComboVideo && comboShareVideoUrl) {
      return (
        <LevelShareComboVideo
          src={comboShareVideoUrl}
          posterSrc={comboShareVideoPosterUrl}
          reducedMotion={reducedMotion}
        />
      );
    }
    if (shareScreenActive) {
      return null;
    }
    const showPuzzleBadge =
      !quizScreenFromUrl &&
      !puzzleFailedOpen &&
      !preQuizGateOpen &&
      !shareScreenActive;
    return showPuzzleBadge ? (
      <LevelLibraryPuzzleBadgeOverlay
        puzzlePlaced={board.placedTiles.length}
        maxPuzzleItems={cappedLevel.maximumTileCount}
        score={headerBarScore}
        maxScore={barMaxScore}
        badgeRef={puzzleCountBadgeRef}
        tileCardsButtonRef={tileCardsButtonRef}
        onOpenTileCardsMenu={onOpenTileCardsMenu}
        tileCardsMenuDisabled={tileCardsMenuDisabled}
        tileCardsButtonTutorialPromoted={tileCardsButtonTutorialPromoted}
        draggingTileId={board.draggingTileId}
        reducedMotion={reducedMotion}
      />
    ) : null;
  }, [
    shareUsesComboVideo,
    comboShareVideoUrl,
    comboShareVideoPosterUrl,
    shareScreenActive,
    reducedMotion,
    quizScreenFromUrl,
    puzzleFailedOpen,
    preQuizGateOpen,
    board.placedTiles.length,
    cappedLevel.maximumTileCount,
    headerBarScore,
    barMaxScore,
    board.draggingTileId,
    puzzleCountBadgeRef,
    tileCardsButtonRef,
    onOpenTileCardsMenu,
    tileCardsMenuDisabled,
    tileCardsButtonTutorialPromoted,
  ]);

  const boardChromeNode = useMemo(
    () =>
      shareScreenActive ||
      puzzleFailedOpen ||
      preQuizGateOpen
        ? null
        : (
            <DropTargetHints
              tiles={dropTargetHintTiles}
              letterByTileId={letterByTileId}
              placedTileIds={placedTileIdsForHints}
              dropTargetSocketsRevealed={libraryIntroSettled}
              reducedMotion={reducedMotion}
              showDebugLabels={import.meta.env.DEV}
              refW={LEVEL_BACKGROUND_REFERENCE_WIDTH}
              refH={LEVEL_BACKGROUND_REFERENCE_HEIGHT}
            />
          ),
    [
      shareScreenActive,
      puzzleFailedOpen,
      preQuizGateOpen,
      dropTargetHintTiles,
      letterByTileId,
      placedTileIdsForHints,
      libraryIntroSettled,
      reducedMotion,
    ],
  );

  const placingDock = useMemo(
    () => (
      <LevelPlacingDock
        level={cappedLevel}
        puzzleItems={puzzleItems}
        missionGoalDimensions={missionGoalDimensions}
        board={board}
        availableTiles={dropTargetHintTiles}
        detailStripTiles={detailStripTiles}
        libraryStripLoading={libraryStripLoading}
        librarySkeletonSlotCount={librarySkeletonSlotCount}
        letterByTileId={letterByTileId}
        boardSceneReady={boardSceneReady}
        currentMaxTileCount={currentMaxTileCount}
        barDisplayScore={headerBarScore}
        barMaxScore={barMaxScore}
        detailTile={detailTile}
        reducedMotion={reducedMotion}
        particleBursts={particleBursts}
        libraryIntroEnterTileIds={libraryIntroEnterTileIds}
        libraryIntroBlocking={libraryIntroBlocking}
        onComboDialogOpenChange={onComboDialogOpenChange}
        onComboDialogClosed={onComboDialogClosed}
        onThumbPointerDown={onThumbPointerDown}
        onDetailClose={onDetailClose}
        onDetailSelectTile={onDetailSelectTile}
        onParticleBurstComplete={onParticleBurstComplete}
      />
    ),
    [
      cappedLevel,
      puzzleItems,
      missionGoalDimensions,
      board,
      dropTargetHintTiles,
      detailStripTiles,
      libraryStripLoading,
      librarySkeletonSlotCount,
      letterByTileId,
      boardSceneReady,
      currentMaxTileCount,
      headerBarScore,
      barMaxScore,
      detailTile,
      reducedMotion,
      particleBursts,
      libraryIntroEnterTileIds,
      libraryIntroBlocking,
      onComboDialogOpenChange,
      onComboDialogClosed,
      onThumbPointerDown,
      onDetailClose,
      onDetailSelectTile,
      onParticleBurstComplete,
    ],
  );

  const missionDismissStack = useMemo(() => {
    if (!missionDismissOverlayActive || !missionDismissLevel) {
      return null;
    }
    return (
      <LevelMissionDismissSheet
        level={missionDismissLevel}
        open={missionDismissSheetOpen}
        reducedMotion={reducedMotion}
        onClosed={onMissionDismissSheetClosed}
      />
    );
  }, [
    missionDismissOverlayActive,
    missionDismissLevel,
    missionDismissSheetOpen,
    reducedMotion,
    onMissionDismissSheetClosed,
  ]);

  const closeMissionSheet = useCallback(() => {
    setMissionDialogOpen(false);
  }, [setMissionDialogOpen]);

  const missionMenuSheet = useMemo(() => {
    if (!missionLevelSummary || !missionDialogOpen) {
      return null;
    }
    return (
      <LevelMissionMenuSheet
        level={missionLevelSummary}
        open={missionDialogOpen}
        reducedMotion={reducedMotion}
        onClose={closeMissionSheet}
      />
    );
  }, [
    missionLevelSummary,
    missionDialogOpen,
    reducedMotion,
    closeMissionSheet,
  ]);

  const missionSheetBlocksBoard =
    (missionDismissOverlayActive && missionDismissStack != null) ||
    (missionDialogOpen && missionMenuSheet != null);

  const preQuizBottomSheet = useMemo(() => {
    // Die Vergleichsansicht bleibt sichtbar, bis das Quiz vollständig eingeblendet ist.
    if (!preQuizGateOpen) {
      return null;
    }
    return (
      <LevelBeforeAfterPreQuizSheet
        open={preQuizGateOpen}
        reducedMotion={reducedMotion}
        backgroundImageUrl={beforeAfterBackgroundUrl}
        finishedImageUrl={beforeAfterFinishedImageUrl}
        videoUrl={beforeAfterVideoUrl}
        shareFileVideoUrl={shareFileVideoUrl}
        levelName={missionLevelSummary?.name}
        shareable={levelShareable}
        onContinueToQuiz={onGoToQuiz}
      />
    );
  }, [
    preQuizGateOpen,
    reducedMotion,
    beforeAfterBackgroundUrl,
    beforeAfterFinishedImageUrl,
    beforeAfterVideoUrl,
    shareFileVideoUrl,
    missionLevelSummary?.name,
    levelShareable,
    onGoToQuiz,
  ]);

  const puzzleFailedPanel = useMemo(() => {
    if (!puzzleFailedOpen || shareScreenActive || quizScreenFromUrl) {
      return null;
    }
    return (
      <LevelPuzzleFailedPanel
        onRestart={onRestartLevel}
        onExit={onExitPuzzleFailedToMap}
      />
    );
  }, [
    puzzleFailedOpen,
    shareScreenActive,
    quizScreenFromUrl,
    onRestartLevel,
    onExitPuzzleFailedToMap,
  ]);

  const boardSceneStackNode =
    missionDismissStack ??
    missionMenuSheet ??
    // Die Fragmentstruktur stabil halten, damit das Vergleichsvideo beim Quiz-Einstieg weiterläuft.
    (preQuizGateOpen || quizScreenFromUrl || puzzleFailedPanel ? (
      <>
        {preQuizBottomSheet}
        {quizScreenFromUrl ? quizChrome.sceneStack : null}
        {puzzleFailedPanel}
      </>
    ) : null);

  const levelChromePatch = useMemo((): LevelSessionChromePatch => {
    if (!assetPreloadReady) {
      return {
        topBar: null,
        header: (
          <LevelMissionHeaderBar
            levelKey={levelKey}
            districtName={districtName}
            missionLabel={missionLabel}
            score={Math.max(headerBarScore, placementScoreSum)}
            maxScore={barMaxScore}
            minimumScorePercentage={minimumScorePercentage}
            progressBarRef={missionBarTrackRef}
            missionProgressRowRef={missionProgressRowRef}
            headerSpongeRef={headerSpongeRef}
            suppressScoreParticles
            scoreGainLabel={board.barScoreGainLabel}
          />
        ),
        dock: preloadLibraryDock,
        boardOverlay: boardOverlayNode,
        boardSceneStack: missionDismissStack,
        shellVariant: "play",
        boardPointerEnabled: false,
        boardAriaLabel: "Level-Hintergrund",
        boardRole: "img",
      };
    }
    if (quizChrome.chromePatch && quizScreenFromUrl) {
      const quizHeaderScore = Math.max(
        headerBarScore,
        placementScoreSum,
        quizChrome.headerScore ?? 0,
      );
      return {
        ...quizChrome.chromePatch,
        // Den bisherigen Header behalten, damit ein neuer Quiz-Header die Punkte nicht kurz auf null setzt.
        header: (
          <LevelMissionHeaderBar
            levelKey={levelKey}
            districtName={districtName}
            missionLabel={missionLabel}
            score={quizHeaderScore}
            maxScore={barMaxScore}
            minimumScorePercentage={minimumScorePercentage}
            progressBarRef={missionBarTrackRef}
            missionProgressRowRef={missionProgressRowRef}
            headerSpongeRef={headerSpongeRef}
            suppressScoreParticles
            scoreGainLabel={
              quizScreenFromUrl ? null : board.barScoreGainLabel
            }
            showMascotCrown={quizChrome.showMascotCrown === true}
          />
        ),
        // Dieselbe Stack-Instanz verwenden, damit die Vergleichsansicht eingebunden bleibt.
        boardSceneStack: boardSceneStackNode,
        // Die Ablage bis zur vollständigen Quiz-Einblendung im Layout halten.
        dock: preQuizGateOpen ? placingDock : quizChrome.chromePatch.dock,
        // Das Puzzle trägt die Nachher-Seite, solange deren Medien noch laden.
        sceneClassName: preQuizGateOpen ? "" : quizChrome.chromePatch.sceneClassName,
      };
    }
    return {
      topBar: null,
      header: shareScreenActive ? null : (
        <LevelMissionHeaderBar
          levelKey={levelKey}
          districtName={districtName}
          missionLabel={missionLabel}
          score={headerBarScore}
          maxScore={barMaxScore}
          minimumScorePercentage={minimumScorePercentage}
          progressBarRef={missionBarTrackRef}
          missionProgressRowRef={missionProgressRowRef}
          headerSpongeRef={headerSpongeRef}
          suppressScoreParticles
          scoreGainLabel={board.barScoreGainLabel}
          showMaxScoreCrown={
            shareScreenActive && showWinningMaxCelebration
          }
        />
      ),
      // Die Ablage im Vergleich erhalten; der Footer wird darüber eingeblendet.
      dock: shareScreenActive ? shareDock : placingDock,
      boardSceneStack: boardSceneStackNode,
      boardOverlay: boardOverlayNode,
      boardCelebrationBackdrop: null,
      boardChrome: boardChromeNode,
      sceneClassName: shareScreenActive
        ? cn(
            "level-scene--share",
            shareUsesComboVideo && "level-scene--share-combo-video",
          )
        : endGameBoardOverlayActive
          ? "level-scene--pre-quiz level-scene--puzzle-failed"
          : missionDialogOpen
            ? "level-scene--mission-sheet"
            : "",
      shellVariant: shareScreenActive ? "share" : "play",
      boardPointerEnabled:
        !missionSheetBlocksBoard &&
        !shareScreenActive &&
        !endGameBoardOverlayActive &&
        !beforeAfterGateActive &&
        !levelPlayTutorialBlocksBoardPointer,
      boardAriaLabel: "Karte zum Platzieren der Kacheln per Drag-and-drop.",
      boardRole: "application",
    };
  }, [
    assetPreloadReady,
    preloadLibraryDock,
    missionDismissStack,
    missionSheetBlocksBoard,
    boardSceneStackNode,
    quizChrome.chromePatch,
    quizChrome.headerScore,
    quizChrome.showMascotCrown,
    quizScreenFromUrl,
    preQuizGateOpen,
    placingDock,
    levelKey,
    districtName,
    missionLabel,
    headerBarScore,
    board.barScoreGainLabel,
    placementScoreSum,
    barMaxScore,
    minimumScorePercentage,
    missionBarTrackRef,
    missionProgressRowRef,
    headerSpongeRef,
    missionDialogOpen,
    shareDock,
    boardOverlayNode,
    boardChromeNode,
    shareScreenActive,
    shareUsesComboVideo,
    showWinningMaxCelebration,
    endGameBoardOverlayActive,
    beforeAfterGateActive,
    reducedMotion,
    levelPlayTutorialBlocksBoardPointer,
  ]);

  const levelChromeSyncKey = useMemo(() => {
    if (!assetPreloadReady) {
      return buildPreloadLevelChromeSyncKey({
        levelKey,
        districtName,
        missionLabel,
        librarySkeletonSlotCount,
        missionDismissOverlayActive,
        missionDismissSheetOpen,
      });
    }
    if (quizChrome.chromeSyncKey && quizScreenFromUrl) {
      return [
        quizChrome.chromeSyncKey,
        String(Math.max(headerBarScore, placementScoreSum)),
        quizChrome.showMascotCrown ? "1" : "0",
      ].join("|");
    }
    return buildPlayLevelChromeSyncKey({
      quizScreenFromUrl,
      levelKey,
      districtName,
      missionLabel,
      headerBarScore,
      barScoreGainLabel: board.barScoreGainLabel,
      barMaxScore,
      placedTilesLength: board.placedTiles.length,
      maximumTileCount: cappedLevel.maximumTileCount,
      missionDialogOpen,
      preQuizGateOpen,
      postPlacementConfettiActive: confettiFromPlacement,
      puzzleFailedOpen,
      shareScreenActive,
      showWinningMaxCelebration,
      reducedMotion,
      draggingTileId: board.draggingTileId,
      detailTileId: detailTile?.id,
      comboDialogOpen: board.comboDialogOpen,
      placementRewardBlocking: board.placementRewardBlocking,
      currentMaxTileCount,
      missionDismissOverlayActive,
      missionDismissSheetOpen,
      availableTilesCount: detailStripTiles.length,
      levelTilesLength: cappedLevel.tiles.length,
      levelPlayTutorialChromeKey,
      libraryIntroSettled,
    });
  }, [
    assetPreloadReady,
    librarySkeletonSlotCount,
    missionDismissOverlayActive,
    missionDismissSheetOpen,
    quizChrome.chromeSyncKey,
    quizChrome.showMascotCrown,
    quizScreenFromUrl,
    levelKey,
    districtName,
    missionLabel,
    headerBarScore,
    placementScoreSum,
    board.barScoreGainLabel,
    barMaxScore,
    board.placedTiles.length,
    cappedLevel.maximumTileCount,
    missionDialogOpen,
    preQuizGateOpen,
    confettiFromPlacement,
    puzzleFailedOpen,
    shareScreenActive,
    showWinningMaxCelebration,
    reducedMotion,
    board.draggingTileId,
    detailTile?.id,
    board.comboDialogOpen,
    board.placementRewardBlocking,
    currentMaxTileCount,
    detailStripTiles.length,
    cappedLevel.tiles.length,
    levelPlayTutorialChromeKey,
    libraryIntroSettled,
  ]);

  useLevelSessionChrome(levelChromePatch, levelChromeSyncKey);

  return null;
}
