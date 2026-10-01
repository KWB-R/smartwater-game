import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readLevelProgress,
  writeLevelProgress,
} from "@/features/level/levelProgress";
import {
  persistProgressAfterPuzzle,
  persistProgressAfterQuiz,
} from "@/features/level/play/levelProgressPersistence";

function createStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("levelProgressPersistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("sessionStorage", createStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persistProgressAfterPuzzle schreibt completed + stars bei First-Clear", () => {
    const result = persistProgressAfterPuzzle({
      levelKey: "lvl-a",
      placementScoreSum: 80,
      barMaxScore: 100,
      minimumScorePercentage: 80,
      placedTiles: [],
      district: null,
    });

    expect(result.mapReturnFromStarCount).toBe(0);
    expect(result.isFirstCompletion).toBe(true);
    expect(result.stars).toBe(2);
    expect(result.mapSnapshot).toBeNull();
    const progress = readLevelProgress("lvl-a");
    expect(progress?.completed).toBe(true);
    expect(progress?.stars).toBe(2);
    expect(progress?.quizPassed).not.toBe(true);
  });

  it("persistProgressAfterPuzzle lässt Replay-Fortschritt bis zum Finish unangetastet", () => {
    writeLevelProgress("lvl-a", {
      completed: true,
      stars: 3,
      quizPassed: true,
      maxBarScoreAchieved: true,
    });

    const result = persistProgressAfterPuzzle({
      levelKey: "lvl-a",
      placementScoreSum: 50,
      barMaxScore: 100,
      minimumScorePercentage: 80,
      placedTiles: [],
      district: null,
    });

    expect(result.mapReturnFromStarCount).toBe(3);
    expect(result.isFirstCompletion).toBe(false);
    expect(result.stars).toBe(3);
    expect(readLevelProgress("lvl-a")?.stars).toBe(3);
    expect(readLevelProgress("lvl-a")?.quizPassed).toBe(true);
  });

  it("persistProgressAfterQuiz setzt quizPassed + maxBar nur bei Quiz korrekt + Max-Placement", () => {
    const result = persistProgressAfterQuiz({
      levelKey: "lvl-b",
      placementScoreSum: 100,
      barMaxScore: 100,
      minimumScorePercentage: 80,
      placedTiles: [],
      district: null,
      levelHasQuiz: true,
      missionGoalDimensions: new Set(),
      computeWinningTotalBarScore: () => 100,
      runIsFirstCompletion: true,
    });

    expect(result.quizCorrect).toBe(false);
    expect(result.shouldCelebrateDetail).toBe(true);
    expect(result.isFirstCompletion).toBe(true);
    const progress = readLevelProgress("lvl-b");
    expect(progress?.completed).toBe(true);
    expect(progress?.stars).toBe(3);
    expect(progress?.puzzleMaxBarScoreAchieved).toBe(true);
    expect(progress?.maxBarScoreAchieved).not.toBe(true);
    expect(progress?.quizPassed).not.toBe(true);
  });

  it("persistProgressAfterQuiz ohne Quiz markiert quizCorrect false", () => {
    const result = persistProgressAfterQuiz({
      levelKey: "lvl-c",
      placementScoreSum: 100,
      barMaxScore: 100,
      minimumScorePercentage: null,
      placedTiles: [],
      district: null,
      levelHasQuiz: false,
      missionGoalDimensions: new Set(),
      computeWinningTotalBarScore: () => 100,
      runIsFirstCompletion: true,
    });

    expect(result.quizCorrect).toBe(false);
    expect(result.mapReturnFromStarCount).toBe(0);
    expect(result.shouldCelebrateDetail).toBe(true);
  });

  it("persistProgressAfterQuiz: Finish ersetzt Sterne/Krone auch wenn schlechter", () => {
    writeLevelProgress("lvl-e", {
      completed: true,
      stars: 3,
      quizPassed: true,
      maxBarScoreAchieved: true,
      puzzleMaxBarScoreAchieved: true,
    });

    persistProgressAfterPuzzle({
      levelKey: "lvl-e",
      placementScoreSum: 50,
      barMaxScore: 100,
      minimumScorePercentage: 80,
      placedTiles: [],
      district: null,
    });
    // Replay: Zwischenschritt ändert nichts
    expect(readLevelProgress("lvl-e")?.quizPassed).toBe(true);
    expect(readLevelProgress("lvl-e")?.stars).toBe(3);

    const result = persistProgressAfterQuiz({
      levelKey: "lvl-e",
      placementScoreSum: 50,
      barMaxScore: 100,
      minimumScorePercentage: 80,
      placedTiles: [],
      district: null,
      levelHasQuiz: true,
      missionGoalDimensions: new Set(),
      computeWinningTotalBarScore: () => 50,
      runIsFirstCompletion: false,
    });

    expect(result.quizCorrect).toBe(false);
    expect(result.shouldCelebrateDetail).toBe(true);
    expect(result.stars).toBe(1);
    expect(result.mapReturnFromStarCount).toBe(0);
    const progress = readLevelProgress("lvl-e");
    expect(progress?.quizPassed).not.toBe(true);
    expect(progress?.maxBarScoreAchieved).not.toBe(true);
    expect(progress?.puzzleMaxBarScoreAchieved).not.toBe(true);
    expect(progress?.stars).toBe(1);
    expect(progress?.completed).toBe(true);
  });
});
