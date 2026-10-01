import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { District, DistrictLevelSummary } from "@/types/content";
import { writeLevelProgress } from "@/features/level/levelProgress";
import {
  getBonusLevels,
  hasUnrevealedBonusLevels,
  isLevelVisibleOnMap,
  markBonusLevelsRevealed,
  readBonusLevelsRevealed,
} from "./mapBonusLevelUnlock";

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

function level(
  id: number,
  documentId: string,
  primaryLevel: boolean,
): DistrictLevelSummary {
  return {
    id,
    documentId,
    name: `Level ${id}`,
    primaryLevel,
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

function district(levels: DistrictLevelSummary[]): District {
  return {
    id: 1,
    documentId: "bez-1",
    slug: null,
    bezirkId: "mitte",
    name: "Mitte",
    description: null,
    imageUrl: null,
    imageAlt: "",
    namensOffset: null,
    levels,
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mapBonusLevelUnlock", () => {
  it("hides bonus levels until primary has at least two stars and bonus is revealed", () => {
    const primary = level(1, "primary", true);
    const bonus = level(2, "bonus", false);
    const d = district([primary, bonus]);

    expect(isLevelVisibleOnMap(d, primary)).toBe(true);
    expect(isLevelVisibleOnMap(d, bonus)).toBe(false);

    writeLevelProgress("primary", { completed: true, stars: 1 });
    expect(isLevelVisibleOnMap(d, bonus)).toBe(false);
    expect(hasUnrevealedBonusLevels(d)).toBe(false);

    writeLevelProgress("primary", { completed: true, stars: 2 });
    expect(isLevelVisibleOnMap(d, bonus)).toBe(false);
    expect(hasUnrevealedBonusLevels(d)).toBe(true);

    markBonusLevelsRevealed("bez-1");
    expect(readBonusLevelsRevealed("bez-1")).toBe(true);
    expect(isLevelVisibleOnMap(d, bonus)).toBe(true);
    expect(hasUnrevealedBonusLevels(d)).toBe(false);
  });

  it("keeps bonus levels visible after primary is replayed with fewer stars", () => {
    const primary = level(1, "primary", true);
    const bonus = level(2, "bonus", false);
    const d = district([primary, bonus]);

    writeLevelProgress("primary", { completed: true, stars: 2 });
    markBonusLevelsRevealed("bez-1");
    expect(isLevelVisibleOnMap(d, bonus)).toBe(true);

    writeLevelProgress("primary", { completed: true, stars: 1 });
    expect(isLevelVisibleOnMap(d, bonus)).toBe(true);
  });

  it("lists all bonus levels in a district", () => {
    const d = district([
      level(1, "p", true),
      level(2, "b1", false),
      level(3, "b2", false),
    ]);
    expect(getBonusLevels(d)).toHaveLength(2);
  });
});
