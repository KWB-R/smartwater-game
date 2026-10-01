import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { District, DistrictLevelSummary } from "@/types/content";
import { writeLevelProgress } from "@/features/level/levelProgress";
import { markBonusLevelsRevealed } from "@/features/map/mapBonusLevelUnlock";
import {
  assignUrlPriority,
  classifyOfflineLevelPriority,
  orderLevelsByOfflinePriority,
  urlsGroupedByPriority,
} from "@/pwa/offlineAssetPriority";

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

function district(
  documentId: string,
  bezirkId: string,
  levels: DistrictLevelSummary[],
): District {
  return {
    id: 1,
    documentId,
    slug: null,
    bezirkId,
    name: bezirkId,
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

describe("classifyOfflineLevelPriority", () => {
  it("marks first incomplete primary as P1", () => {
    const primary = level(1, "p1", true);
    const d = district("bez-1", "mitte", [primary]);
    expect(classifyOfflineLevelPriority(d, primary)).toBe(1);
  });

  it("skips completed primary to P3", () => {
    const primary = level(1, "p1", true);
    const d = district("bez-1", "mitte", [primary]);
    writeLevelProgress("p1", {
      completed: true,
      stars: 3,
    });
    expect(classifyOfflineLevelPriority(d, primary)).toBe(3);
  });

  it("second incomplete primary is P3 while first incomplete is P1", () => {
    const a = level(1, "a", true);
    const b = level(2, "b", true);
    const d = district("bez-1", "mitte", [a, b]);
    writeLevelProgress("a", {
      completed: true,
      stars: 1,
    });
    expect(classifyOfflineLevelPriority(d, a)).toBe(3);
    expect(classifyOfflineLevelPriority(d, b)).toBe(1);
  });

  it("bonus locked stays P3; unlockable or revealed is P2", () => {
    const primary = level(1, "p1", true);
    const bonus = level(2, "bonus", false);
    const d = district("bez-1", "mitte", [primary, bonus]);

    expect(classifyOfflineLevelPriority(d, bonus)).toBe(3);

    writeLevelProgress("p1", {
      completed: true,
      stars: 2,
    });
    expect(classifyOfflineLevelPriority(d, bonus)).toBe(2);

    markBonusLevelsRevealed("bez-1");
    expect(classifyOfflineLevelPriority(d, bonus)).toBe(2);
  });
});

describe("orderLevelsByOfflinePriority", () => {
  it("orders P1 before P2 before P3 across districts", () => {
    const d1Primary = level(1, "d1-p", true);
    const d1Bonus = level(2, "d1-b", false);
    const d2Primary = level(3, "d2-p", true);
    const d1 = district("bez-1", "mitte", [d1Primary, d1Bonus]);
    const d2 = district("bez-2", "pankow", [d2Primary]);

    writeLevelProgress("d1-p", {
      completed: true,
      stars: 2,
    });

    const ordered = orderLevelsByOfflinePriority([d1, d2]);
    expect(ordered.map((r) => r.level.documentId)).toEqual([
      "d2-p",
      "d1-b",
      "d1-p",
    ]);
    expect(ordered.map((r) => r.priority)).toEqual([1, 2, 3]);
  });
});

describe("assignUrlPriority / urlsGroupedByPriority", () => {
  it("keeps highest priority for duplicate URLs", () => {
    const map = new Map();
    assignUrlPriority(map, "https://a/x.webp", 3);
    assignUrlPriority(map, "https://a/x.webp", 1);
    assignUrlPriority(map, "https://a/y.webp", 0);
    const [p0, p1, p2, p3] = urlsGroupedByPriority(map);
    expect(p0).toEqual(["https://a/y.webp"]);
    expect(p1).toEqual(["https://a/x.webp"]);
    expect(p2).toEqual([]);
    expect(p3).toEqual([]);
  });
});
