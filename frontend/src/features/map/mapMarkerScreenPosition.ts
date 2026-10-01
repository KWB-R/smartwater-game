/** SVG-Kartenkoordinate (viewBox) → Viewport-Pixel (für Partikel). */
export function clientPointFromMapSvg(
  svg: SVGSVGElement,
  mapX: number,
  mapY: number,
): { x: number; y: number } {
  const point = svg.createSVGPoint();
  point.x = mapX;
  point.y = mapY;
  const matrix = svg.getScreenCTM();
  if (!matrix) {
    return { x: 0, y: 0 };
  }
  const transformed = point.matrixTransform(matrix);
  return { x: transformed.x, y: transformed.y };
}

/** Partikelreichweite aus der sichtbaren Bezirksfläche in Pixeln. */
export function explosionSpreadFromScreenSize(
  width: number,
  height: number,
): number {
  const span = Math.max(width, height);
  return Math.round(Math.min(360, Math.max(180, span * 0.62)));
}

/** Sichtbares Rechteck der Bezirksfläche (Viewport-Pixel). */
export function readDistrictScreenRect(
  svg: SVGSVGElement,
  bezirkId: string,
): { x: number; y: number; width: number; height: number } | null {
  const paths = svg.querySelectorAll<SVGPathElement>(
    `path[data-bezirk="${CSS.escape(bezirkId)}"][data-map-role="district"]`,
  );
  if (paths.length === 0) {
    return null;
  }

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  paths.forEach((path) => {
    const rect = path.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  });
  if (!Number.isFinite(left) || !Number.isFinite(top)) {
    return null;
  }
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

/** Partikelursprung in der sichtbaren Bezirksfläche. */
export function readDistrictBurstPointFromDom(
  svg: SVGSVGElement,
  bezirkId: string,
  burstKey: number,
): { id: number; x: number; y: number } | null {
  const rect = readDistrictScreenRect(svg, bezirkId);
  if (!rect) {
    return null;
  }
  return {
    id: burstKey,
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

/** Partikelursprung am sichtbaren Levelmarker. */
export function readMapMarkerBurstPointsFromDom(
  svg: SVGSVGElement,
  levelKeys: ReadonlySet<string>,
  burstKey: number,
): Array<{ id: number; x: number; y: number }> {
  const points: Array<{ id: number; x: number; y: number }> = [];
  let index = 0;
  svg.querySelectorAll<SVGGElement>("g[data-map-level-key]").forEach((g) => {
    const key = g.getAttribute("data-map-level-key")?.trim();
    if (!key || !levelKeys.has(key)) {
      return;
    }
    const rect = g.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    points.push({
      id: burstKey + index,
      x: rect.left + rect.width / 2,
      y: rect.bottom - Math.min(6, rect.height * 0.06),
    });
    index += 1;
  });
  return points;
}
