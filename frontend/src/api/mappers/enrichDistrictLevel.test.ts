import { describe, expect, it } from "vitest";

import { pickDistrictLevelSummary } from "@/api/mappers/enrichDistrictLevel";
import type { DistrictLevelSummary } from "@/types/content";

function minimalLevel(
  overrides: Partial<DistrictLevelSummary> = {},
): DistrictLevelSummary {
  return {
    id: 1,
    documentId: "doc-1",
    name: "Level",
    primaryLevel: true,
    shareable: true,
    slug: null,
    assetsFolder: null,
    mapMarkerPosition: null,
    maxPuzzleItems: null,
    mission: null,
    puzzleItems: [],
    placementOrder: [],
    achievableBonuses: [],
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

describe("pickDistrictLevelSummary", () => {
  it("fills assetsFolder from Bezirksliste when detail API omits it", () => {
    const fromList = minimalLevel({
      assetsFolder: "lichtenberg/level_1",
      puzzleItems: [],
    });
    const fromApi = minimalLevel({
      assetsFolder: null,
      puzzleItems: [
        {
          name: "Baum",
          uniqueId: "tree",
          content: null,
          punkte: {
            bio: { bonus: 1, isBonus: true, isMission: false },
          },
        },
      ],
    });

    const merged = pickDistrictLevelSummary(fromApi, fromList);
    expect(merged?.assetsFolder).toBe("lichtenberg/level_1");
    expect(merged?.puzzleItems).toHaveLength(1);
  });

  it("fills maxPuzzleItems from Bezirksliste when detail API omits it", () => {
    const fromList = minimalLevel({
      maxPuzzleItems: 3,
      puzzleItems: [],
    });
    const fromApi = minimalLevel({
      maxPuzzleItems: null,
      puzzleItems: [
        {
          name: "Baum",
          uniqueId: "tree",
          content: null,
          punkte: {
            bio: { bonus: 1, isBonus: true, isMission: false },
          },
        },
      ],
    });

    const merged = pickDistrictLevelSummary(fromApi, fromList);
    expect(merged?.maxPuzzleItems).toBe(3);
  });

  it("prefers maxPuzzleItems from detail API when Bezirksliste differs", () => {
    const fromList = minimalLevel({ maxPuzzleItems: 3, puzzleItems: [] });
    const fromApi = minimalLevel({
      maxPuzzleItems: 7,
      puzzleItems: [
        {
          name: "Baum",
          uniqueId: "tree",
          content: null,
          punkte: {
            bio: { bonus: 1, isBonus: true, isMission: false },
          },
        },
      ],
    });

    expect(pickDistrictLevelSummary(fromApi, fromList)?.maxPuzzleItems).toBe(7);
  });
});
