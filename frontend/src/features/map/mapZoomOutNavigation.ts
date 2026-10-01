export type MapZoomOutLocationState = {
  mapZoomOut?: boolean;
  /** Ersatzbezirk, falls keine gespeicherte Kartenansicht vorhanden ist. */
  districtRouteId?: string;
};

export function createMapZoomOutLocationState(
  districtRouteId: string,
): MapZoomOutLocationState {
  return { mapZoomOut: true, districtRouteId };
}

export function isMapZoomOutRequest(state: unknown): boolean {
  if (typeof state !== "object" || state === null) {
    return false;
  }
  return (state as MapZoomOutLocationState).mapZoomOut === true;
}

export function getMapZoomOutDistrictRoute(state: unknown): string | null {
  if (typeof state !== "object" || state === null) {
    return null;
  }
  const routeId = (state as MapZoomOutLocationState).districtRouteId;
  return typeof routeId === "string" && routeId.trim() ? routeId : null;
}
