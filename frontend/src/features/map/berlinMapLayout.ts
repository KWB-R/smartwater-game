import type {
  District,
  DistrictLevelMapMarkerPosition,
  DistrictLevelSummary,
} from "@/types/content";
import {
  BERLIN_MAP_VIEWBOX,
  LEVEL_MARKER_ORBIT_RADIUS,
} from "./berlinMapConstants";
import { BERLIN_MAP_DISTRICT_PATH_SELECTOR } from "./prepareBerlinMapSvg";

export type BerlinMapPoint = { x: number; y: number };

export type DistrictAnchor = {
  bezirkId: string;
  cx: number;
  cy: number;
};

export type DistrictSvgBounds = {
  bezirkId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function mergeSvgBoxIntoBounds(
  bounds: DistrictSvgBounds,
  box: DOMRect,
): DistrictSvgBounds {
  const x2 = Math.max(bounds.x + bounds.width, box.x + box.width);
  const y2 = Math.max(bounds.y + bounds.height, box.y + box.height);
  const x1 = Math.min(bounds.x, box.x);
  const y1 = Math.min(bounds.y, box.y);
  return {
    bezirkId: bounds.bezirkId,
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1,
  };
}

export function unionDistrictPathBBox(
  svgRoot: SVGSVGElement,
  bezirkId: string,
): DOMRect | null {
  const paths = svgRoot.querySelectorAll<SVGPathElement>(
    `path[data-bezirk="${CSS.escape(bezirkId)}"][data-map-role="district"]`,
  );
  if (paths.length === 0) {
    return null;
  }

  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;

  paths.forEach((path) => {
    const box = path.getBBox();
    x1 = Math.min(x1, box.x);
    y1 = Math.min(y1, box.y);
    x2 = Math.max(x2, box.x + box.width);
    y2 = Math.max(y2, box.y + box.height);
  });

  return new DOMRect(x1, y1, x2 - x1, y2 - y1);
}

export function readDistrictBoundsFromSvg(
  svgRoot: SVGSVGElement,
): DistrictSvgBounds[] {
  const paths = svgRoot.querySelectorAll<SVGPathElement>(
    BERLIN_MAP_DISTRICT_PATH_SELECTOR,
  );
  const boundsById = new Map<string, DistrictSvgBounds>();

  paths.forEach((path) => {
    const bezirkId = path.getAttribute("data-bezirk")?.trim();
    if (!bezirkId) {
      return;
    }
    const box = path.getBBox();
    const existing = boundsById.get(bezirkId);
    if (!existing) {
      boundsById.set(bezirkId, {
        bezirkId,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      });
      return;
    }
    boundsById.set(bezirkId, mergeSvgBoxIntoBounds(existing, box));
  });

  return [...boundsById.values()];
}

export type LevelMapMarker = {
  level: DistrictLevelSummary;
  district: District;
  x: number;
  y: number;
};

export type DistrictOverviewMarker = {
  district: District;
  level: DistrictLevelSummary;
  x: number;
  y: number;
};

export function readDistrictAnchorsFromSvg(
  svgRoot: SVGSVGElement,
): DistrictAnchor[] {
  return readDistrictBoundsFromSvg(svgRoot).map((bounds) => ({
    bezirkId: bounds.bezirkId,
    cx: bounds.x + bounds.width / 2,
    cy: bounds.y + bounds.height / 2,
  }));
}

function orbitPosition(
  anchor: DistrictAnchor,
  index: number,
  total: number,
): BerlinMapPoint {
  if (total <= 1) {
    return { x: anchor.cx, y: anchor.cy };
  }
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  return {
    x: anchor.cx + LEVEL_MARKER_ORBIT_RADIUS * Math.cos(angle),
    y: anchor.cy + LEVEL_MARKER_ORBIT_RADIUS * Math.sin(angle),
  };
}

function clampToViewBox(point: BerlinMapPoint): BerlinMapPoint {
  const pad = 12;
  return {
    x: Math.min(BERLIN_MAP_VIEWBOX.width - pad, Math.max(pad, point.x)),
    y: Math.min(BERLIN_MAP_VIEWBOX.height - pad, Math.max(pad, point.y)),
  };
}

/** Markerposition in Prozent innerhalb des Bezirksrechtecks im SVG. */
export function mapMarkerPointFromDistrictBounds(
  bounds: DistrictSvgBounds,
  position: DistrictLevelMapMarkerPosition,
): BerlinMapPoint {
  const xPct = Math.min(100, Math.max(0, position.x));
  const yPct = Math.min(100, Math.max(0, position.y));
  return {
    x: bounds.x + (xPct / 100) * bounds.width,
    y: bounds.y + (yPct / 100) * bounds.height,
  };
}

export function resolveLevelMapMarkerPoint(
  level: DistrictLevelSummary,
  anchor: DistrictAnchor,
  bounds: DistrictSvgBounds | undefined,
  index: number,
  total: number,
): BerlinMapPoint {
  const custom = level.mapMarkerPosition;
  if (custom && bounds) {
    return clampToViewBox(mapMarkerPointFromDistrictBounds(bounds, custom));
  }
  return clampToViewBox(orbitPosition(anchor, index, total));
}

export function resolveDistrictNameLabelPoint(
  bounds: DistrictSvgBounds,
  offset: DistrictLevelMapMarkerPosition | null | undefined,
): BerlinMapPoint {
  if (offset) {
    return clampToViewBox(mapMarkerPointFromDistrictBounds(bounds, offset));
  }
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function buildLevelMapMarkers(
  districts: District[],
  anchors: DistrictAnchor[],
  bounds: DistrictSvgBounds[],
): LevelMapMarker[] {
  const anchorById = new Map(anchors.map((a) => [a.bezirkId, a]));
  const boundsById = new Map(bounds.map((b) => [b.bezirkId, b]));
  const markers: LevelMapMarker[] = [];

  for (const district of districts) {
    const key = district.bezirkId;
    if (!key || district.levels.length === 0) {
      continue;
    }
    const anchor = anchorById.get(key);
    if (!anchor) {
      continue;
    }
    const districtBounds = boundsById.get(key);

    district.levels.forEach((level, index) => {
      const orbitIndex = index;
      const point = resolveLevelMapMarkerPoint(
        level,
        anchor,
        districtBounds,
        orbitIndex,
        district.levels.length,
      );
      markers.push({
        level,
        district,
        x: point.x,
        y: point.y,
      });
    });
  }

  return markers;
}

export function buildDistrictOverviewMarkers(
  districts: District[],
  anchors: DistrictAnchor[],
  bounds: DistrictSvgBounds[],
): DistrictOverviewMarker[] {
  const anchorById = new Map(anchors.map((a) => [a.bezirkId, a]));
  const boundsById = new Map(bounds.map((b) => [b.bezirkId, b]));
  const markers: DistrictOverviewMarker[] = [];

  for (const district of districts) {
    const key = district.bezirkId;
    if (!key || district.levels.length === 0) {
      continue;
    }
    const anchor = anchorById.get(key);
    if (!anchor) {
      continue;
    }
    const districtBounds = boundsById.get(key);

    district.levels.forEach((level, index) => {
      const point = resolveLevelMapMarkerPoint(
        level,
        anchor,
        districtBounds,
        index,
        district.levels.length,
      );
      markers.push({
        district,
        level,
        x: point.x,
        y: point.y,
      });
    });
  }

  return markers;
}

export function findDistrictByRouteParam(
  districts: District[],
  routeId: string | undefined,
): District | undefined {
  if (!routeId) {
    return undefined;
  }
  return districts.find(
    (d) =>
      (d.slug != null && d.slug === routeId) ||
      d.documentId === routeId ||
      String(d.id) === routeId ||
      d.bezirkId === routeId,
  );
}

/** Kanonische Karten-URL-Identität (`/karte/:slug`). */
export function districtRouteId(district: District): string {
  const slug = district.slug?.trim();
  if (slug) {
    return slug;
  }
  return district.documentId ?? String(district.id);
}
