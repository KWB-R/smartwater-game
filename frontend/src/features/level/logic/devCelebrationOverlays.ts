/** Kurze Bonus-/Kombi-Overlays beim lokalen Entwickeln (`DEV_FAST_CELEBRATION_OVERLAYS=true`). */
function isDevFastCelebrationOverlays(): boolean {
  return (
    import.meta.env.DEV &&
    import.meta.env.DEV_FAST_CELEBRATION_OVERLAYS === "true"
  );
}

/** null bedeutet manuelles Schließen in Produktion und regulärer Entwicklung. */
export function getComboDialogAutoCloseMs(): number | null {
  return isDevFastCelebrationOverlays() ? 400 : null;
}

export function getComboRevealBurstHoldMs(reducedMotion: boolean): number {
  if (isDevFastCelebrationOverlays()) {
    return reducedMotion ? 120 : 320;
  }
  return reducedMotion ? 0 : 2200;
}
