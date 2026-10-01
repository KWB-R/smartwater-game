import { useCallback, useMemo, useState } from "react";
import { maxPlacementWeightedScore } from "@/features/level/logic/calculateMaxPuzzleScore";
import { levelCompletionStars } from "@/features/level/logic/levelBarCompletion";
import {
  readQuizAnswerCorrect,
  totalBarScoreAfterQuiz,
} from "@/features/level/logic/quizBarScore";
import { sumPlacedTilesPlacementScore } from "@/features/level/logic/placementScoring";
import { readLevelPlaySession } from "@/features/level/session/levelPlaySession";
import type { PlacedTile } from "@/features/level/logic/levelState";
import type { GoalFocusDimension, Level } from "@/features/level/types";
import type { DistrictLevelPuzzleItem } from "@/types/content";

type UseLevelScoringModelArgs = {
  placedTiles: ReadonlyArray<PlacedTile>;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  cappedLevel: Level;
  currentMaxTileCount: number;
  levelKey: string;
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>;
  minimumScorePercentage: number | null;
};

/** Berechnet Punkte und Sterne je Phase. Animierte Zwischenwerte bestimmt die Spielsitzung. */
export function useLevelScoringModel({
  placedTiles,
  puzzleItems,
  cappedLevel,
  currentMaxTileCount,
  levelKey,
  missionGoalDimensions,
  minimumScorePercentage,
}: UseLevelScoringModelArgs) {
  const [playSessionQuizRevision, setPlaySessionQuizRevision] = useState(0);

  const placementScoreSum = useMemo(
    () => sumPlacedTilesPlacementScore(placedTiles, puzzleItems, cappedLevel),
    [placedTiles, puzzleItems, cappedLevel],
  );

  const barMaxScore = useMemo(() => {
    const maxItems =
      currentMaxTileCount > cappedLevel.maximumTileCount
        ? cappedLevel.maximumTileCount + 1
        : cappedLevel.maximumTileCount;
    const cap = maxPlacementWeightedScore(
      puzzleItems,
      cappedLevel,
      maxItems,
    );
    return Math.max(1, cap);
  }, [currentMaxTileCount, cappedLevel, puzzleItems]);

  const computeWinningTotalBarScore = useCallback(() => {
    const session = readLevelPlaySession(levelKey);
    const maxBar = Math.max(barMaxScore, session?.barMaxScore ?? 0);
    const quizCorrect = readQuizAnswerCorrect(session, missionGoalDimensions);
    return totalBarScoreAfterQuiz(placementScoreSum, maxBar, quizCorrect);
  }, [placementScoreSum, levelKey, missionGoalDimensions, barMaxScore]);

  const winningTotalBarScore = useMemo(() => {
    void playSessionQuizRevision;
    return computeWinningTotalBarScore();
  }, [computeWinningTotalBarScore, playSessionQuizRevision]);

  const winningCompletionStars = useMemo(
    () =>
      levelCompletionStars(
        winningTotalBarScore,
        barMaxScore,
        minimumScorePercentage,
      ),
    [winningTotalBarScore, barMaxScore, minimumScorePercentage],
  );

  const bumpPlaySessionQuizRevision = useCallback(() => {
    setPlaySessionQuizRevision((revision) => revision + 1);
  }, []);

  return {
    placementScoreSum,
    barMaxScore,
    computeWinningTotalBarScore,
    winningTotalBarScore,
    winningCompletionStars,
    bumpPlaySessionQuizRevision,
  };
}

/** Zeigt während der Animation deren Zwischenwert, sonst den Ruhewert der Phase. */
export function resolveHeaderBarScore(input: {
  shareScreenActive: boolean;
  quizScreenFromUrl: boolean;
  winningTotalBarScore: number;
  quizHeaderScore: number;
  placementScoreSum: number;
  barScoreAnimationOverride: number | null;
  beforeAfterGateActive: boolean;
}): { barDisplayScore: number; headerBarScore: number } {
  const restingBarScore = input.shareScreenActive
    ? input.winningTotalBarScore
    : input.quizScreenFromUrl
      ? // Bei kurzzeitig leerer Sitzung den bereits erreichten Platzierungspunktestand erhalten.
        Math.max(input.quizHeaderScore, input.placementScoreSum)
      : input.placementScoreSum;
  const barDisplayScore =
    input.barScoreAnimationOverride ?? restingBarScore;
  // Im Vergleich und Quiz den Balken mindestens auf den erspielten Platzierungspunkten halten.
  const headerBarScore =
    input.beforeAfterGateActive || input.quizScreenFromUrl
      ? Math.max(barDisplayScore, input.placementScoreSum)
      : barDisplayScore;
  return { barDisplayScore, headerBarScore };
}
