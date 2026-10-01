import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { NavigateFunction } from "react-router-dom";
import { useLatestRef } from "@/hooks/useLatestRef";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import type { Level, PointMatrix } from "@/features/level/types";
import type { PlacedTile } from "@/features/level/logic/levelState";
import type { LevelPlayBoardDispatch } from "@/features/level/play/levelPlayBoardState";
import { emptyPoints } from "@/features/level/logic/points";
import { sumPlacedTilesPlacementScore } from "@/features/level/logic/placementScoring";
import { resolveEndOfPlacementFlow } from "@/features/level/logic/endPlacementFlow";
import type { PlacementScoreSteps } from "@/features/level/logic/placementRewardSteps";
import {
  deserializePlacedTiles,
  persistLevelPlaySession,
  readLevelPlaySession,
  serializePlacedTiles,
} from "@/features/level/session/levelPlaySession";
import {
  LEVEL_PLAY_PHASE,
  type LevelPlayPhase,
} from "@/routes/level/navigation/levelPlayPhase";
import { goToLevelPhase } from "@/routes/level/navigation/levelPlayNavigate";
import { readLevelPlayLocationState } from "@/routes/level/navigation/levelPlayLocationState";
import type { LevelIntroLocationState } from "@/routes/level/navigation/levelIntroTypes";
import { postPlacementCelebrationFallbackMs } from "@/features/level/play/postPlacementCelebrationTiming";
import {
  POST_PLACEMENT_LOOP_LEAD_MS,
  POST_PLACEMENT_PUZZLE_FAILED_PANEL_EXTRA_DELAY_MS,
  PRE_QUIZ_DURING_CONFETTI_MS,
  postPlacementPreQuizDelayAfterCelebrationMs,
  resolvePostPlacementSpritesheetLoopGateDelayMs,
} from "@/features/level/play/postPlacementLoopGateTiming";
import { armPlacementLoopNearEndWatch } from "@/components/features/level/scene/pixi/placementVideo";
import { hasConfiguredIntro } from "@/components/features/level/scene/pixi/placementVideoMedia";
import type { Tile } from "@/features/level/types";
import {
  canResolvePhaseHydration,
  levelPhaseHydrationKey,
  resolvePhaseRestoreIntent,
  resolvePhaseUrlCorrection,
  shouldOpenPostPlacementGate,
  type LevelPhaseHydration,
} from "@/features/level/play/levelPhaseSyncPlan";

/** Ersatzwartezeit, wenn Videometadaten oder Rückmeldungen zur Wiederholung ausbleiben. */
const POST_PLACEMENT_LOOP_GATE_FALLBACK_MS = 8_000;

type UseLevelPhaseSyncRoute = {
  locationState: unknown;
  locationSearch: string;
  playPhase: LevelPlayPhase;
  quizScreenFromUrl: boolean;
  /** documentId für gespeicherte Sitzung und Fortschritt. */
  levelKey: string;
  /** Slug in der Levelroute für die Navigation. */
  levelRouteId: string;
  introState: LevelIntroLocationState | null;
  navigate: NavigateFunction;
};

type UseLevelPhaseSyncBoard = {
  cappedLevel: Level;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  placedTilesForSceneRef: MutableRefObject<PlacedTile[]>;
  playAdvancedRef: MutableRefObject<boolean>;
  levelPoints: PointMatrix;
  currentMaxTileCount: number;
  barMaxScore: number;
  minimumScorePercentage: number | null;
  comboDialogOpen: boolean;
  dispatchBoard: LevelPlayBoardDispatch;
};

type UseLevelPhaseSyncPhase = {
  preQuizGateOpen: boolean;
  puzzleFailedOpen: boolean;
  shareScreenActive: boolean;
  shareScreenOpen: boolean;
  shareComboPartIds: string[];
  /** Ergebnis der Wiederherstellung; null bedeutet noch nicht versucht. */
  phaseBoardHydrated: boolean | null;
  setPhaseHydration: Dispatch<SetStateAction<LevelPhaseHydration | null>>;
  preQuizGateOpenTimerRef: MutableRefObject<number | null>;
  dismissComboUi: () => void;
};

type UseLevelPhaseSyncArgs = {
  route: UseLevelPhaseSyncRoute;
  board: UseLevelPhaseSyncBoard;
  phase: UseLevelPhaseSyncPhase;
};

