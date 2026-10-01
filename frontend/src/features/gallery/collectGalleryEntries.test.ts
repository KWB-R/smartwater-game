import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { District, DistrictLevelSummary } from "@/types/content";
import { writeLevelProgress } from "@/features/level/levelProgress";
import { markBonusLevelsRevealed } from "@/features/map/mapBonusLevelUnlock";
import { collectGalleryEntries } from "@/features/gallery/collectGalleryEntries";

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
  } as Storage;
}

function levelSummary(
  overrides: Partial<DistrictLevelSummary> &
    Pick<DistrictLevelSummary, "id" | "documentId">,
): DistrictLevelSummary {
  return {
    name: "Level",
    primaryLevel: true,
    shareable: true,
    maxPuzzleItems: null,
    minimumScorePercentage: null,
    assetsFolder: "__unavailable__/level_0",
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
    ...overrides,
  };
}

function district(
  name: string,
  documentId: string,
  levels: DistrictLevelSummary[],
): District {
  return {
    id: 1,
    documentId,
    slug: null,
    bezirkId: "x",
    name,
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

describe("collectGalleryEntries", () => {
  it("includes primary level per district", () => {
    const primary = levelSummary({
      id: 1,
      documentId: "primary-1",
      primaryLevel: true,
    });
    const entries = collectGalleryEntries([
      district("Pankow", "bez-pankow", [primary]),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.levelKey).toBe("primary-1");
    expect(entries[0]?.isBonusLevel).toBe(false);
    expect(entries[0]?.isComplete).toBe(false);
    expect(entries[0]?.backgroundImageUrl).toBeNull();
  });

  it("marks complete when progress completed", () => {
    const primary = levelSummary({
      id: 1,
      documentId: "primary-1",
    });
    writeLevelProgress("primary-1", { completed: true, stars: 2 });
    const entries = collectGalleryEntries([
      district("Pankow", "bez-pankow", [primary]),
    ]);
    expect(entries[0]?.isComplete).toBe(true);
  });

  it("includes bonus level only when visible on map", () => {
    const primary = levelSummary({
      id: 1,
      documentId: "primary-1",
      primaryLevel: true,
    });
    const bonus = levelSummary({
      id: 2,
      documentId: "bonus-1",
      primaryLevel: false,
      name: "Bonus",
    });
    const d = district("Mitte", "bez-mitte", [primary, bonus]);
    expect(collectGalleryEntries([d])).toHaveLength(1);

    writeLevelProgress("primary-1", { completed: true, stars: 2 });
    markBonusLevelsRevealed("bez-mitte");
    const withBonus = collectGalleryEntries([d]);
    expect(withBonus).toHaveLength(2);
    expect(withBonus.some((e) => e.levelKey === "bonus-1")).toBe(true);
  });
});
