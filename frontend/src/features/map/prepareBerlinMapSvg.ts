const SVG_GROUP_ID_TO_BEZIRK_ID: Readonly<Record<string, string>> = {
  "Marzahn-Hellersdorf": "marzahn-hellersdorf",
  Lichtenberg: "lichtenberg",
  Spandau: "spandau",
  Pankow: "pankow",
  Reinickendorf: "reinickendorf",
  "Charlottenburg-Wilmersdorf": "charlottenburg-wilmersdorf",
  "Steglitz-Zehlendorf": "steglitz-zehlendorf",
  "Tempelhof-Schoeneberg": "tempelhof-schoneberg",
  Neukoelln: "neukolln",
  Mitte: "mitte",
  "Friedrichshain-Kreuzberg": "friedrichshain-kreuzberg",
  "Treptow-Koepenick": "treptow-kopenick",
};

export function svgGroupIdToBezirkId(groupId: string): string | null {
  const trimmed = groupId.trim();
  return SVG_GROUP_ID_TO_BEZIRK_ID[trimmed] ?? null;
}

const DIRECT_BEZIRK_PATH_SELECTOR =
  ':scope > path[data-name="Bezirk"], :scope > path[id="Bezirk"], :scope > path[id^="Bezirk-"]';

const BEZIRK_GROUP_SELECTOR =
  ':scope > g[data-name="Bezirk"], :scope > g[id="Bezirk"], :scope > g[id^="Bezirk-"]';

function findDistrictPaths(group: SVGGElement): SVGPathElement[] {
  const paths: SVGPathElement[] = [];
  const seen = new Set<SVGPathElement>();

  const add = (path: SVGPathElement) => {
    if (seen.has(path)) {
      return;
    }
    seen.add(path);
    paths.push(path);
  };

  group.querySelectorAll<SVGPathElement>(DIRECT_BEZIRK_PATH_SELECTOR).forEach(add);

  for (const bezirkGroup of group.querySelectorAll<SVGGElement>(
    BEZIRK_GROUP_SELECTOR,
  )) {
    bezirkGroup.querySelectorAll<SVGPathElement>(":scope > path").forEach(add);
  }

  if (paths.length === 0) {
    const legacyDistrict = group.querySelector<SVGPathElement>(
      ':scope > path[data-name="Loecher"]',
    );
    if (legacyDistrict) {
      add(legacyDistrict);
    }
  }

  return paths;
}

function findLocherContainer(group: SVGGElement): SVGGElement | null {
  return group.querySelector<SVGGElement>(
    ':scope > g[id="Loecher"], :scope > g[id^="Loecher-"], :scope > g[data-name="Loecher"]',
  );
}

const LOCHER_SHAPE_SELECTOR =
  "path, circle, rect, ellipse, polygon, polyline";

function prepareBerlinMapSvg(svg: SVGSVGElement): void {
  for (const child of svg.children) {
    if (!(child instanceof SVGGElement)) {
      continue;
    }
    const bezirkId = svgGroupIdToBezirkId(child.id);
    if (!bezirkId) {
      continue;
    }

    const districtPaths = findDistrictPaths(child);
    const locherContainer = findLocherContainer(child);

    for (const districtPath of districtPaths) {
      districtPath.setAttribute("data-bezirk", bezirkId);
      districtPath.setAttribute("data-map-role", "district");
      districtPath.removeAttribute("class");
    }

    if (locherContainer) {
      locherContainer.setAttribute("data-bezirk", bezirkId);
      locherContainer.setAttribute("data-map-role", "locher");
      locherContainer.setAttribute("class", "pointer-events-none");
      for (const shape of locherContainer.querySelectorAll(LOCHER_SHAPE_SELECTOR)) {
        shape.removeAttribute("class");
      }
    }
  }
}

export function parsePreparedBerlinMapSvg(rawSvg: string): SVGSVGElement | null {
  const doc = new DOMParser().parseFromString(rawSvg, "image/svg+xml");
  const svg = doc.documentElement;
  if (!(svg instanceof SVGSVGElement)) {
    return null;
  }
  prepareBerlinMapSvg(svg);
  return svg;
}

export const BERLIN_MAP_DISTRICT_PATH_SELECTOR =
  'path[data-bezirk][data-map-role="district"]';
