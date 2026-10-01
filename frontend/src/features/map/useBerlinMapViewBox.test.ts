import { describe, expect, it } from "vitest";
import {
  INITIAL_MAP_VIEW_BOX,
  MAP_DETAIL_BBOX_FOCUS_PAD_RATIO,
  mapDetailDistrictFocusAlign,
  screenYForSvgPointY,
  viewBoxForSvgBBox,
  viewBoxForSvgBBoxAtCanvasY,
  zoomViewBoxAtPoint,
} from "./useBerlinMapViewBox";

describe("zoomViewBoxAtPoint", () => {
  const rect = {
    left: 0,
    top: 0,
    width: 400,
    height: 800,
  } as DOMRect;

  it("does not pan when already at max zoom-out", () => {
    const atMax = { ...INITIAL_MAP_VIEW_BOX };
    const next = zoomViewBoxAtPoint(atMax, rect, 200, 400, 1.08);
    expect(next).toEqual(atMax);
  });

  it("keeps the cursor anchor when crossing max zoom-in", () => {
    const clientX = 260;
    const clientY = 360;
    let current = INITIAL_MAP_VIEW_BOX;

    for (let step = 0; step < 100; step += 1) {
      const svgX = current.x + (clientX / rect.width) * current.width;
      const svgY = current.y + (clientY / rect.height) * current.height;
      const next = zoomViewBoxAtPoint(
        current,
        rect,
        clientX,
        clientY,
        0.9,
      );

      expect(next.x + (clientX / rect.width) * next.width).toBeCloseTo(
        svgX,
        8,
      );
      expect(next.y + (clientY / rect.height) * next.height).toBeCloseTo(
        svgY,
        8,
      );

      if (next === current) {
        break;
      }
      current = next;
    }

    expect(
      zoomViewBoxAtPoint(current, rect, clientX, clientY, 0.9),
    ).toEqual(current);
  });

  it("keeps the cursor anchor when crossing max zoom-out", () => {
    const clientX = 260;
    const clientY = 360;
    let current = INITIAL_MAP_VIEW_BOX;
    for (let step = 0; step < 6; step += 1) {
      current = zoomViewBoxAtPoint(
        current,
        rect,
        clientX,
        clientY,
        0.8,
      );
    }

    while (current.width < INITIAL_MAP_VIEW_BOX.width) {
      const svgX = current.x + (clientX / rect.width) * current.width;
      const svgY = current.y + (clientY / rect.height) * current.height;
      const next = zoomViewBoxAtPoint(
        current,
        rect,
        clientX,
        clientY,
        1.2,
      );

      expect(next.x + (clientX / rect.width) * next.width).toBeCloseTo(
        svgX,
        8,
      );
      expect(next.y + (clientY / rect.height) * next.height).toBeCloseTo(
        svgY,
        8,
      );
      current = next;
    }

    expect(
      zoomViewBoxAtPoint(current, rect, clientX, clientY, 1.2),
    ).toEqual(current);
  });
});

describe("viewBoxForSvgBBoxAtCanvasY", () => {
  it("shifts viewBox y when target is above canvas center", () => {
    const bbox = { x: 100, y: 200, width: 80, height: 60 };
    const base = viewBoxForSvgBBox(bbox);
    const canvas = { width: 390, height: 260 };
    const lowTargetY = 60;
    const shifted = viewBoxForSvgBBoxAtCanvasY(bbox, canvas, lowTargetY);
    expect(shifted.y).toBeGreaterThan(base.y);
  });

  it("keeps bbox center on target Y when min zoom width clamp applies", () => {
    const bbox = { x: 420, y: 510, width: 88, height: 72 };
    const canvas = { width: 390, height: 844 };
    const targetY = 118;
    const viewBox = viewBoxForSvgBBoxAtCanvasY(bbox, canvas, targetY, {
      padRatio: MAP_DETAIL_BBOX_FOCUS_PAD_RATIO,
    });
    const cy = bbox.y + bbox.height / 2;
    expect(screenYForSvgPointY(cy, viewBox, canvas)).toBeCloseTo(targetY, 0);
  });
});

describe("mapDetailDistrictFocusAlign", () => {
  it("centers the district in the visible band above the sheet", () => {
    const canvasRect = {
      top: 0,
      left: 0,
      width: 390,
      height: 844,
      bottom: 844,
      right: 390,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
    const sheetTop = 240;
    const { targetCenterLocalY } = mapDetailDistrictFocusAlign(
      canvasRect,
      sheetTop,
    );
    expect(targetCenterLocalY).toBeGreaterThan(sheetTop * 0.35);
    expect(targetCenterLocalY).toBeLessThan(sheetTop * 0.65);
  });
});
