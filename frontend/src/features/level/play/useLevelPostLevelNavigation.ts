import { useCallback, useState, type MutableRefObject } from "react";
import type { NavigateFunction } from "react-router-dom";
import { districtRouteId } from "@/features/map/berlinMapLayout";
import { mapDistrictDetailLocation } from "@/features/map/mapDistrictDetailUrl";
import { createMapReturnFromShareLocationState } from "@/features/map/mapPostLevelCelebration";
import {
  clearMapReturnFromShareState,
  stashMapReturnFromShareState,
} from "@/features/map/mapPostLevelCelebrationStorage";
import { clearLevelPlaySession } from "@/features/level/session/levelPlaySession";
import { readLevelPlayContext } from "@/features/level/session/levelPlayContext";
import { withViewTransition } from "@/lib/navigateWithViewTransition";
import { playSound } from "@/lib/sound/globalSound";
import { ROUTES } from "@/routes/paths";
import { buildLevelQuizNavigateState } from "@/routes/level/navigation/levelQuizNavigateState";
import type { LevelIntroLocationState } from "@/routes/level/navigation/levelIntroTypes";
import { goToLevelPhase } from "@/routes/level/navigation/levelPlayNavigate";
import { LEVEL_PLAY_PHASE } from "@/routes/level/navigation/levelPlayPhase";
import type { PostLevelMapSnapshot } from "@/features/level/play/levelProgressPersistence";
import type { District } from "@/types/content";

type UseLevelPostLevelNavigationArgs = {
  levelKey: string;
  /** URL-Segment für Phase-Navigation (slug, nicht documentId). */
  levelRouteId: string;
  navigate: NavigateFunction;
  introState: LevelIntroLocationState | null;
  levelPlayAssetsDistrict: District | null | undefined;
  postLevelDistrictRef: MutableRefObject<District | null>;
  postLevelDistrictRouteIdRef: MutableRefObject<string | null>;
  postLevelMapSnapshotRef: MutableRefObject<PostLevelMapSnapshot>;
  postLevelBestStarsRef: MutableRefObject<1 | 2 | 3>;
  postLevelShouldCelebrateRef: MutableRefObject<boolean>;
  leaveWithoutDiscardPromptRef: MutableRefObject<(action: () => void) => void>;
  persistProgressAfterQuiz: () => boolean;
  bumpPlaySessionQuizRevision: () => void;
  setQuizUnderlayActive: (active: boolean) => void;
  levelHasQuiz: boolean;
};

