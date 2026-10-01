import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { District, DistrictLevelSummary } from "@/types/content";
import { writeLevelProgress } from "@/features/level/levelProgress";
import {
  countSolvedDistricts,
  isDistrictHighlightedOnMap,
  isDistrictPrimarySolved,
  isDistrictPuzzleSolved,
} from "./mapDistrictProgress";

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
  primaryLevel = true,
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
  vi.stubGlobal("sessionStorage", createStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isDistrictPuzzleSolved", () => {
  it("is false when no level is completed", () => {
    const d = district([level(1, "lvl-1"), level(2, "lvl-2")]);
    expect(isDistrictPuzzleSolved(d)).toBe(false);
  });

  it("is false when only some levels are completed", () => {
    writeLevelProgress("lvl-1", { completed: true, stars: 3 });
    const d = district([level(1, "lvl-1"), level(2, "lvl-2")]);
    expect(isDistrictPuzzleSolved(d)).toBe(false);
  });

  it("is true when every level is completed", () => {
    writeLevelProgress("lvl-1", { completed: true, stars: 3 });
    writeLevelProgress("lvl-2", { completed: true, stars: 2 });
    const d = district([level(1, "lvl-1"), level(2, "lvl-2")]);
    expect(isDistrictPuzzleSolved(d)).toBe(true);
  });
});

describe("isDistrictPrimarySolved", () => {
  it("is false when primary is not completed", () => {
    const d = district([
      level(1, "primary", true),
      level(2, "bonus", false),
    ]);
    expect(isDistrictPrimarySolved(d)).toBe(false);
  });

  it("is true when primary is completed and bonus is not", () => {
    writeLevelProgress("primary", { completed: true, stars: 3 });
    const d = district([
      level(1, "primary", true),
      level(2, "bonus", false),
    ]);
    expect(isDistrictPrimarySolved(d)).toBe(true);
    expect(isDistrictPuzzleSolved(d)).toBe(false);
  });

  it("does not count bonus-only completion", () => {
    writeLevelProgress("bonus", { completed: true, stars: 3 });
    const d = district([
      level(1, "primary", true),
      level(2, "bonus", false),
    ]);
    expect(isDistrictPrimarySolved(d)).toBe(false);
  });
});

describe("countSolvedDistricts", () => {
  it("counts districts with completed primary only", () => {
    writeLevelProgress("primary-a", { completed: true, stars: 2 });
    const districts = [
      district([level(1, "primary-a", true), level(2, "bonus-a", false)]),
      district([level(3, "primary-b", true), level(4, "bonus-b", false)]),
    ];
    expect(countSolvedDistricts(districts)).toBe(1);
  });
});

describe("isDistrictHighlightedOnMap", () => {
  it("is false when no level is completed", () => {
    const d = district([level(1, "lvl-1"), level(2, "lvl-2")]);
    expect(isDistrictHighlightedOnMap(d)).toBe(false);
  });

  it("is true when at least one level is completed", () => {
    writeLevelProgress("lvl-1", { completed: true, stars: 3 });
    const d = district([level(1, "lvl-1"), level(2, "lvl-2")]);
    expect(isDistrictHighlightedOnMap(d)).toBe(true);
  });

  it("is true when every level is completed", () => {
    writeLevelProgress("lvl-1", { completed: true, stars: 3 });
    writeLevelProgress("lvl-2", { completed: true, stars: 2 });
    const d = district([level(1, "lvl-1"), level(2, "lvl-2")]);
    expect(isDistrictHighlightedOnMap(d)).toBe(true);
  });
});
