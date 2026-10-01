import {
  getRouteLevelStartKey,
  isMapDistrictDetailPathname,
} from "@/features/map/mapDistrictDetailUrl";
import { resolveMapNavigationState } from "@/features/map/mapPostLevelCelebrationStorage";
import type {
  MapPostLevelCelebrationLocationState,
  MapReturnFromShareLocationState,
} from "@/features/map/mapPostLevelCelebrationState";

function clampStarCount(raw: unknown): 1 | 2 | 3 | null {
  if (raw === 1 || raw === 2 || raw === 3) {
    return raw;
  }
  return null;
}

function clampFromStarCount(raw: unknown, starCount: number): number {
  if (raw !== 0 && raw !== 1 && raw !== 2 && raw !== 3) {
    return 0;
  }
  // Ohne Unterschied zum Zielstand keine Sternanimation starten.
  return Math.min(raw, Math.max(0, starCount));
}

export function readMapPostLevelCelebration(
  state: unknown,
  options?: { districtRouteId?: string | null },
): {
  starCount: 1 | 2 | 3;
  fromStarCount: number;
  bonusAfterDismiss: boolean;
  mapDistrictWasUnhighlighted: boolean;
  mapDistrictNewlyFullySolved: boolean;
  mapRevealBonus: boolean;
  mapMarkerWasLevelMaxBeforeRun: boolean;
} | null {
  const merged = resolveMapNavigationState(
    state,
    options?.districtRouteId ?? null,
  );
  if (typeof merged !== "object" || merged === null) {
    return null;
  }
  const s = merged as MapPostLevelCelebrationLocationState;
  if (s.mapPostLevelCelebration !== true) {
    return null;
  }
  const starCount = clampStarCount(s.celebrationStarCount);
  if (!starCount) {
    return null;
  }
  const mapRevealBonus =
    s.celebrationMapRevealBonus === true ||
    s.celebrationBonusAfterDismiss === true;
  return {
    starCount,
    fromStarCount: clampFromStarCount(s.celebrationFromStarCount, starCount),
    bonusAfterDismiss: mapRevealBonus,
    mapDistrictWasUnhighlighted:
      s.celebrationMapDistrictWasUnhighlighted === true,
    mapDistrictNewlyFullySolved:
      s.celebrationMapDistrictNewlyFullySolved === true,
    mapRevealBonus,
    mapMarkerWasLevelMaxBeforeRun:
      s.celebrationMapMarkerWasLevelMaxBeforeRun === true,
  };
}

export function isMapPostLevelMapIntroDone(state: unknown): boolean {
  const merged = resolveMapNavigationState(state, null);
  if (typeof merged !== "object" || merged === null) {
    return false;
  }
  return (merged as MapPostLevelCelebrationLocationState)
    .mapPostLevelMapIntroDone === true;
}

export function isMapPostLevelDetailPending(state: unknown): boolean {
  const merged = resolveMapNavigationState(state, null);
  if (typeof merged !== "object" || merged === null) {
    return false;
  }
  return (merged as MapPostLevelCelebrationLocationState)
    .mapPostLevelDetailPending === true;
}

