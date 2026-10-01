import type { District } from "@/types/content";
import { getPrimaryLevel } from "@/features/map/mapBonusLevelUnlock";
import {
  levelProgressKey,
  readLevelProgressForLevel,
  type LevelProgress,
} from "@/features/level/levelProgress";

/** Zählt abgeschlossene Hauptlevel für den Footer; Bonuslevel zählen nicht mit. */
export function isDistrictPrimarySolved(district: District): boolean {
  const primary = getPrimaryLevel(district);
  if (!primary) {
    return false;
  }
  return (
    readLevelProgressForLevel(primary, district.levels)?.completed === true
  );
}

/** Bezirk zählt als gelöst, wenn alle Level im Bezirk abgeschlossen sind. */
export function isDistrictPuzzleSolved(district: District): boolean {
  if (district.levels.length === 0) {
    return false;
  }
  return district.levels.every(
    (level) =>
      readLevelProgressForLevel(level, district.levels)?.completed === true,
  );
}

/** Karten-Füllung: gelb sobald mindestens ein Level im Bezirk abgeschlossen ist. */
export function isDistrictHighlightedOnMap(district: District): boolean {
  if (district.levels.length === 0) {
    return false;
  }
  return district.levels.some(
    (level) =>
      readLevelProgressForLevel(level, district.levels)?.completed === true,
  );
}

export function countDistrictsWithLevels(districts: District[]): number {
  return districts.filter((d) => d.levels.length > 0).length;
}

export function countSolvedDistricts(districts: District[]): number {
  return districts.filter(isDistrictPrimarySolved).length;
}

export function readAllLevelProgressForDistricts(
  districts: District[],
): Map<string, LevelProgress | null> {
  const allLevels = districts.flatMap((district) => district.levels);
  const map = new Map<string, LevelProgress | null>();
  for (const district of districts) {
    for (const level of district.levels) {
      const key = levelProgressKey(level);
      map.set(key, readLevelProgressForLevel(level, allLevels));
    }
  }
  return map;
}
