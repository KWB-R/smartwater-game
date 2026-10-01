import { ROUTES } from "@/routes/paths";

/** 1-basierte Slide-Nummer in `/slideshow/:slideIndex`. */
export function slideshowSlidePath(zeroBasedIndex: number): string {
  return ROUTES.slideshowSlide(zeroBasedIndex + 1);
}

/**
 * Liest die Foliennummer aus der URL.
 * Fehlende oder ungültige Nummern wählen den ersten Index; zu große die letzte Folie.
 */
export function parseSlideshowSlideParam(
  raw: string | undefined,
  slideCount: number,
): number {
  if (slideCount <= 0) {
    return 0;
  }
  if (raw == null || raw === "" || !/^\d+$/.test(raw)) {
    return 0;
  }
  const oneBased = Number(raw);
  if (oneBased < 1) {
    return 0;
  }
  return Math.min(oneBased, slideCount) - 1;
}
