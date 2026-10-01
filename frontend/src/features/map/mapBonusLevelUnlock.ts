import type { District, DistrictLevelSummary } from "@/types/content";
import { levelProgressKey, readLevelProgress } from "@/features/level/levelProgress";
import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import { localStore } from "@/lib/storage/webStorage";
import { districtRouteId } from "@/features/map/berlinMapLayout";

export type MapBonusUnlockLocationState = {
  bonusUnlockDistrictRouteId?: unknown;
};

function storageKey(districtRouteIdValue: string): string {
  return `${STORAGE_KEYS.mapBonusRevealedPrefix}${districtRouteIdValue}`;
}

export function getPrimaryLevel(
  district: District,
): DistrictLevelSummary | null {
  const explicitPrimary = district.levels.find((l) => l.primaryLevel === true);
  if (explicitPrimary) {
    return explicitPrimary;
  }
  const fallback = district.levels.find((l) => l.primaryLevel !== false);
  return fallback ?? district.levels[0] ?? null;
}

export function getBonusLevels(district: District): DistrictLevelSummary[] {
  return district.levels.filter((level) => level.primaryLevel === false);
}

function isPrimaryLevelCompleted(district: District): boolean {
  const primary = getPrimaryLevel(district);
  if (!primary) {
    return false;
  }
  const progress = readLevelProgress(levelProgressKey(primary));
  return progress?.completed === true && progress.stars >= 2;
}

export function readBonusLevelsRevealed(districtRouteId: string): boolean {
  return localStore.get(storageKey(districtRouteId)) === "1";
}

export function markBonusLevelsRevealed(districtRouteId: string): void {
  localStore.set(storageKey(districtRouteId), "1");
}

export function clearBonusLevelsRevealed(districtRouteId: string): void {
  localStore.remove(storageKey(districtRouteId.trim()));
}

export function hasUnrevealedBonusLevels(district: District): boolean {
  if (getBonusLevels(district).length === 0) {
    return false;
  }
  if (!isPrimaryLevelCompleted(district)) {
    return false;
  }
  return !readBonusLevelsRevealed(districtRouteId(district));
}

export function isLevelVisibleOnMap(
  district: District,
  level: DistrictLevelSummary,
): boolean {
  if (level.primaryLevel !== false) {
    return true;
  }
  return readBonusLevelsRevealed(districtRouteId(district));
}

export function findDistrictPendingBonusUnlock(
  districts: District[],
): District | undefined {
  return districts.find(hasUnrevealedBonusLevels);
}

export function readBonusUnlockDistrictRouteId(state: unknown): string | null {
  if (typeof state !== "object" || state === null) {
    return null;
  }
  const raw = (state as MapBonusUnlockLocationState).bonusUnlockDistrictRouteId;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
