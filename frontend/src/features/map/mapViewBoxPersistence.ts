import type { MapViewBox } from "./useBerlinMapViewBox";

let lastMapViewBox: MapViewBox | null = null;

export function rememberMapViewBox(viewBox: MapViewBox): void {
  lastMapViewBox = viewBox;
}

export function consumeRememberedMapViewBox(): MapViewBox | null {
  const snapshot = lastMapViewBox;
  lastMapViewBox = null;
  return snapshot;
}
