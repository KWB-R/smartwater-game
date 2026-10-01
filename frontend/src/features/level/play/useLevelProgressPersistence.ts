import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import type { PlacedTile } from "@/features/level/logic/levelState";
import type { GoalFocusDimension } from "@/features/level/types";
import type { District } from "@/types/content";
import {
  EMPTY_POST_LEVEL_MAP_SNAPSHOT,
  persistProgressAfterPuzzle as persistProgressAfterPuzzlePure,
  persistProgressAfterQuiz as persistProgressAfterQuizPure,
  type PostLevelMapSnapshot,
} from "@/features/level/play/levelProgressPersistence";

type UseLevelProgressPersistenceArgs = {
  levelKey: string;
  placementScoreSum: number;
  barMaxScore: number;
  minimumScorePercentage: number | null;
  placedTilesForSceneRef: MutableRefObject<PlacedTile[]>;
  postLevelDistrictRef: MutableRefObject<District | null>;
  mapReturnFromStarCountRef: MutableRefObject<0 | 1 | 2 | 3>;
  postLevelBestStarsRef: MutableRefObject<1 | 2 | 3>;
  postLevelShouldCelebrateRef: MutableRefObject<boolean>;
  postLevelIsFirstCompletionRef: MutableRefObject<boolean>;
  postLevelMapSnapshotRef: MutableRefObject<PostLevelMapSnapshot>;
  preQuizGateOpen: boolean;
  levelHasQuiz: boolean;
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>;
  computeWinningTotalBarScore: () => number;
};

export function useLevelProgressPersistence({
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
  levelHasQuiz,
  missionGoalDimensions,
  computeWinningTotalBarScore,
}: UseLevelProgressPersistenceArgs) {
  const persistProgressAfterPuzzle = useCallback(() => {
    const result = persistProgressAfterPuzzlePure({
      levelKey,
      placementScoreSum,
      barMaxScore,
      minimumScorePercentage,
      placedTiles: placedTilesForSceneRef.current,
      district: postLevelDistrictRef.current,
    });
    mapReturnFromStarCountRef.current = result.mapReturnFromStarCount;
    postLevelBestStarsRef.current = result.stars;
    postLevelIsFirstCompletionRef.current = result.isFirstCompletion;
    postLevelShouldCelebrateRef.current = result.isFirstCompletion;
    postLevelMapSnapshotRef.current =
      result.mapSnapshot ?? EMPTY_POST_LEVEL_MAP_SNAPSHOT;
  }, [
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
  ]);

  const puzzleProgressPersistedRef = useRef(false);

  useEffect(() => {
    if (!preQuizGateOpen) {
      puzzleProgressPersistedRef.current = false;
      return;
    }
    if (puzzleProgressPersistedRef.current) {
      return;
    }
    puzzleProgressPersistedRef.current = true;
    persistProgressAfterPuzzle();
  }, [preQuizGateOpen, persistProgressAfterPuzzle]);

  const persistProgressAfterQuiz = useCallback(() => {
    const result = persistProgressAfterQuizPure({
      levelKey,
      placementScoreSum,
      barMaxScore,
      minimumScorePercentage,
      placedTiles: placedTilesForSceneRef.current,
      district: postLevelDistrictRef.current,
      levelHasQuiz,
      missionGoalDimensions,
      computeWinningTotalBarScore,
      runIsFirstCompletion: postLevelIsFirstCompletionRef.current,
    });
    mapReturnFromStarCountRef.current = result.mapReturnFromStarCount;
    postLevelBestStarsRef.current = result.stars;
    postLevelShouldCelebrateRef.current = result.shouldCelebrateDetail;
    // Den ersten Puzzleabschluss als Grundlage behalten, wenn das Quiz keinen neuen Snapshot liefert.
    if (result.mapSnapshot) {
      postLevelMapSnapshotRef.current = result.mapSnapshot;
    }
    return result.quizCorrect;
  }, [
    computeWinningTotalBarScore,
    levelHasQuiz,
    levelKey,
    missionGoalDimensions,
    barMaxScore,
    minimumScorePercentage,
    placementScoreSum,
    placedTilesForSceneRef,
    postLevelDistrictRef,
    mapReturnFromStarCountRef,
    postLevelBestStarsRef,
    postLevelShouldCelebrateRef,
    postLevelIsFirstCompletionRef,
    postLevelMapSnapshotRef,
  ]);

  return {
    persistProgressAfterPuzzle,
    persistProgressAfterQuiz,
  };
}

export { EMPTY_POST_LEVEL_MAP_SNAPSHOT };
export type { PostLevelMapSnapshot };
