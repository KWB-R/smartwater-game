import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import type { NavigateFunction } from "react-router-dom";
import type { BoardScene } from "@/components/features/level/scene/pixi/BoardScene";
import type { ParticleBurstState } from "@/components/features/level/play/LevelPlacingGame";
import { publishLevelHeaderSnapshot } from "@/features/level/levelHeaderSnapshot";
import type { Level, Tile } from "@/features/level/types";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import { clearLevelPlaySession } from "@/features/level/session/levelPlaySession";
import type { LevelIntroLocationState } from "@/routes/level/navigation/levelIntroTypes";
import { goToLevelPhase } from "@/routes/level/navigation/levelPlayNavigate";
import { LEVEL_PLAY_PHASE } from "@/routes/level/navigation/levelPlayPhase";
import type { LevelPlayBoardDispatch } from "@/features/level/play/levelPlayBoardState";

type UseLevelRestartFlowConfig = {
  levelKey: string;
  /** URL-Segment für `goToLevelPhase` (slug). */
  levelRouteId: string;
  cappedLevel: Level;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  barMaxScore: number;
  introState: LevelIntroLocationState | null;
  navigate: NavigateFunction;
};

type UseLevelRestartFlowRefs = {
  playAdvancedRef: MutableRefObject<boolean>;
  preQuizGateOpenTimerRef: MutableRefObject<number | null>;
  pendingSocketTilesRef: MutableRefObject<Tile[]>;
  pendingComboAfterBonusRef: MutableRefObject<boolean>;
  comboRevealTileIdsRef: MutableRefObject<number[]>;
  reducedMotionForSceneRef: MutableRefObject<boolean>;
};

type UseLevelRestartFlowScene = {
  boardSceneRef: RefObject<BoardScene | null>;
  boardSceneReady: boolean;
};

type UseLevelRestartFlowActions = {
  disarmPostPlacementGate: () => void;
  clearRewardTimers: () => void;
  clearComboRevealTimer: () => void;
  dismissComboUi: () => void;
  finishComboRevealBurst: () => void;
  closeDetail: () => void;
  setQuizUnderlayActive: Dispatch<SetStateAction<boolean>>;
  setMissionDialogOpen: Dispatch<SetStateAction<boolean>>;
  bumpLibraryIntroRunId: () => void;
  setParticleBursts: Dispatch<SetStateAction<ParticleBurstState[]>>;
  clearPostPlacementConfetti: () => void;
  dispatchBoard: LevelPlayBoardDispatch;
};

type UseLevelRestartFlowArgs = {
  config: UseLevelRestartFlowConfig;
  refs: UseLevelRestartFlowRefs;
  scene: UseLevelRestartFlowScene;
  actions: UseLevelRestartFlowActions;
};

export function useLevelRestartFlow({
  config: {
    levelKey,
    levelRouteId,
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
}: UseLevelRestartFlowArgs): () => void {
  return useCallback(() => {
    clearLevelPlaySession(levelKey);
    playAdvancedRef.current = false;

    clearRewardTimers();
    if (preQuizGateOpenTimerRef.current != null) {
      window.clearTimeout(preQuizGateOpenTimerRef.current);
      preQuizGateOpenTimerRef.current = null;
    }
    disarmPostPlacementGate();
    clearComboRevealTimer();
    dismissComboUi();
    finishComboRevealBurst();
    clearPostPlacementConfetti();

    // Die Navigation zur Platzierungsphase schließt die aus der URL abgeleiteten Overlays.
    // Nur die Vergleichsansicht unter dem Quiz hat einen eigenen Zustand.
    setQuizUnderlayActive(false);
    setMissionDialogOpen(false);
    bumpLibraryIntroRunId();
    setParticleBursts([]);
    pendingSocketTilesRef.current = [];
    pendingComboAfterBonusRef.current = false;
    comboRevealTileIdsRef.current = [];

    dispatchBoard({ type: "levelRestarted", cappedLevel, puzzleItems });

    closeDetail();

    publishLevelHeaderSnapshot(levelKey, {
      hasPlayed: false,
      phase: "placing",
      displayScore: 0,
      maxScore: barMaxScore,
      placedCount: 0,
      maxPuzzleItems: cappedLevel.maximumTileCount,
      draggingTile: false,
      placementRewardBlocking: false,
    });

    const scene = boardSceneRef.current;
    if (scene && boardSceneReady) {
      void scene.rebuildPlaced([], reducedMotionForSceneRef.current, {
        skipPlacementIntro: true,
      });
    }

    goToLevelPhase(navigate, levelRouteId, LEVEL_PLAY_PHASE.placing, {
      replace: true,
      state: introState ?? undefined,
    });
  }, [
    levelKey,
    levelRouteId,
    playAdvancedRef,
    preQuizGateOpenTimerRef,
    pendingSocketTilesRef,
    pendingComboAfterBonusRef,
    comboRevealTileIdsRef,
    disarmPostPlacementGate,
    cappedLevel,
    puzzleItems,
    barMaxScore,
    boardSceneRef,
    boardSceneReady,
    reducedMotionForSceneRef,
    introState,
    navigate,
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
  ]);
}
