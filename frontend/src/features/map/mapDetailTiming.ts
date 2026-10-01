/** Dauer Bezirk-Zoom auf der Karte (ms), ease-out (siehe `useBerlinMapViewBox`). */
export const DISTRICT_MAP_FOCUS_ANIMATION_MS = 700;

/** Das Detail-Sheet gleichzeitig mit dem Kartenzoom einblenden. */
export const MAP_DETAIL_SHEET_OPEN_DELAY_MS = 0;

/** Sheet-Slide-Dauer (ease-out, unabhängig vom Karten-Zoom). */
export const MAP_DETAIL_SHEET_ENTER_DURATION_MS = 380;

/** Bei voller Sheet-Höhe den Ersatzfokus nahe dem oberen Viewportrand setzen. */
const MAP_DETAIL_SHEET_TOP_FALLBACK_RATIO = 0.04;

/** Etwas mehr Sheet-Höhe einplanen, damit der gewählte Bezirk oberhalb sichtbar bleibt. */
const MAP_DETAIL_FOCUS_SHEET_CONSERVATIVE_INSET_PX = 40;

function estimateMapDetailSheetTopClientY(): number {
  return Math.round(
    window.innerHeight * MAP_DETAIL_SHEET_TOP_FALLBACK_RATIO,
  );
}

export function mapDetailSheetTopForFocus(
  measuredSheetTopPx: number | null | undefined,
): number {
  const baseline =
    measuredSheetTopPx != null && measuredSheetTopPx > 0
      ? measuredSheetTopPx
      : estimateMapDetailSheetTopClientY();
  return Math.max(24, baseline - MAP_DETAIL_FOCUS_SHEET_CONSERVATIVE_INSET_PX);
}

/** Nach der Sheet-Einblendung kurz warten, bevor die Sterne erscheinen. */
export const MAP_POST_LEVEL_STAR_REVEAL_START_MS = 360;

/** Abstand zwischen den Sternanimationen; die Partikeleffekte überlappen leicht. */
export const MAP_POST_LEVEL_STAR_STAGGER_MS = 320;
