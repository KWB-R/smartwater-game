import { hasUnrevealedBonusLevels } from "@/features/map/mapBonusLevelUnlock";
import {
  isDistrictHighlightedOnMap,
  isDistrictPrimarySolved,
} from "@/features/map/mapDistrictProgress";
import { writeGallerySnapshot } from "@/features/level/gallery/levelGallerySnapshot";
import {
  levelCompletionStars,
} from "@/features/level/logic/levelBarCompletion";
import { isWinningMaxBarScore } from "@/features/level/logic/endPlacementFlow";
import {
  readQuizAnswerCorrect,
} from "@/features/level/logic/quizBarScore";
import type { GoalFocusDimension } from "@/features/level/types";
import {
  readLevelProgress,
  writeLevelProgress,
} from "@/features/level/levelProgress";
import {
  readLevelPlaySession,
  serializePlacedTiles,
} from "@/features/level/session/levelPlaySession";
import type { PlacedTile } from "@/features/level/logic/levelState";
import type { District } from "@/types/content";

export type PostLevelMapSnapshot = {
  mapDistrictWasUnhighlighted: boolean;
  mapDistrictNewlyFullySolved: boolean;
  mapRevealBonus: boolean;
  /** Zeigt an, ob der Marker vor dieser Runde bereits eine Quizkrone hatte. */
  mapMarkerWasLevelMaxBeforeRun: boolean;
};

export const EMPTY_POST_LEVEL_MAP_SNAPSHOT: PostLevelMapSnapshot = {
  mapDistrictWasUnhighlighted: false,
  mapDistrictNewlyFullySolved: false,
  mapRevealBonus: false,
  mapMarkerWasLevelMaxBeforeRun: false,
};

function buildPostLevelMapSnapshot(input: {
  district: District;
  priorHadCrownMarker: boolean;
  wasDistrictHighlighted: boolean;
  wasDistrictFullySolved: boolean;
}): PostLevelMapSnapshot {
  const nowFullySolved = isDistrictPrimarySolved(input.district);
  return {
    mapDistrictWasUnhighlighted: !input.wasDistrictHighlighted,
    mapDistrictNewlyFullySolved:
      !input.wasDistrictFullySolved && nowFullySolved,
    mapRevealBonus: hasUnrevealedBonusLevels(input.district),
    mapMarkerWasLevelMaxBeforeRun: input.priorHadCrownMarker,
  };
}

export type PersistProgressAfterPuzzleInput = {
  levelKey: string;
  placementScoreSum: number;
  barMaxScore: number;
  minimumScorePercentage: number | null;
  placedTiles: ReadonlyArray<PlacedTile>;
  district: District | null;
};

export type PersistProgressAfterPuzzleResult = {
  mapReturnFromStarCount: 0 | 1 | 2 | 3;
  mapSnapshot: PostLevelMapSnapshot | null;
  /** Sterne des ersten Puzzleabschlusses beziehungsweise bisheriger Stand bei Wiederholung. */
  stars: 1 | 2 | 3;
  isFirstCompletion: boolean;
};

/** Bereits angezeigte Sterne vor dieser Runde; null Sterne bei noch offenem Level. */
function priorDisplayedStars(
  prior: ReturnType<typeof readLevelProgress>,
): 0 | 1 | 2 | 3 {
  if (prior?.completed !== true) {
    return 0;
  }
  return prior.stars === 0 ? 1 : prior.stars;
}

/**
 * Beim ersten Puzzleabschluss die Sterne speichern.
 * Bei Wiederholungen erst am endgültigen Abschluss Sterne und Krone ersetzen.
 */
