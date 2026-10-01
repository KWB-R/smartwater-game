import { useEffect, type RefObject } from "react";
import type { BoardScene } from "@/components/features/level/scene/pixi/BoardScene";
import type { PlacedTile } from "@/features/level/logic/levelState";
import type { Tile } from "@/features/level/types";
import type { LevelEndAnimationSpec } from "@/features/level/mappers/levelFromConfig";

type UseLevelBoardSceneSyncScene = {
  boardSceneRef: RefObject<BoardScene | null>;
  boardSceneReady: boolean;
  reducedMotionForSceneRef: RefObject<boolean>;
  resolvePlacedTilesForScene: () => PlacedTile[];
};

type UseLevelBoardSceneSyncFlags = {
  shareUsesComboVideo: boolean;
  preQuizGateOpen: boolean;
  reducedMotion: boolean;
  quizScreenFromUrl: boolean;
  placedTilesLength: number;
  shareScreenActive: boolean;
  puzzleFailedOpen: boolean;
};

type UseLevelBoardSceneSyncArgs = {
  scene: UseLevelBoardSceneSyncScene;
  flags: UseLevelBoardSceneSyncFlags;
  levelTiles: Tile[];
  endAnimations: ReadonlyArray<LevelEndAnimationSpec>;
  boardSceneStaticFingerprint: string;
  placedTilesSceneFingerprint: string;
  shareBoardSceneFingerprint: string;
};

export function useLevelBoardSceneSync({
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
    placedTilesLength,
    shareScreenActive,
    puzzleFailedOpen,
  },
  levelTiles,
  endAnimations,
  boardSceneStaticFingerprint,
  placedTilesSceneFingerprint,
  shareBoardSceneFingerprint,
}: UseLevelBoardSceneSyncArgs): void {
  useEffect(() => {
    if (shareUsesComboVideo || !boardSceneReady) {
      return;
    }
    const scene = boardSceneRef.current;
    if (!scene) {
      return;
    }
    scene.warmPlacementPreloads(levelTiles);
    const placed = resolvePlacedTilesForScene();
    void scene.rebuildPlaced(placed, reducedMotionForSceneRef.current, {
      skipPlacementIntro: true,
    });
  }, [
    shareUsesComboVideo,
    boardSceneReady,
    levelTiles,
    boardSceneRef,
    resolvePlacedTilesForScene,
    boardSceneStaticFingerprint,
    reducedMotionForSceneRef,
  ]);

  useEffect(() => {
    if (shareUsesComboVideo) {
      return;
    }
    const scene = boardSceneRef.current;
    if (!scene) {
      return;
    }
    const placed = resolvePlacedTilesForScene();
    void scene.rebuildPlaced(placed, reducedMotionForSceneRef.current, {
      skipPlacementIntro: true,
    });
  }, [
    shareUsesComboVideo,
    reducedMotion,
    resolvePlacedTilesForScene,
    boardSceneStaticFingerprint,
    boardSceneRef,
    reducedMotionForSceneRef,
  ]);

  useEffect(() => {
    const shouldPausePixi = shareUsesComboVideo || preQuizGateOpen;
    if (!shouldPausePixi || !boardSceneReady) {
      return;
    }
    const scene = boardSceneRef.current;
    if (!scene) {
      return;
    }
    scene.setAppRenderingPaused(true);
    return () => {
      scene.setAppRenderingPaused(false);
    };
  }, [
    shareUsesComboVideo,
    preQuizGateOpen,
    boardSceneReady,
    boardSceneRef,
  ]);

  const placedBoardPersistPhase =
    !quizScreenFromUrl &&
    !shareUsesComboVideo &&
    (placedTilesLength > 0 || (shareScreenActive && endAnimations.length > 0)) &&
    // Beim Wechsel zum Vergleich die Szene erhalten, damit das Puzzle nicht kurz verschwindet.
    (puzzleFailedOpen || shareScreenActive);

  useEffect(() => {
    if (!placedBoardPersistPhase) {
      return;
    }
    if (!boardSceneReady) {
      return;
    }
    const scene = boardSceneRef.current;
    if (!scene) {
      return;
    }
    const toRender = resolvePlacedTilesForScene();
    if (toRender.length === 0) {
      return;
    }
    if (shareScreenActive && endAnimations.length > 0) {
      scene.warmPlacementPreloads([toRender[toRender.length - 1]!.tile]);
    }
    void scene.rebuildPlaced(toRender, reducedMotionForSceneRef.current, {
      skipPlacementIntro: true,
    });
  }, [
    placedBoardPersistPhase,
    boardSceneReady,
    placedTilesSceneFingerprint,
    shareBoardSceneFingerprint,
    reducedMotion,
    boardSceneRef,
    resolvePlacedTilesForScene,
    shareScreenActive,
    shareUsesComboVideo,
    endAnimations,
    reducedMotionForSceneRef,
  ]);
}
