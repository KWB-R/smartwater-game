export const BERLIN_MAP_VIEWBOX = {
  width: 1342.07,
  height: 1057.02,
} as const;

/** Startübersicht und maximale Verkleinerung; 1 entspricht der gesamten SVG-Fläche. */
const MAP_OVERVIEW_VIEWBOX_WIDTH_FACTOR = 1.12;

export const MAP_OVERVIEW_VIEWBOX_WIDTH =
  BERLIN_MAP_VIEWBOX.width * MAP_OVERVIEW_VIEWBOX_WIDTH_FACTOR;

/** Abstand mehrerer Level-Marker um den Bezirks-Anker (SVG-Einheiten). */
export const LEVEL_MARKER_ORBIT_RADIUS = 22;

/** Level-Pin in Detail-/Zoom-Ansicht (SVG-Einheiten). */
export const MAP_LEVEL_MARKER_PIN_WIDTH = 45;
export const MAP_LEVEL_MARKER_PIN_HEIGHT = 65;

/** Größerer Kronenmarker mit demselben Seitenverhältnis wie der normale Marker. */
export const MAP_LEVEL_MAX_MARKER_WIDTH = 55;
export const MAP_LEVEL_MAX_MARKER_HEIGHT = 80;

/** Geschenkmarker für Bonuslevel in derselben Skalierung wie die Levelmarker. */
export const MAP_BONUS_LEVEL_GIFT_MARKER_WIDTH = 48;
export const MAP_BONUS_LEVEL_GIFT_MARKER_HEIGHT = 60;
