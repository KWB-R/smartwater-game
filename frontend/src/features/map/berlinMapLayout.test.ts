import { describe, expect, it } from "vitest";

import type { District, DistrictLevelSummary } from "@/types/content";
import {
  buildDistrictOverviewMarkers,
  buildLevelMapMarkers,
  mapMarkerPointFromDistrictBounds,
  resolveLevelMapMarkerPoint,
  type DistrictAnchor,
  type DistrictSvgBounds,
} from "./berlinMapLayout";

const bounds: DistrictSvgBounds = {
  bezirkId: "mitte",
  x: 100,
  y: 200,
  width: 50,
  height: 80,
};

const anchor: DistrictAnchor = {
  bezirkId: "mitte",
  cx: 125,
  cy: 240,
};

function level(
  overrides: Partial<DistrictLevelSummary> = {},
): DistrictLevelSummary {
  return {
    id: 1,
    documentId: "lvl",
    name: "Level",
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
    ...overrides,
  };
}

describe("mapMarkerPointFromDistrictBounds", () => {
  it("maps 0–100 % to SVG coordinates within the district bbox", () => {
    expect(mapMarkerPointFromDistrictBounds(bounds, { x: 0, y: 0 })).toEqual({
      x: 100,
      y: 200,
    });
    expect(
      mapMarkerPointFromDistrictBounds(bounds, { x: 100, y: 100 }),
    ).toEqual({
      x: 150,
      y: 280,
    });
    expect(mapMarkerPointFromDistrictBounds(bounds, { x: 50, y: 25 })).toEqual({
      x: 125,
      y: 220,
    });
  });

  it("clamps out-of-range percentages", () => {
    expect(
      mapMarkerPointFromDistrictBounds(bounds, { x: -10, y: 150 }),
    ).toEqual({
      x: 100,
      y: 280,
    });
  });
});

describe("resolveLevelMapMarkerPoint", () => {
  it("uses CMS position when set", () => {
    const point = resolveLevelMapMarkerPoint(
      level({ mapMarkerPosition: { x: 50, y: 50 } }),
      anchor,
      bounds,
      0,
      1,
    );
    expect(point).toEqual({ x: 125, y: 240 });
  });

  it("falls back to orbit when mapMarkerPosition is missing", () => {
    const point = resolveLevelMapMarkerPoint(level(), anchor, bounds, 0, 1);
    expect(point).toEqual({ x: 125, y: 240 });
  });
});

describe("buildLevelMapMarkers", () => {
  it("includes bonus levels before they are revealed on the map", () => {
    const districts: District[] = [
      {
        id: 1,
        documentId: "bez-mitte",
        slug: null,
        bezirkId: "mitte",
        name: "Mitte",
        description: null,
        imageUrl: null,
        imageAlt: "",
        namensOffset: null,
        levels: [
          level({ documentId: "primary", primaryLevel: true }),
          level({ id: 2, documentId: "bonus", primaryLevel: false }),
        ],
      },
    ];
    const markers = buildLevelMapMarkers(districts, [anchor], [bounds]);
    expect(markers).toHaveLength(2);
    expect(markers.map((m) => m.level.documentId).sort()).toEqual([
      "bonus",
      "primary",
    ]);
  });
});

describe("buildDistrictOverviewMarkers", () => {
  it("uses the same coordinates as level markers (incl. mapMarkerPosition)", () => {
    const districts: District[] = [
      {
        id: 1,
        documentId: "bez-mitte",
        slug: null,
        bezirkId: "mitte",
        name: "Mitte",
        description: null,
        imageUrl: null,
        imageAlt: "",
        namensOffset: null,
        levels: [level({ mapMarkerPosition: { x: 0, y: 0 } })],
      },
    ];
    const overview = buildDistrictOverviewMarkers(
      districts,
      [anchor],
      [bounds],
    );
    const pins = buildLevelMapMarkers(districts, [anchor], [bounds]);
    expect(overview).toHaveLength(1);
    expect(overview[0].x).toBe(pins[0].x);
    expect(overview[0].y).toBe(pins[0].y);
    expect(overview[0].x).toBe(100);
    expect(overview[0].y).toBe(200);
  });
});
