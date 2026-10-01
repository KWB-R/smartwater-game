import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { QuizViewPhase } from "@/components/features/level/QuizView";
import { publishLevelHeaderSnapshot } from "@/features/level/levelHeaderSnapshot";
import { emptyPoints } from "@/features/level/logic/points";
import { sumPlacedTilesPlacementScore } from "@/features/level/logic/placementScoring";
import {
  deserializePlacedTiles,
  persistLevelPlaySession,
  readLevelPlaySession,
} from "@/features/level/session/levelPlaySession";
import type { PointMatrix } from "@/features/level/types";
import type { GoalFocusDimension, Level } from "@/features/level/types";
import { placedTilesInCmsOrder } from "@/features/level/mappers/endAnimationPlacement";
import type {
  DistrictLevelPuzzleItem,
  DistrictLevelQuiz,
  LevelPlacementOrderEntry,
} from "@/types/content";
import { LevelMissionHeaderBar } from "@/components/features/level/play/LevelMissionHeaderBar";
import { LevelQuizSheet } from "@/components/features/level/play/LevelQuizSheet";
import { useLevelSessionBoard } from "@/components/features/level/session/levelSessionChromeContext";
import type { LevelSessionChromeState } from "@/components/features/level/session/levelSessionChromeContext";
import {
  quizPointsForSession,
  totalBarScoreAfterQuiz,
} from "@/features/level/logic/quizBarScore";
import { playSound } from "@/lib/sound/globalSound";
import { trackQuizAnswer } from "@/features/analytics/trackQuizAnswer";
type UseLevelQuizChromeArgs = {
  enabled: boolean;
  levelKey: string;
  /** CMS-Slug für Analytics (Fallback: levelKey). */
  levelSlug?: string | null;
  level: Level;
  cmsQuiz: DistrictLevelQuiz | null | undefined;
  puzzleItems: DistrictLevelPuzzleItem[];
  placementOrder: LevelPlacementOrderEntry[];
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>;
  districtName: string;
  missionLabel: string;
  reducedMotion: boolean;
  missionDialogOpen: boolean;
  setMissionDialogOpen: (open: boolean) => void;
  onQuizComplete: () => void;
  onQuizAnswerCorrect?: () => void;
  /** Nach der Quiz-Einblendung die Vergleichsansicht darunter entfernen. */
  onQuizSheetEntered?: () => void;
  /** false, solange die Vergleichsansicht noch sichtbar ist; das Brett bleibt während des Übergangs erhalten. */
  boardRebuildEnabled?: boolean;
  /** Live-Balken-Maximum (Session kann veraltet sein). */
  barMaxScore: number;
  minimumScorePercentage?: number | null;
  /** Aktueller Brettstand als Ersatzwert, wenn die Sitzung beim Quiz-Einstieg noch keine Punkte liefert. */
  placementScoreFallback?: number;
};

