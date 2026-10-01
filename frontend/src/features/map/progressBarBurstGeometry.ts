/** Dauer des Balkenwachstums im Header; die Partikellandung wird damit abgestimmt. */
export const PROGRESS_BAR_FILL_ANIM_MS = 520;
/**
 * Partikel früher starten, damit sie beim Beginn des Balkenwachstums ankommen.
 * Mit placementRewardFlow abstimmen.
 */
export const PROGRESS_BAR_FILL_START_DELAY_MS = 200;

/** Viewport-Koordinaten der aktuellen Füllkante des Header-Fortschrittsbalkens. */
export function getProgressBarFillAnchor(
  trackEl: HTMLElement,
  score: number,
  maxScore: number,
): { x: number; y: number } {
  const absorb = getProgressBarFillAbsorb(trackEl, score, score, maxScore);
  return absorb.anchor;
}

/**
 * Berechnet den neu gefüllten Balkenabschnitt aus altem und neuem Punktestand.
 * Partikel landen darin und begleiten das Auffüllen.
 */
export function getProgressBarFillAbsorb(
  trackEl: HTMLElement,
  fromScore: number,
  toScore: number,
  maxScore: number,
): {
  anchor: { x: number; y: number };
  fillDeltaPx: number;
  barHalfHeight: number;
} {
  const tr = trackEl.getBoundingClientRect();
  const safeMax = Math.max(1, maxScore);
  const clampScore = (s: number) => Math.min(safeMax, Math.max(0, s));
  const from = clampScore(fromScore);
  const to = clampScore(toScore);
  const fromX = tr.left + (from / safeMax) * tr.width;
  const toX = tr.left + (to / safeMax) * tr.width;
  /**
   * Den Zielpunkt innerhalb der Füllfläche halten, damit gedrehte Kapseln den Rand nicht überragen.
   */
  const inset = Math.min(10, Math.max(4, tr.height * 0.42));
  return {
    anchor: {
      x: Math.max(fromX, toX) - inset,
      y: tr.top + tr.height / 2,
    },
    fillDeltaPx: Math.max(0, Math.abs(toX - fromX)),
    /** Vertikaler Abstand für die Partikelhöhe. */
    barHalfHeight: Math.max(1.5, tr.height * 0.5 - 3),
  };
}