/** Liest celebrationDistrictRouteId aus Router-Zustand oder Sitzungsspeicher. */
export function readMapPostLevelCelebrationDistrictRouteId(
  state: unknown,
): string | null {
  const merged = resolveMapNavigationState(state, null);
  if (typeof merged !== "object" || merged === null) {
    return null;
  }
  const raw = (merged as MapPostLevelCelebrationLocationState)
    .celebrationDistrictRouteId;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

/**
 * Der Abschlussablauf steht noch aus, solange das Kartenintro nicht beendet ist.
 * Auch bei offenem Detail-Sheet werden Kartenänderungen bis zum Intro zurückgehalten.
 */
export function isMapPostLevelMapIntroPending(params: {
  state: unknown;
  districtRouteId?: string | null;
}): boolean {
  if (isMapPostLevelMapIntroDone(params.state)) {
    return false;
  }
  return (
    readMapPostLevelCelebration(params.state, {
      districtRouteId: params.districtRouteId ?? null,
    }) != null
  );
}

/** Den Bezirk bis zum Kartenintro im bisherigen Farbzustand halten. */
export function shouldDeferMapDistrictHighlightForIntro(params: {
  pathname: string;
  state: unknown;
  districtRouteId?: string | null;
  introPhase: "idle" | "running" | "complete";
  deferDistrictHighlightState: boolean;
}): boolean {
  const celebration = readMapPostLevelCelebration(params.state, {
    districtRouteId: params.districtRouteId ?? null,
  });
  if (!celebration?.mapDistrictWasUnhighlighted) {
    return false;
  }
  if (!params.districtRouteId?.trim()) {
    return false;
  }
  if (isMapPostLevelMapIntroDone(params.state)) {
    return false;
  }
  if (params.introPhase === "complete") {
    return false;
  }
  if (
    params.introPhase === "running" &&
    !params.deferDistrictHighlightState
  ) {
    return false;
  }
  // Während das Detail offen oder das Intro noch nicht gestartet ist, die Kartenänderungen aufschieben.
  return true;
}

/** Kartenintro auf /karte nach dem Schließen des Abschlussdetails. */
export function isMapPostLevelMapIntroActive(location: {
  pathname: string;
  state: unknown;
  districtRouteId?: string | null;
}): boolean {
  if (isMapDistrictDetailPathname(location.pathname)) {
    return false;
  }
  if (isMapPostLevelDetailPending(location.state)) {
    return false;
  }
  return isMapPostLevelMapIntroPending({
    state: location.state,
    districtRouteId: location.districtRouteId ?? null,
  });
}

/** Während des Abschlussdetails keine Bonusdialoge darüber öffnen. */
export function isMapPostLevelDetailFlowActive(location: {
  pathname: string;
  state: unknown;
  districtRouteId?: string | null;
}): boolean {
  const mergedState = resolveMapNavigationState(
    location.state,
    location.districtRouteId ?? null,
  );
  if (isMapPostLevelDetailPending(mergedState)) {
    return (
      readMapPostLevelCelebration(location.state, {
        districtRouteId: location.districtRouteId ?? null,
      }) != null
    );
  }
  if (!isMapDistrictDetailPathname(location.pathname)) {
    return false;
  }
  return (
    getRouteLevelStartKey(mergedState) != null ||
    readMapPostLevelCelebration(location.state, {
      districtRouteId: location.districtRouteId ?? null,
    }) != null
  );
}

export function createMapReturnFromShareLocationState(params: {
  levelStartKey: string;
  districtRouteId: string;
  starCount: 1 | 2 | 3;
  fromStarCount?: 0 | 1 | 2 | 3;
  bonusAfterDismiss: boolean;
  mapDistrictWasUnhighlighted?: boolean;
  mapDistrictNewlyFullySolved?: boolean;
  mapRevealBonus?: boolean;
  mapMarkerWasLevelMaxBeforeRun?: boolean;
  /** Steuert, ob zuerst das Detail-Sheet auf /karte geöffnet wird; standardmäßig true. */
  detailPending?: boolean;
}): MapReturnFromShareLocationState {
  const fromStarCount = Math.min(
    params.fromStarCount ?? 0,
    params.starCount,
  ) as 0 | 1 | 2 | 3;
  const districtRouteId = params.districtRouteId.trim();
  return {
    levelStartKey: params.levelStartKey,
    mapPostLevelCelebration: true,
    celebrationStarCount: params.starCount,
    celebrationDistrictRouteId: districtRouteId,
    ...(params.detailPending !== false
      ? { mapPostLevelDetailPending: true as const }
      : {}),
    ...(fromStarCount > 0 ? { celebrationFromStarCount: fromStarCount } : {}),
    ...(params.bonusAfterDismiss
      ? { celebrationBonusAfterDismiss: true as const }
      : {}),
    ...(params.mapDistrictWasUnhighlighted
      ? { celebrationMapDistrictWasUnhighlighted: true as const }
      : {}),
    ...(params.mapDistrictNewlyFullySolved
      ? { celebrationMapDistrictNewlyFullySolved: true as const }
      : {}),
    ...(params.mapRevealBonus || params.bonusAfterDismiss
      ? { celebrationMapRevealBonus: true as const }
      : {}),
    ...(params.mapMarkerWasLevelMaxBeforeRun
      ? { celebrationMapMarkerWasLevelMaxBeforeRun: true as const }
      : {}),
  };
}
