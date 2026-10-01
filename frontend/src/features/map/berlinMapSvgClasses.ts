/** Tailwind-Klassen für dynamische SVG-Bezirksflächen; sie müssen im Quelltext auffindbar sein. */
import { cn } from "@/lib/cn";
import type { District } from "@/types/content";
import { isDistrictHighlightedOnMap } from "@/features/map/mapDistrictProgress";

/** Muss zu MAP_DISTRICT_HIGHLIGHT_FILL_TRANSITION_MS passen. */
const MAP_SHAPE_BASE = "transition-[fill_650ms_ease-out]";

const MAP_DISTRICT_INTERACTIVE = cn(MAP_SHAPE_BASE, "cursor-pointer");

const MAP_DISTRICT_NO_CMS = "fill-white";

const MAP_DISTRICT_UNSOLVED = [
  "fill-[#ebebeb] hover:fill-[#e4e4e4] focus-visible:fill-[#e4e4e4]",
  "fill-[#e8e8e8] hover:fill-[#e1e1e1] focus-visible:fill-[#e1e1e1]",
  "fill-[#e5e5e5] hover:fill-[#dedede] focus-visible:fill-[#dedede]",
  "fill-[#e2e2e2] hover:fill-[#dbdbdb] focus-visible:fill-[#dbdbdb]",
  "fill-[#dfdfdf] hover:fill-[#d8d8d8] focus-visible:fill-[#d8d8d8]",
  "fill-[#dcdcdc] hover:fill-[#d5d5d5] focus-visible:fill-[#d5d5d5]",
] as const;

const MAP_LOCHER_UNSOLVED = "fill-[#c4c4c4]";

const MAP_DISTRICT_SOLVED =
  "fill-[#FAEB69] hover:fill-[#f7df7a] focus-visible:fill-[#f7df7a]";

const MAP_LOCHER_SOLVED = "fill-[#EBD650]";

function unsolvedDistrictGrayClassIndex(bezirkId: string): number {
  let hash = 0;
  for (let i = 0; i < bezirkId.length; i += 1) {
    hash = (hash + bezirkId.charCodeAt(i) * (i + 1)) % 997;
  }
  return hash % MAP_DISTRICT_UNSOLVED.length;
}

function districtPathClassName(
  hasDistrict: boolean,
  isSolved: boolean,
  bezirkId: string | null,
  instant = false,
): string {
  const interactive = instant
    ? "cursor-pointer"
    : MAP_DISTRICT_INTERACTIVE;
  if (!hasDistrict) {
    return cn(interactive, MAP_DISTRICT_NO_CMS);
  }
  if (isSolved) {
    return cn(interactive, MAP_DISTRICT_SOLVED);
  }
  const grayIndex =
    bezirkId != null && bezirkId.length > 0
      ? unsolvedDistrictGrayClassIndex(bezirkId)
      : 0;
  return cn(interactive, MAP_DISTRICT_UNSOLVED[grayIndex]);
}

function locherShapeClassName(
  hasDistrict: boolean,
  isSolved: boolean,
  instant = false,
): string {
  const base = instant ? undefined : MAP_SHAPE_BASE;
  if (!hasDistrict) {
    return cn(base, MAP_LOCHER_UNSOLVED);
  }
  if (isSolved) {
    return cn(base, MAP_LOCHER_SOLVED);
  }
  return cn(base, MAP_LOCHER_UNSOLVED);
}

const LOCHER_SHAPE_SELECTOR = "path, circle, rect, ellipse, polygon, polyline";

export function applyBerlinMapDistrictPathStyles(
  svg: SVGSVGElement,
  districtByBezirkId: Map<string, District>,
  options?: {
    deferHighlightedBezirkIds?: ReadonlySet<string>;
    /** Sofortige Gelbfärbung, synchron zum Partikelstart. */
    instantHighlightBezirkIds?: ReadonlySet<string>;
  },
): void {
  svg.removeAttribute("fill");

  const districtPaths = svg.querySelectorAll<SVGPathElement>(
    'path[data-bezirk][data-map-role="district"]',
  );
  districtPaths.forEach((path) => {
    const bezirkId = path.getAttribute("data-bezirk")?.trim();
    const district = bezirkId ? districtByBezirkId.get(bezirkId) : undefined;
    const isSolved =
      district != null ? isDistrictHighlightedOnMap(district) : false;
    const deferHighlight =
      bezirkId != null &&
      options?.deferHighlightedBezirkIds?.has(bezirkId) === true;
    const showSolved = isSolved && !deferHighlight;
    const instant =
      showSolved &&
      bezirkId != null &&
      options?.instantHighlightBezirkIds?.has(bezirkId) === true;
    path.removeAttribute("stroke");
    path.removeAttribute("stroke-width");
    path.removeAttribute("fill");
    path.setAttribute(
      "class",
      districtPathClassName(
        district != null,
        showSolved,
        bezirkId ?? null,
        instant,
      ),
    );
  });

  const locherGroups = svg.querySelectorAll<SVGGElement>(
    'g[data-bezirk][data-map-role="locher"]',
  );
  locherGroups.forEach((group) => {
    const bezirkId = group.getAttribute("data-bezirk")?.trim();
    const district = bezirkId ? districtByBezirkId.get(bezirkId) : undefined;
    const isSolved =
      district != null ? isDistrictHighlightedOnMap(district) : false;
    const deferHighlight =
      bezirkId != null &&
      options?.deferHighlightedBezirkIds?.has(bezirkId) === true;
    const showSolved = isSolved && !deferHighlight;
    const instant =
      showSolved &&
      bezirkId != null &&
      options?.instantHighlightBezirkIds?.has(bezirkId) === true;
    const className = locherShapeClassName(
      district != null,
      showSolved,
      instant,
    );
    group.querySelectorAll(LOCHER_SHAPE_SELECTOR).forEach((shape) => {
      shape.removeAttribute("fill");
      shape.setAttribute("class", className);
    });
  });
}
