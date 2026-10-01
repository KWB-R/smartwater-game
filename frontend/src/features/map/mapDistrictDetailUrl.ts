import { ROUTES } from "@/routes/paths";
import type { District } from "@/types/content";
import {
  defaultMapSelectedLevelKey,
  levelMatchesRouteParam,
  levelProgressKey,
} from "@/features/level/levelProgress";
import { isLevelVisibleOnMap } from "@/features/map/mapBonusLevelUnlock";

export type MapLevelStartLocationState = {
  levelStartKey?: unknown;
  /** Nach Schließen des Level-Detail-Sheets (z. B. Galerie-Detail). */
  levelDetailReturnTo?: unknown;
};

export function getRouteLevelStartKey(state: unknown): string | null {
  if (typeof state !== "object" || state === null) {
    return null;
  }
  const { levelStartKey } = state as MapLevelStartLocationState;
  return typeof levelStartKey === "string" && levelStartKey.trim()
    ? levelStartKey
    : null;
}

/** Erlaubter Return-Pfad nach Level-Detail (aktuell: Galerie-Deep-Link). */
export function getLevelDetailReturnTo(state: unknown): string | null {
  if (typeof state !== "object" || state === null) {
    return null;
  }
  const { levelDetailReturnTo } = state as MapLevelStartLocationState;
  if (typeof levelDetailReturnTo !== "string") {
    return null;
  }
  const path = levelDetailReturnTo.trim();
  const galleryPrefix = `${ROUTES.gallerie}/`;
  if (!path.startsWith(galleryPrefix) || path.length <= galleryPrefix.length) {
    return null;
  }
  return path;
}

export type MapDistrictDetailPathMatch = {
  districtRouteId: string;
  levelKey: string | null;
};

/** Pfad `/karte/:bezirk/detail` oder `/karte/:bezirk/detail/:levelKey`. */
export function matchMapDistrictDetailPathname(
  pathname: string,
): MapDistrictDetailPathMatch | null {
  const prefix = `${ROUTES.map}/`;
  if (!pathname.startsWith(prefix)) {
    return null;
  }
  const rest = pathname.slice(prefix.length);
  const segments = rest.split("/").filter(Boolean);
  if (segments.length < 2 || segments[1] !== "detail") {
    return null;
  }
  const districtRouteId = decodeURIComponent(segments[0]);
  const levelKey =
    segments.length >= 3 && segments[2]
      ? decodeURIComponent(segments[2])
      : null;
  return { districtRouteId, levelKey };
}

export function isMapDistrictDetailPathname(pathname: string): boolean {
  return matchMapDistrictDetailPathname(pathname) != null;
}

export function mapDistrictDetailLocation(
  districtRouteId: string,
  options?: { detail?: boolean; levelKey?: string | null },
): { pathname: string; hash: string } {
  if (options?.detail) {
    return {
      pathname: ROUTES.mapDistrictLevelDetail(
        districtRouteId,
        options.levelKey,
      ),
      hash: "",
    };
  }
  return {
    pathname: ROUTES.mapDistrictDetail(districtRouteId),
    hash: "",
  };
}

export function resolveMapDetailLevelKey(
  district: District,
  explicitKey: string | null,
): string | null {
  const visibleLevels = district.levels.filter((level) =>
    isLevelVisibleOnMap(district, level),
  );
  if (explicitKey) {
    const explicitLevel = visibleLevels.find((level) =>
      levelMatchesRouteParam(level, explicitKey),
    );
    if (explicitLevel) {
      // Die interne Levelauswahl verwendet weiterhin den Fortschrittsschlüssel.
      return levelProgressKey(explicitLevel);
    }
  }
  return defaultMapSelectedLevelKey(visibleLevels);
}
