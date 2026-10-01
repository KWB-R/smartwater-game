import {
  BERLIN_MAP_VIEWBOX,
  MAP_OVERVIEW_VIEWBOX_WIDTH,
} from "./berlinMapConstants";

/** In der vollständigen Kartenübersicht das Overlay zeigen. */
const MAP_PAGE_CONTENT_FADE_START_VIEWBOX_WIDTH =
  MAP_OVERVIEW_VIEWBOX_WIDTH;

/** Ab dieser Zoomstufe das Overlay vollständig ausblenden. */
const MAP_PAGE_CONTENT_FADE_END_VIEWBOX_WIDTH = BERLIN_MAP_VIEWBOX.width * 0.72;

export function mapPageContentOpacity(viewBoxWidth: number): number {
  const start = MAP_PAGE_CONTENT_FADE_START_VIEWBOX_WIDTH;
  const end = MAP_PAGE_CONTENT_FADE_END_VIEWBOX_WIDTH;
  if (viewBoxWidth >= start) {
    return 1;
  }
  if (viewBoxWidth <= end) {
    return 0;
  }
  return (viewBoxWidth - end) / (start - end);
}

/** Bezirksnamen auf der Karte — sichtbar wenn Intro-Overlay ausgeblendet ist. */
export function mapDistrictLabelsOpacity(viewBoxWidth: number): number {
  return 1 - mapPageContentOpacity(viewBoxWidth);
}
