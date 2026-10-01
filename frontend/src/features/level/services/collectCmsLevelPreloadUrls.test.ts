import { describe, expect, it } from "vitest";

import { collectCmsLevelPreloadUrls } from "@/features/level/services/collectCmsLevelPreloadUrls";
import type { DistrictLevelSummary } from "@/types/content";
import type { MissionBonusCatalog } from "@/types/mission";

const baseLevel: DistrictLevelSummary = {
  id: 1,
  documentId: "lvl1",
  name: "Test",
  primaryLevel: true,
  shareable: true,
  maxPuzzleItems: null,
  assetsFolder: null,
  mapMarkerPosition: null,
  mission: null,
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
  placementOrder: [],
  achievableBonuses: [],
  slug: null,
  previewImageUrl: "/uploads/preview.jpg",
  previewImageAlt: "",
  unhappyMascotUrl: null,
  unhappyMascotAlt: "",
  happyMascotUrl: "/uploads/happy.jpg",
  happyMascotAlt: "",
  superhappyMascotUrl: null,
  superhappyMascotAlt: "",
  problemContent: null,
  quiz: null,
  winContent: null,
  winningContent: null,
};

describe("collectCmsLevelPreloadUrls", () => {
  it("collects mascot and mission media and bonus catalog images", () => {
    const catalog: MissionBonusCatalog = new Map([
      [
        "bio",
        {
          type: "bio",
          title: "Bio",
          imageUrl: "/uploads/bio.png",
          imageAlt: "",
        },
      ],
    ]);

    const urls = collectCmsLevelPreloadUrls(baseLevel, catalog);
    expect(urls.some((u) => u.includes("preview.jpg"))).toBe(true);
    expect(urls.some((u) => u.includes("happy.jpg"))).toBe(true);
    expect(urls.some((u) => u.includes("bio.png"))).toBe(true);
  });
});