export function useLevelQuizChrome({
  enabled,
  levelKey,
  levelSlug,
  level,
  cmsQuiz,
  puzzleItems,
  placementOrder,
  districtName,
  missionLabel,
  reducedMotion,
  missionDialogOpen,
  setMissionDialogOpen,
  onQuizComplete,
  onQuizAnswerCorrect,
  onQuizSheetEntered,
  boardRebuildEnabled = true,
  barMaxScore: barMaxScoreProp,
  minimumScorePercentage,
  placementScoreFallback = 0,
}: UseLevelQuizChromeArgs): {
  headerScore: number;
  showMascotCrown: boolean;
  chromePatch: Partial<LevelSessionChromeState> | null;
  chromeSyncKey: string | null;
  sceneStack: ReactNode;
} {
  const session = readLevelPlaySession(levelKey);
  const sessionSyncKey = session
    ? [
        session.placedTiles.length,
        session.barMaxScore,
        session.quizAnswerCorrect === true ? "1" : "0",
      ].join("|")
    : "";
  const sessionPlacedCount = session?.placedTiles.length ?? 0;
  const { boardSceneRef, boardSceneReady } = useLevelSessionBoard();

  const [phase, setPhase] = useState<QuizViewPhase>("select");
  const [selectedAnswerId, setSelectedAnswerId] = useState<number | null>(null);
  const [quizPoints, setQuizPoints] = useState<PointMatrix | null>(null);
  const [quizAnswerCorrect, setQuizAnswerCorrect] = useState<boolean | null>(
    null,
  );
  const [quizSheetOpen, setQuizSheetOpen] = useState(enabled);

  useEffect(() => {
    if (enabled) {
      setQuizSheetOpen(true);
      return;
    }
    setQuizSheetOpen(false);
  }, [enabled]);

  const barMaxScore = Math.max(
    1,
    barMaxScoreProp,
    session?.barMaxScore ?? 0,
  );
  const placedTiles = useMemo(() => {
    const stored = readLevelPlaySession(levelKey);
    return stored ? deserializePlacedTiles(level, stored.placedTiles) : [];
  }, [levelKey, level, sessionSyncKey]);

  const placedTilesForScene = useMemo(
    () => placedTilesInCmsOrder(placedTiles, placementOrder),
    [placedTiles, placementOrder],
  );

  const placementScore = useMemo(
    () => sumPlacedTilesPlacementScore(placedTiles, puzzleItems, level),
    [placedTiles, puzzleItems, level],
  );

  const headerScore = useMemo(() => {
    const placementFloor = Math.max(placementScore, placementScoreFallback);
    if (!enabled || phase !== "feedback" || quizAnswerCorrect == null) {
      return placementFloor;
    }
    return Math.max(
      placementFloor,
      totalBarScoreAfterQuiz(
        placementScore,
        barMaxScore,
        quizAnswerCorrect,
      ),
    );
  }, [
    enabled,
    phase,
    quizAnswerCorrect,
    placementScore,
    placementScoreFallback,
    barMaxScore,
  ]);

  const placedTilesSceneFingerprint = useMemo(
    () =>
      placedTilesForScene
        .map((p) => `${p.placementKey}:${p.tile.id}`)
        .join("|"),
    [placedTilesForScene],
  );

  useLayoutEffect(() => {
    if (!enabled || !boardRebuildEnabled) {
      return;
    }
    const scene = boardSceneRef.current;
    if (!scene || !boardSceneReady) {
      return;
    }
    if (placedTiles.length === 0) {
      return;
    }
    void scene.rebuildPlaced(placedTilesForScene, reducedMotion, {
      skipPlacementIntro: true,
    });
  }, [
    enabled,
    boardRebuildEnabled,
    placedTilesSceneFingerprint,
    reducedMotion,
    boardSceneReady,
    boardSceneRef,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    publishLevelHeaderSnapshot(levelKey, {
      hasPlayed: true,
      phase: "quiz",
      displayScore: headerScore,
      maxScore: barMaxScore,
      placedCount: sessionPlacedCount,
      maxPuzzleItems: level.maximumTileCount,
      draggingTile: false,
      placementRewardBlocking: false,
      quizFeedback: phase === "feedback",
    });
  }, [
    enabled,
    levelKey,
    headerScore,
    barMaxScore,
    level.maximumTileCount,
    sessionSyncKey,
    phase,
  ]);

  useEffect(() => {
    if (!enabled) {
      setPhase("select");
      setSelectedAnswerId(null);
      setQuizPoints(null);
      setQuizAnswerCorrect(null);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (missionDialogOpen) {
      setMissionDialogOpen(false);
    }
  }, [enabled, missionDialogOpen, setMissionDialogOpen]);

  const handleQuizSheetEntered = useCallback(() => {
    onQuizSheetEntered?.();
  }, [onQuizSheetEntered]);

  const handleSubmitAnswer = useCallback(() => {
    if (!cmsQuiz || selectedAnswerId == null) {
      return;
    }
    const answerIndex = cmsQuiz.answers.findIndex(
      (a) => a.id === selectedAnswerId,
    );
    const answer =
      answerIndex >= 0 ? cmsQuiz.answers[answerIndex] : undefined;
    const correct = answer?.correctAnswer === true;
    const points = quizPointsForSession(
      placementScore,
      barMaxScore,
      correct,
    );
    // Der Kroneneffekt spielt points.collect; keinen zweiten Bestätigungssound darüberlegen.
    if (correct && onQuizAnswerCorrect) {
      onQuizAnswerCorrect();
    } else {
      playSound(correct ? "quiz.correct" : "quiz.wrong");
    }
    if (answerIndex >= 0) {
      trackQuizAnswer({
        levelSlug: levelSlug?.trim() || levelKey,
        answerIndex,
        isCorrect: correct,
      });
    }
    setQuizAnswerCorrect(correct);
    setQuizPoints(points);
    setPhase("feedback");
  }, [
    cmsQuiz,
    selectedAnswerId,
    barMaxScore,
    placementScore,
    onQuizAnswerCorrect,
    levelKey,
    levelSlug,
  ]);

  const finishQuizFromUi = useCallback(() => {
    // Die Antwort zuerst speichern, damit der Verlassen-Dialog den Quizversuch als abgeschlossen erkennt
    // und die Rückkehr zur Karte freigibt.
    const latest = readLevelPlaySession(levelKey) ?? session;
    if (latest) {
      persistLevelPlaySession(levelKey, {
        ...latest,
        barMaxScore,
        quizPoints: quizPoints ?? emptyPoints(),
        quizAnswerCorrect: quizAnswerCorrect ?? false,
      });
    }
    setQuizSheetOpen(false);
    onQuizComplete();
  }, [
    levelKey,
    session,
    barMaxScore,
    quizPoints,
    quizAnswerCorrect,
    onQuizComplete,
  ]);

  const quizFeedbackCorrect =
    phase === "feedback" && quizAnswerCorrect === true;

  const sceneStack = useMemo(() => {
    if (!enabled || !cmsQuiz) {
      return null;
    }
    return (
      <LevelQuizSheet
        quiz={cmsQuiz}
        open={quizSheetOpen}
        reducedMotion={reducedMotion}
        phase={phase}
        selectedAnswerId={selectedAnswerId}
        onSelectAnswer={setSelectedAnswerId}
        onSubmitAnswer={handleSubmitAnswer}
        onContinue={finishQuizFromUi}
        onEntered={handleQuizSheetEntered}
      />
    );
  }, [
    enabled,
    cmsQuiz,
    quizSheetOpen,
    reducedMotion,
    phase,
    selectedAnswerId,
    handleSubmitAnswer,
    finishQuizFromUi,
    handleQuizSheetEntered,
  ]);

  const chromePatch = useMemo((): Partial<LevelSessionChromeState> | null => {
    if (!enabled || !cmsQuiz) {
      return null;
    }
    return {
      header: (
        <LevelMissionHeaderBar
          levelKey={levelKey}
          districtName={districtName}
          missionLabel={missionLabel}
          score={headerScore}
          maxScore={barMaxScore}
          minimumScorePercentage={minimumScorePercentage}
          showMascotCrown={quizFeedbackCorrect}
          suppressScoreParticles
        />
      ),
      dock: null,
      boardOverlay: null,
      boardSceneStack: sceneStack,
      sceneClassName: "level-scene--pre-quiz",
      shellVariant: "play",
      boardPointerEnabled: false,
      boardAriaLabel: "Level-Fortschritt",
      boardRole: "img",
    };
  }, [
    enabled,
    cmsQuiz,
    levelKey,
    districtName,
    missionLabel,
    headerScore,
    barMaxScore,
    placedTiles.length,
    level.maximumTileCount,
    missionDialogOpen,
    sceneStack,
    minimumScorePercentage,
    quizFeedbackCorrect,
  ]);

  const chromeSyncKey = useMemo(() => {
    if (!enabled || !cmsQuiz) {
      return null;
    }
    return [
      "quiz",
      levelKey,
      districtName,
      missionLabel,
      String(headerScore),
      String(barMaxScore),
      String(placedTiles.length),
      String(level.maximumTileCount),
      missionDialogOpen ? "1" : "0",
      reducedMotion ? "1" : "0",
      quizSheetOpen ? "1" : "0",
      phase,
      selectedAnswerId == null ? "" : String(selectedAnswerId),
      quizAnswerCorrect == null ? "" : quizAnswerCorrect ? "1" : "0",
    ].join("|");
  }, [
    enabled,
    cmsQuiz,
    levelKey,
    districtName,
    missionLabel,
    headerScore,
    barMaxScore,
    placedTiles.length,
    level.maximumTileCount,
    missionDialogOpen,
    reducedMotion,
    quizSheetOpen,
    phase,
    selectedAnswerId,
    quizAnswerCorrect,
  ]);

  return {
    headerScore,
    showMascotCrown: quizFeedbackCorrect,
    chromePatch,
    chromeSyncKey,
    sceneStack,
  };
}