export type ArmPostPlacementGateOptions = {
  steps: PlacementScoreSteps;
  reducedMotion: boolean;
  /** Zuletzt platziertes Teil, dessen Video oder Spritesheet den Abschlussübergang steuert. */
  tile: Tile;
  placementKey: string;
  /**
   * Startet Konfetti und Jubelsound sofort.
   * Nach PRE_QUIZ_DURING_CONFETTI_MS wird der Vergleich während des Effekts eingeblendet.
   */
  onConfettiStart?: () => void;
};

export type UseLevelPhaseSyncResult = {
  armPostPlacementGateAfterCelebration: (
    options: ArmPostPlacementGateOptions,
  ) => void;
  onPlacementParticleBurstsFinished: () => void;
  disarmPostPlacementGate: () => void;
};

export function useLevelPhaseSync({
  route: {
    locationState,
    locationSearch,
    playPhase,
    quizScreenFromUrl,
    levelKey,
    levelRouteId,
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
}: UseLevelPhaseSyncArgs): UseLevelPhaseSyncResult {
  const playLocationState = readLevelPlayLocationState(locationState);
  const postPlacementGateArmedRef = useRef(false);
  const waitForLoopNearEndRef = useRef(false);
  const cancelLoopNearEndWatchRef = useRef<(() => void) | null>(null);

  const preQuizGateOpenRef = useLatestRef(preQuizGateOpen);
  const puzzleFailedOpenRef = useLatestRef(puzzleFailedOpen);
  const shareScreenActiveRef = useLatestRef(shareScreenActive);
  const comboDialogOpenRef = useLatestRef(comboDialogOpen);

  const clearPostPlacementGateTimer = useCallback(() => {
    if (preQuizGateOpenTimerRef.current != null) {
      window.clearTimeout(preQuizGateOpenTimerRef.current);
      preQuizGateOpenTimerRef.current = null;
    }
  }, [preQuizGateOpenTimerRef]);

  const clearLoopNearEndWatch = useCallback(() => {
    cancelLoopNearEndWatchRef.current?.();
    cancelLoopNearEndWatchRef.current = null;
    waitForLoopNearEndRef.current = false;
  }, []);

  const disarmPostPlacementGate = useCallback(() => {
    postPlacementGateArmedRef.current = false;
    clearPostPlacementGateTimer();
    clearLoopNearEndWatch();
  }, [clearPostPlacementGateTimer, clearLoopNearEndWatch]);

  const tryOpenPostPlacementGate = useCallback(() => {
    const mayOpen = shouldOpenPostPlacementGate({
      armed: postPlacementGateArmedRef.current,
      preQuizGateOpen: preQuizGateOpenRef.current,
      puzzleFailedOpen: puzzleFailedOpenRef.current,
      shareScreenActive: shareScreenActiveRef.current,
      placedCount: placedTilesForSceneRef.current.length,
      currentMaxTileCount,
      comboDialogOpen: comboDialogOpenRef.current,
    });
    if (!mayOpen) {
      return;
    }

    postPlacementGateArmedRef.current = false;
    clearPostPlacementGateTimer();
    clearLoopNearEndWatch();

    dismissComboUi();

    playAdvancedRef.current = true;
    const placementScoreAtEnd = sumPlacedTilesPlacementScore(
      placedTilesForSceneRef.current,
      puzzleItems,
      cappedLevel,
    );
    const endFlow = resolveEndOfPlacementFlow(
      placementScoreAtEnd,
      barMaxScore,
      minimumScorePercentage,
    );
    persistLevelPlaySession(levelKey, {
      levelKey,
      levelPoints,
      placedTiles: serializePlacedTiles(placedTilesForSceneRef.current),
      currentMaxTileCount,
      barMaxScore,
    });
    if (endFlow.kind === "failed") {
      preQuizGateOpenTimerRef.current = window.setTimeout(() => {
        preQuizGateOpenTimerRef.current = null;
        goToLevelPhase(navigate, levelRouteId, LEVEL_PLAY_PHASE.failed, {
          replace: true,
          state: introState,
        });
      }, POST_PLACEMENT_PUZZLE_FAILED_PANEL_EXTRA_DELAY_MS);
      return;
    }
    const sessionAfterPersist = readLevelPlaySession(levelKey);
    const celebrationKind =
      endFlow.kind === "winning" ? ("max" as const) : ("closeEnough" as const);
    if (sessionAfterPersist) {
      persistLevelPlaySession(levelKey, {
        ...sessionAfterPersist,
        barMaxScore,
        quizPoints: emptyPoints(),
        postPlacementCelebration: celebrationKind,
      });
    }
    // Der Wechsel zur Pre-Quiz-URL öffnet die Vergleichsansicht.
    goToLevelPhase(navigate, levelRouteId, LEVEL_PLAY_PHASE.preQuiz, {
      replace: true,
      state: introState,
    });
  }, [
    placedTilesForSceneRef,
    currentMaxTileCount,
    dismissComboUi,
    playAdvancedRef,
    puzzleItems,
    cappedLevel,
    barMaxScore,
    minimumScorePercentage,
    levelKey,
    levelRouteId,
    levelPoints,
    introState,
    navigate,
    clearPostPlacementGateTimer,
    clearLoopNearEndWatch,
    preQuizGateOpenRef,
    puzzleFailedOpenRef,
    shareScreenActiveRef,
    comboDialogOpenRef,
  ]);

  const armPostPlacementGateAfterCelebration = useCallback(
    (options: ArmPostPlacementGateOptions) => {
      postPlacementGateArmedRef.current = true;
      clearPostPlacementGateTimer();
      clearLoopNearEndWatch();

      const celebrationMs = postPlacementCelebrationFallbackMs({
        reducedMotion: options.reducedMotion,
        steps: options.steps,
      });
      const confettiDuringTransition = options.onConfettiStart != null;

      // Konfetti und Jubelsound sofort starten; den Vergleich währenddessen einblenden.
      options.onConfettiStart?.();

      const armFallbackTimer = (delayMs: number) => {
        clearPostPlacementGateTimer();
        preQuizGateOpenTimerRef.current = window.setTimeout(() => {
          preQuizGateOpenTimerRef.current = null;
          tryOpenPostPlacementGate();
        }, delayMs);
      };

      const openGate = () => {
        cancelLoopNearEndWatchRef.current = null;
        tryOpenPostPlacementGate();
      };

      if (options.reducedMotion) {
        armFallbackTimer(celebrationMs);
        return;
      }

      // Vor dem Vergleich das Intro vollständig und den Beginn der Wiederholung abspielen.
      // Erst nach Intro-Ende planen, da der Vergleich die Brettvideos pausiert.
      if (confettiDuringTransition) {
        waitForLoopNearEndRef.current = true;
        const celebrationStartedAtMs = performance.now();

        const schedulePreQuizDuringConfetti = () => {
          const elapsed = performance.now() - celebrationStartedAtMs;
          armFallbackTimer(
            postPlacementPreQuizDelayAfterCelebrationMs(elapsed),
          );
        };

        if (options.tile.placementVideo) {
          cancelLoopNearEndWatchRef.current = armPlacementLoopNearEndWatch(
            options.placementKey,
            () => {
              /* Die Wiederholung muss hier nicht vollständig auslaufen. */
            },
            POST_PLACEMENT_LOOP_LEAD_MS,
            schedulePreQuizDuringConfetti,
          );
          armFallbackTimer(
            Math.max(
              PRE_QUIZ_DURING_CONFETTI_MS,
              POST_PLACEMENT_LOOP_GATE_FALLBACK_MS,
            ),
          );
        } else {
          armFallbackTimer(PRE_QUIZ_DURING_CONFETTI_MS);
        }
        return;
      }

      // Vor dem Fehlerpanel die erste Video- oder Spritesheet-Wiederholung ausspielen.
      const sheetDelayMs = resolvePostPlacementSpritesheetLoopGateDelayMs(
        options.tile,
      );
      if (sheetDelayMs != null) {
        waitForLoopNearEndRef.current = true;
        armFallbackTimer(Math.max(celebrationMs, sheetDelayMs));
        return;
      }

      if (!options.tile.placementVideo) {
        armFallbackTimer(celebrationMs);
        return;
      }

      const hasIntro = hasConfiguredIntro(options.tile.placementVideo);
      const armedAtMs = performance.now();
      waitForLoopNearEndRef.current = true;
      cancelLoopNearEndWatchRef.current = armPlacementLoopNearEndWatch(
        options.placementKey,
        () => {
          /* Intro vollständig abspielen; anschließend reicht der Beginn der Wiederholung. */
        },
        POST_PLACEMENT_LOOP_LEAD_MS,
        () => {
          if (hasIntro) {
            openGate();
            return;
          }
          const elapsed = performance.now() - armedAtMs;
          armFallbackTimer(Math.max(0, celebrationMs - elapsed));
        },
      );

      armFallbackTimer(
        Math.max(celebrationMs, POST_PLACEMENT_LOOP_GATE_FALLBACK_MS),
      );
    },
    [
      clearPostPlacementGateTimer,
      clearLoopNearEndWatch,
      preQuizGateOpenTimerRef,
      tryOpenPostPlacementGate,
    ],
  );

  const onPlacementParticleBurstsFinished = useCallback(() => {
    // Das Platzierungsvideo oder Spritesheet steuert den Übergang zur Abschlussansicht.
    if (waitForLoopNearEndRef.current) {
      return;
    }
    tryOpenPostPlacementGate();
  }, [tryOpenPostPlacementGate]);

  useEffect(() => () => disarmPostPlacementGate(), [disarmPostPlacementGate]);

  const restoreBoardFromSession = useCallback(() => {
    if (playAdvancedRef.current) {
      return true;
    }
    const session = readLevelPlaySession(levelKey);
    if (!session) {
      return false;
    }
    const restored = deserializePlacedTiles(cappedLevel, session.placedTiles);
    if (restored.length === 0) {
      return false;
    }
    playAdvancedRef.current = true;
    dispatchBoard({
      type: "sessionRestored",
      placedTiles: restored,
      levelPoints: session.levelPoints,
      maxTileCount: session.currentMaxTileCount,
    });
    return true;
  }, [levelKey, cappedLevel, playAdvancedRef, dispatchBoard]);

  // Das Brett für Overlay-Phasen aus der gespeicherten Sitzung wiederherstellen.
  // Der Provider leitet die Ansicht aus URL und Wiederherstellungsergebnis ab.
  useEffect(() => {
    const intent = resolvePhaseRestoreIntent(
      playPhase,
      playLocationState?.postQuizWinning === true,
    );
    if (intent === null) {
      return;
    }
    if (
      !canResolvePhaseHydration({
        playAdvanced: playAdvancedRef.current,
        levelTileCount: cappedLevel.tiles.length,
        hasSession: readLevelPlaySession(levelKey) !== null,
      })
    ) {
      return;
    }
    const restored = restoreBoardFromSession();
    if (intent === "quiz") {
      if (restored) {
        // Den Vergleich erst in onQuizSheetEntered entfernen, wenn das Quiz vollständig darüberliegt.

        dismissComboUi();
      }
      return;
    }
    const key = levelPhaseHydrationKey(levelKey, playPhase);
    setPhaseHydration((prev) =>
      prev?.key === key && prev.restored === restored
        ? prev
        : { key, restored },
    );
  }, [
    playLocationState?.postQuizWinning,
    playPhase,
    restoreBoardFromSession,
    levelKey,
    cappedLevel.tiles.length,
    playAdvancedRef,
    dismissComboUi,
    setPhaseHydration,
  ]);

  useEffect(() => {
    const action = resolvePhaseUrlCorrection({
      quizScreenFromUrl,
      playPhase,
      postQuizWinning: playLocationState?.postQuizWinning === true,
      phaseBoardHydrated,
      shareScreenOpen,
      shareComboPartIds,
      locationSearch,
    });
    if (action.kind === "none") {
      return;
    }
    goToLevelPhase(navigate, levelRouteId, action.phase, {
      replace: true,
      state: introState,
      search: action.search,
    });
  }, [
    quizScreenFromUrl,
    playPhase,
    playLocationState?.postQuizWinning,
    phaseBoardHydrated,
    shareScreenOpen,
    navigate,
    levelRouteId,
    introState,
    shareComboPartIds,
    locationSearch,
  ]);

  return {
    armPostPlacementGateAfterCelebration,
    onPlacementParticleBurstsFinished,
    disarmPostPlacementGate,
  };
}