export function useLevelPostLevelNavigation({
  levelKey,
  levelRouteId,
  navigate,
  introState,
  levelPlayAssetsDistrict,
  postLevelDistrictRef,
  postLevelDistrictRouteIdRef,
  postLevelMapSnapshotRef,
  postLevelBestStarsRef,
  postLevelShouldCelebrateRef,
  leaveWithoutDiscardPromptRef,
  persistProgressAfterQuiz,
  bumpPlaySessionQuizRevision,
  setQuizUnderlayActive,
  levelHasQuiz,
}: UseLevelPostLevelNavigationArgs) {
  const [quizCrownDialogOpen, setQuizCrownDialogOpen] = useState(false);

  const exitPuzzleFailedToMap = useCallback(() => {
    // Nur die laufende Sitzung entfernen; gespeicherten Fortschritt und Galeriebilder behalten.
    clearLevelPlaySession(levelKey);
    leaveWithoutDiscardPromptRef.current(() => {
      navigate(ROUTES.map, withViewTransition());
    });
  }, [levelKey, navigate, leaveWithoutDiscardPromptRef]);

  const openQuizCrownOverlay = useCallback(() => {
    // Den Kroneneffekt nach einer richtigen Quizantwort mit dem Sammelsound begleiten.
    playSound("points.collect");
    setQuizCrownDialogOpen(true);
  }, []);

  const resolveDistrictRouteId = useCallback((): string | null => {
    const district =
      introState?.district ??
      postLevelDistrictRef.current ??
      levelPlayAssetsDistrict ??
      null;
    return (
      (district ? districtRouteId(district) : null) ??
      postLevelDistrictRouteIdRef.current ??
      readLevelPlayContext(levelKey)?.districtRouteId ??
      null
    );
  }, [
    introState?.district,
    levelKey,
    levelPlayAssetsDistrict,
    postLevelDistrictRef,
    postLevelDistrictRouteIdRef,
  ]);

  const navigateToMapAfterLevel = useCallback(() => {
    const routeId = resolveDistrictRouteId();
    if (!routeId) {
      navigate(ROUTES.map, withViewTransition());
      return;
    }

    // Ohne neues Ergebnis die normale Detailansicht mit statischen Sternen und Startaktion zeigen.
    if (!postLevelShouldCelebrateRef.current) {
      clearMapReturnFromShareState();
      navigate(
        mapDistrictDetailLocation(routeId, {
          detail: true,
          levelKey: levelRouteId,
        }),
        withViewTransition({
          replace: true,
          state: { levelStartKey: levelKey },
        }),
      );
      return;
    }

    const starCount = postLevelBestStarsRef.current;
    const mapSnap = postLevelMapSnapshotRef.current;
    const returnState = createMapReturnFromShareLocationState({
      levelStartKey: levelKey,
      districtRouteId: routeId,
      starCount,
      fromStarCount: 0,
      bonusAfterDismiss: mapSnap.mapRevealBonus,
      mapDistrictWasUnhighlighted: mapSnap.mapDistrictWasUnhighlighted,
      mapDistrictNewlyFullySolved: mapSnap.mapDistrictNewlyFullySolved,
      mapRevealBonus: mapSnap.mapRevealBonus,
      mapMarkerWasLevelMaxBeforeRun: mapSnap.mapMarkerWasLevelMaxBeforeRun,
    });
    stashMapReturnFromShareState(returnState);
    navigate(ROUTES.map, withViewTransition({ state: returnState }));
  }, [
    levelKey,
    levelRouteId,
    navigate,
    postLevelBestStarsRef,
    postLevelMapSnapshotRef,
    postLevelShouldCelebrateRef,
    resolveDistrictRouteId,
  ]);

  const finishQuizAndGoToMapDetail = useCallback(() => {
    bumpPlaySessionQuizRevision();
    setQuizUnderlayActive(false);
    persistProgressAfterQuiz();
    leaveWithoutDiscardPromptRef.current(navigateToMapAfterLevel);
  }, [
    bumpPlaySessionQuizRevision,
    setQuizUnderlayActive,
    persistProgressAfterQuiz,
    navigateToMapAfterLevel,
    leaveWithoutDiscardPromptRef,
  ]);

  const goToQuiz = useCallback(() => {
    if (!levelHasQuiz) {
      finishQuizAndGoToMapDetail();
      return;
    }
    setQuizUnderlayActive(true);
    goToLevelPhase(navigate, levelRouteId, LEVEL_PLAY_PHASE.quiz, {
      replace: true,
      state: buildLevelQuizNavigateState(introState),
    });
  }, [
    introState,
    levelRouteId,
    navigate,
    levelHasQuiz,
    finishQuizAndGoToMapDetail,
    setQuizUnderlayActive,
  ]);

  const clearPreQuizUnderlay = useCallback(() => {
    setQuizUnderlayActive(false);
  }, [setQuizUnderlayActive]);

  const handleShareContinue = useCallback(() => {
    navigateToMapAfterLevel();
  }, [navigateToMapAfterLevel]);

  return {
    quizCrownDialogOpen,
    setQuizCrownDialogOpen,
    openQuizCrownOverlay,
    exitPuzzleFailedToMap,
    finishQuizAndGoToMapDetail,
    goToQuiz,
    clearPreQuizUnderlay,
    handleShareContinue,
    navigateToMapPostLevelCelebration: navigateToMapAfterLevel,
  };
}
