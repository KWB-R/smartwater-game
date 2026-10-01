import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultMapSelectedLevelKey,
  isMapLevelMaxMarkerProgress,
  isPuzzleMaxBarScoreProgress,
  isQuizPassedProgress,
  readLevelProgress,
  readLevelProgressForLevel,
  writeLevelProgress,
  type LevelProgress,
} from "./levelProgress";
import type { DistrictLevelSummary } from "@/types/content";

const LEVEL_KEY = "test-level-doc-id";

function levelSummary(id: number, documentId: string): DistrictLevelSummary {
  return {
    id,
    documentId,
    name: `Level ${id}`,
    primaryLevel: true,
    shareable: true,
    maxPuzzleItems: null,
    minimumScorePercentage: null,
    assetsFolder: null,
    mapMarkerPosition: null,
    mission: null,
    puzzleItems: [],
    placementOrder: [],
    achievableBonuses: [],
    slug: null,
    previewImageUrl: null,
    previewImageAlt: "",
    unhappyMascotUrl: null,
    unhappyMascotAlt: "",
    happyMascotUrl: null,
    happyMascotAlt: "",
    superhappyMascotUrl: null,
    superhappyMascotAlt: "",
    problemContent: null,
    quiz: null,
    winContent: null,
    winningContent: null,
  };
}

function storageKey(levelKey: string): string {
  return `swg-level-progress:${levelKey}`;
}

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

beforeEach(() => {
  vi.stubGlobal("localStorage", createStorage());
  vi.stubGlobal("sessionStorage", createStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("levelProgress", () => {
  it("persists completion in localStorage across reads", () => {
    writeLevelProgress(LEVEL_KEY, { completed: true, stars: 2 });
    const first = readLevelProgress(LEVEL_KEY);
    expect(first).toMatchObject({
      completed: true,
      stars: 2,
    } satisfies Partial<LevelProgress>);

    const second = readLevelProgress(LEVEL_KEY);
    expect(second?.stars).toBe(2);
    expect(localStorage.getItem(storageKey(LEVEL_KEY))).toBeTruthy();
  });

  it("replaces stars and achievement flags on each write (no merge with prior)", () => {
    writeLevelProgress(LEVEL_KEY, {
      completed: true,
      stars: 3,
      puzzleMaxBarScoreAchieved: true,
      quizPassed: true,
    });
    writeLevelProgress(LEVEL_KEY, {
      completed: true,
      stars: 1,
      quizPassed: false,
    });
    const replaced = readLevelProgress(LEVEL_KEY);
    expect(replaced?.stars).toBe(1);
    expect(isPuzzleMaxBarScoreProgress(replaced)).toBe(false);
    expect(isQuizPassedProgress(replaced)).toBe(false);
  });

  it("persists puzzle max and quiz passed when set together", () => {
    writeLevelProgress(LEVEL_KEY, {
      completed: true,
      stars: 2,
      puzzleMaxBarScoreAchieved: true,
      quizPassed: true,
    });
    const saved = readLevelProgress(LEVEL_KEY);
    expect(isPuzzleMaxBarScoreProgress(saved)).toBe(true);
    expect(isQuizPassedProgress(saved)).toBe(true);
  });

  it("isMapLevelMaxMarkerProgress follows quizPassed, not maxBarScoreAchieved", () => {
    expect(
      isMapLevelMaxMarkerProgress({
        completed: true,
        stars: 3,
        quizPassed: true,
        updatedAt: 1,
      }),
    ).toBe(true);
    expect(
      isMapLevelMaxMarkerProgress({
        completed: true,
        stars: 3,
        maxBarScoreAchieved: true,
        updatedAt: 1,
      }),
    ).toBe(false);
    expect(isMapLevelMaxMarkerProgress(null)).toBe(false);
  });

  it("migrates legacy sessionStorage entry to localStorage", () => {
    const legacy: LevelProgress = {
      completed: true,
      stars: 3,
      updatedAt: 1,
    };
    sessionStorage.setItem(storageKey(LEVEL_KEY), JSON.stringify(legacy));

    const progress = readLevelProgress(LEVEL_KEY);
    expect(progress?.completed).toBe(true);
    expect(progress?.stars).toBe(3);
    expect(localStorage.getItem(storageKey(LEVEL_KEY))).toBeTruthy();
    expect(sessionStorage.getItem(storageKey(LEVEL_KEY))).toBeNull();
  });
});

describe("readLevelProgressForLevel", () => {
  it("falls back to numeric id when progress was stored under id only", () => {
    writeLevelProgress("42", { completed: true, stars: 2 });
    const level = levelSummary(42, "cms-bonus-doc");
    expect(readLevelProgress("cms-bonus-doc")).toBeNull();
    expect(readLevelProgressForLevel(level, [level])).toEqual(
      expect.objectContaining({ completed: true, stars: 2 }),
    );
  });

  it("does not steal numeric-id progress owned by another level documentId", () => {
    writeLevelProgress("55", {
      completed: true,
      stars: 3,
      maxBarScoreAchieved: true,
    });
    const owner = levelSummary(55, "55");
    const victim = levelSummary(100, "djovcj8k4o4t315c4dsz4k7r");
    expect(readLevelProgressForLevel(victim, [owner, victim])).toBeNull();
    expect(readLevelProgressForLevel(owner, [owner, victim])).toEqual(
      expect.objectContaining({ completed: true, maxBarScoreAchieved: true }),
    );
  });
});

describe("defaultMapSelectedLevelKey", () => {
  it("returns the first level when none are completed", () => {
    const levels = [levelSummary(1, "lvl-1"), levelSummary(2, "lvl-2")];
    expect(defaultMapSelectedLevelKey(levels)).toBe("lvl-1");
  });

  it("skips completed levels in district order", () => {
    writeLevelProgress("lvl-1", { completed: true, stars: 3 });
    const levels = [levelSummary(1, "lvl-1"), levelSummary(2, "lvl-2")];
    expect(defaultMapSelectedLevelKey(levels)).toBe("lvl-2");
  });

  it("returns the first level when all are completed", () => {
    writeLevelProgress("lvl-1", { completed: true, stars: 3 });
    writeLevelProgress("lvl-2", { completed: true, stars: 2 });
    const levels = [levelSummary(1, "lvl-1"), levelSummary(2, "lvl-2")];
    expect(defaultMapSelectedLevelKey(levels)).toBe("lvl-1");
  });
});
