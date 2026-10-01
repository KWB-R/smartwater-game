import { describe, expect, it } from "vitest";

import type { District, DistrictLevelSummary } from "@/types/content";
import {
  findDistrictForLevel,
  findDistrictLevelInList,
} from "@/features/level/services/findDistrictForLevel";

function level(
  id: number,
  documentId: string | null = null,
): DistrictLevelSummary {
  return {
    id,
    documentId,
    name: "L",
    primaryLevel: true,
    shareable: true,
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

function district(bezirkId: string, levels: DistrictLevelSummary[]): District {
  return {
    id: 1,
    documentId: null,
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

describe("findDistrictForLevel", () => {
  it("finds district by numeric level id", () => {
    const l1 = level(7, "doc-7");
    const districts: District[] = [
      district("lichtenberg", [level(1)]),
      district("spandau", [l1]),
    ];
    expect(findDistrictForLevel(districts, l1)?.bezirkId).toBe("spandau");
  });

  it("finds district by documentId", () => {
    const l1 = level(99, "abc");
    const districts: District[] = [district("treptow-koepenick", [l1])];
    expect(findDistrictForLevel(districts, level(1, "abc"))?.bezirkId).toBe(
      "treptow-koepenick",
    );
  });

  it("returns list entry for merge", () => {
    const listLevel = { ...level(1), assetsFolder: "lichtenberg/level_1" };
    const d = district("lichtenberg", [listLevel]);
    expect(findDistrictLevelInList(d, level(1))?.assetsFolder).toBe(
      "lichtenberg/level_1",
    );
  });
});
