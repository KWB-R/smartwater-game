import type { MapReturnFromShareLocationState } from "@/features/map/mapPostLevelCelebrationState";
import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import { sessionStore } from "@/lib/storage/webStorage";

const STORAGE_KEY = STORAGE_KEYS.mapPostLevelCelebration;

function readRaw(): MapReturnFromShareLocationState | null {
  return sessionStore.getJson(STORAGE_KEY, (value) => {
    if (typeof value !== "object" || value === null) {
      return null;
    }
    const s = value as MapReturnFromShareLocationState;
    return s.mapPostLevelCelebration === true ? s : null;
  });
}

function stashedDistrictRouteId(
  stashed: MapReturnFromShareLocationState,
): string | null {
  const raw = stashed.celebrationDistrictRouteId;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function stashMapReturnFromShareState(
  state: MapReturnFromShareLocationState,
): void {
  sessionStore.setJson(STORAGE_KEY, state);
}

export function peekMapReturnFromShareState(): MapReturnFromShareLocationState | null {
  return readRaw();
}

export function clearMapReturnFromShareState(): void {
  sessionStore.remove(STORAGE_KEY);
}

/** Speichert den Karten-Abschlusszustand als Absicherung für die Navigation. */
export function resolveMapNavigationState(
  historyState: unknown,
  activeDistrictRouteId?: string | null,
): unknown {
  const stashed = peekMapReturnFromShareState();
  if (!stashed) {
    return historyState;
  }
  const stashedDistrict = stashedDistrictRouteId(stashed);
  if (
    activeDistrictRouteId &&
    stashedDistrict &&
    stashedDistrict !== activeDistrictRouteId
  ) {
    return historyState;
  }
  if (typeof historyState === "object" && historyState !== null) {
    return { ...historyState, ...stashed };
  }
  return { ...stashed };
}

export function peekMapReturnFromShareStateForDistrict(
  districtRouteId: string | null | undefined,
): MapReturnFromShareLocationState | null {
  const stashed = peekMapReturnFromShareState();
  if (!stashed || !districtRouteId?.trim()) {
    return stashed;
  }
  const stashedDistrict = stashedDistrictRouteId(stashed);
  if (stashedDistrict && stashedDistrict !== districtRouteId.trim()) {
    return null;
  }
  return stashed;
}
