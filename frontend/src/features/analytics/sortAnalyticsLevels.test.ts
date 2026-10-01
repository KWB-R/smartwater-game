import { describe, expect, it } from "vitest";
import type { District, DistrictLevelSummary } from "@/types/content";
import {
  buildAnalyticsLevelRankMap,
  sortAnalyticsLevelStarts,
} from "@/features/analytics/sortAnalyticsLevels";

function level(
  id: number,
  documentId: string,
  name: string,
  primaryLevel: boolean,
): DistrictLevelSummary {
  return {
    id,
    documentId,
    name,
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
    slug: documentId,
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

function district(name: string, levels: DistrictLevelSummary[]): District {
  return {
    id: 1,
    documentId: `bez-${name}`,
    bezirkId: name,
    slug: name,
    name,
    description: null,
    imageUrl: null,
    imageAlt: "",
    namensOffset: null,
    levels,
  };
}

describe("sortAnalyticsLevels", () => {
  it("orders districts alphabetically with bonus after primary", () => {
    const d1 = district("Zehlendorf", [
      level(1, "z-primary", "Haupt Z", true),
      level(2, "z-bonus", "Bonus Z", false),
    ]);
    const d2 = district("Mitte", [
      level(3, "m-primary", "Haupt M", true),
      level(4, "m-bonus-a", "Bonus A", false),
      level(5, "m-bonus-b", "Bonus B", false),
    ]);

    const rows = [
      { levelSlug: "m-bonus-b", levelTitle: "Bonus B", count: 1 },
      { levelSlug: "z-primary", levelTitle: "Haupt Z", count: 9 },
      { levelSlug: "m-primary", levelTitle: "Haupt M", count: 5 },
      { levelSlug: "z-bonus", levelTitle: "Bonus Z", count: 2 },
      { levelSlug: "m-bonus-a", levelTitle: "Bonus A", count: 3 },
    ];

    const sorted = sortAnalyticsLevelStarts(rows, [d1, d2]);
    expect(sorted.map((r) => r.levelSlug)).toEqual([
      "m-primary",
      "m-bonus-a",
      "m-bonus-b",
      "z-primary",
      "z-bonus",
    ]);
  });

  it("buildAnalyticsLevelRankMap registers slug keys", () => {
    const d = district("Test", [level(1, "doc-1", "Alpha", true)]);
    const map = buildAnalyticsLevelRankMap([d]);
    expect(map.get("doc-1")).toBe(0);
  });
});