export function persistProgressAfterPuzzle(
  input: PersistProgressAfterPuzzleInput,
): PersistProgressAfterPuzzleResult {
  const prior = readLevelProgress(input.levelKey);
  const wasDistrictHighlighted =
    input.district != null
      ? isDistrictHighlightedOnMap(input.district)
      : false;
  const wasDistrictFullySolved =
    input.district != null ? isDistrictPrimarySolved(input.district) : false;
  const stars = levelCompletionStars(
    input.placementScoreSum,
    input.barMaxScore,
    input.minimumScorePercentage,
  );
  const priorDisplayed = priorDisplayedStars(prior);
  const placementAtMax = isWinningMaxBarScore(
    input.placementScoreSum,
    input.barMaxScore,
  );
  const isFirstCompletion = prior?.completed !== true;

  if (isFirstCompletion) {
    writeLevelProgress(input.levelKey, {
      completed: true,
      stars,
      puzzleMaxBarScoreAchieved: placementAtMax,
    });
  }

  writeGallerySnapshot(
    input.levelKey,
    serializePlacedTiles(input.placedTiles),
  );

  const mapSnapshot =
    isFirstCompletion && input.district
      ? buildPostLevelMapSnapshot({
          district: input.district,
          priorHadCrownMarker: prior?.quizPassed === true,
          wasDistrictHighlighted,
          wasDistrictFullySolved,
        })
      : null;

  return {
    mapReturnFromStarCount: priorDisplayed,
    mapSnapshot,
    stars: isFirstCompletion
      ? stars
      : ((priorDisplayed > 0 ? priorDisplayed : stars) as 1 | 2 | 3),
    isFirstCompletion,
  };
}

export type PersistProgressAfterQuizInput = {
  levelKey: string;
  placementScoreSum: number;
  barMaxScore: number;
  minimumScorePercentage: number | null;
  placedTiles: ReadonlyArray<PlacedTile>;
  district: District | null;
  levelHasQuiz: boolean;
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>;
  computeWinningTotalBarScore: () => number;
  /** true, wenn das Puzzle in dieser Runde erstmals abgeschlossen wurde. */
  runIsFirstCompletion: boolean;
};

export type PersistProgressAfterQuizResult = {
  quizCorrect: boolean;
  mapReturnFromStarCount: 0 | 1 | 2 | 3;
  mapSnapshot: PostLevelMapSnapshot | null;
  stars: 1 | 2 | 3;
  isFirstCompletion: boolean;
  /** Nach dem Abschluss die Sterne und bei Quiz-Erfolg die Krone in der Detailansicht zeigen. */
  shouldCelebrateDetail: boolean;
};

/**
 * Ersetzt am endgültigen Abschluss Sterne, Krone und Maximalwertung durch das neue Ergebnis.
 * Das gilt auch für ein schlechteres Ergebnis bei einer Wiederholung.
 */
export function persistProgressAfterQuiz(
  input: PersistProgressAfterQuizInput,
): PersistProgressAfterQuizResult {
  const totalBarScore = input.computeWinningTotalBarScore();
  const session = readLevelPlaySession(input.levelKey);
  const quizCorrect =
    input.levelHasQuiz &&
    readQuizAnswerCorrect(session, input.missionGoalDimensions) === true;
  const prior = readLevelProgress(input.levelKey);
  const wasDistrictHighlighted =
    input.district != null
      ? isDistrictHighlightedOnMap(input.district)
      : false;
  const wasDistrictFullySolved =
    input.district != null ? isDistrictPrimarySolved(input.district) : false;
  const isFirstCompletion = input.runIsFirstCompletion;
  const stars = levelCompletionStars(
    totalBarScore,
    input.barMaxScore,
    input.minimumScorePercentage,
  );
  const placementAtMax = isWinningMaxBarScore(
    input.placementScoreSum,
    input.barMaxScore,
  );
  const maxBarThisRun = placementAtMax && quizCorrect;
  // Eine Krone auf der Karte bedeutet quizPassed.
  const priorHadCrownMarker = prior?.quizPassed === true;

  writeLevelProgress(input.levelKey, {
    completed: true,
    stars,
    puzzleMaxBarScoreAchieved: placementAtMax,
    maxBarScoreAchieved: maxBarThisRun,
    quizPassed: quizCorrect,
  });
  writeGallerySnapshot(
    input.levelKey,
    serializePlacedTiles(input.placedTiles),
  );

  const mapSnapshot =
    isFirstCompletion && input.district
      ? buildPostLevelMapSnapshot({
          district: input.district,
          priorHadCrownMarker,
          wasDistrictHighlighted,
          wasDistrictFullySolved,
        })
      : null;

  return {
    quizCorrect,
    // Die Sternanimation auch nach einer Wiederholung bei null beginnen.
    mapReturnFromStarCount: 0,
    mapSnapshot,
    stars,
    isFirstCompletion,
    shouldCelebrateDetail: true,
  };
}
