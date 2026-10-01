/** Intensität des Platzierungseffekts für Explosion und Flug zum Balken. */

/** Untere Grenze, sobald Punkte gesammelt wurden — immer sichtbare Bewegung. */
export const PLACEMENT_BURST_INTENSITY_MIN = 8;
/** Obere Grenze gegen zu viele DOM-Partikel. */
export const PLACEMENT_BURST_INTENSITY_MAX = 28;
/** Kleine Explosion ohne Punkte (kein Balken-Flug). */
export const PLACEMENT_BURST_INTENSITY_ZERO = 6;

/**
 * Begrenzt die Effektintensität anhand der gewichteten Punkte auf MIN bis MAX.
 */
export function placementTileBurstIntensity(pointDelta: number): number {
  if (pointDelta <= 0) {
    return PLACEMENT_BURST_INTENSITY_ZERO;
  }
  return Math.min(
    PLACEMENT_BURST_INTENSITY_MAX,
    Math.max(
      PLACEMENT_BURST_INTENSITY_MIN,
      Math.round(8 + pointDelta * 1.25),
    ),
  );
}
