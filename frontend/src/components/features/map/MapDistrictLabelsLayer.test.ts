import { describe, expect, it } from "vitest";
import {
  buildVisibleDistrictLabels,
  splitDistrictLabelLines,
} from "./MapDistrictLabelsLayer";
import type { DistrictSvgBounds } from "@/features/map/berlinMapLayout";
import { INITIAL_MAP_VIEW_BOX } from "@/features/map/useBerlinMapViewBox";

describe("splitDistrictLabelLines", () => {
  it("keeps short single-word names on one line", () => {
    expect(splitDistrictLabelLines("Mitte")).toEqual(["Mitte"]);
  });

  it("wraps hyphenated district names and keeps the hyphen on the first line", () => {
    expect(splitDistrictLabelLines("Friedrichshain-Kreuzberg")).toEqual([
      "Friedrichshain-",
      "Kreuzberg",
    ]);
    expect(splitDistrictLabelLines("Tempelhof-Schöneberg")).toEqual([
      "Tempelhof-",
      "Schöneberg",
    ]);
  });

  it("wraps spaced names", () => {
    expect(splitDistrictLabelLines("Foo Bar")).toEqual(["Foo", "Bar"]);
  });
});

describe("buildVisibleDistrictLabels", () => {
  it("returns labels for districts large enough in the current view", () => {
    const bounds: DistrictSvgBounds = {
      bezirkId: "mitte",
      x: 500,
      y: 400,
      width: 120,
      height: 100,
    };
    const names = new Map([["mitte", "Mitte"]]);
    const viewBox = { ...INITIAL_MAP_VIEW_BOX, width: 900, height: 700 };
    const labels = buildVisibleDistrictLabels([bounds], names, viewBox);
    expect(labels).toHaveLength(1);
    expect(labels[0].name).toBe("Mitte");
    expect(labels[0].lines).toEqual(["Mitte"]);
    expect(labels[0].x).toBe(560);
    expect(labels[0].y).toBe(450);
  });

  it("stores wrapped lines for long district names", () => {
    const bounds: DistrictSvgBounds = {
      bezirkId: "friedrichshain-kreuzberg",
      x: 500,
      y: 400,
      width: 120,
      height: 100,
    };
    const names = new Map([
      ["friedrichshain-kreuzberg", "Friedrichshain-Kreuzberg"],
    ]);
    const viewBox = { ...INITIAL_MAP_VIEW_BOX, width: 900, height: 700 };
    const labels = buildVisibleDistrictLabels([bounds], names, viewBox);
    expect(labels[0].lines).toEqual(["Friedrichshain-", "Kreuzberg"]);
  });

  it("uses namensOffset when provided", () => {
    const bounds: DistrictSvgBounds = {
      bezirkId: "mitte",
      x: 100,
      y: 200,
      width: 100,
      height: 100,
    };
    const names = new Map([["mitte", "Mitte"]]);
    const offsets = new Map([["mitte", { x: 0, y: 0 }]]);
    const viewBox = { ...INITIAL_MAP_VIEW_BOX, width: 900, height: 700 };
    const labels = buildVisibleDistrictLabels(
      [bounds],
      names,
      viewBox,
      offsets,
    );
    expect(labels[0].x).toBe(100);
    expect(labels[0].y).toBe(200);
  });

  it("skips districts outside the view or too small on screen", () => {
    const tiny: DistrictSvgBounds = {
      bezirkId: "tiny",
      x: 10,
      y: 10,
      width: 20,
      height: 20,
    };
    const names = new Map([["tiny", "Tiny"]]);
    const zoomed = { x: 0, y: 0, width: 400, height: 300 };
    expect(buildVisibleDistrictLabels([tiny], names, zoomed)).toHaveLength(0);
  });
});

describe("mapDistrictLabelsOpacity", () => {
  it("mirrors map page content fade", async () => {
    const { mapDistrictLabelsOpacity, mapPageContentOpacity } = await import(
      "@/features/map/mapPageContentOpacity"
    );
    const width = 1000;
    expect(mapDistrictLabelsOpacity(width)).toBeCloseTo(
      1 - mapPageContentOpacity(width),
      5,
    );
  });
});
