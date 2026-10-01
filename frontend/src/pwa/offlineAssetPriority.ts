import {
  defaultMapSelectedLevelKey,
  levelProgressKey,
  readLevelProgress,
} from "@/features/level/levelProgress";
import {
  getPrimaryLevel,
  isLevelVisibleOnMap,
} from "@/features/map/mapBonusLevelUnlock";
import type { District, DistrictLevelSummary } from "@/types/content";

/** Priorität: 0 für globale Medien, 1 für das aktuelle Hauptlevel, 2 für verfügbare Bonuslevel, 3 für den Rest. */
export type OfflineAssetPriority = 0 | 1 | 2 | 3;

export type OfflinePriorityLevelRef = {
  district: District;
  level: DistrictLevelSummary;
  priority: 1 | 2 | 3;
};

/**
 * Bonuslevel erhalten Priorität 2, wenn sie sichtbar sind oder das Hauptlevel mit mindestens zwei Sternen abgeschlossen ist.
 * Priorität 1 erhält das erste offene Hauptlevel je Bezirk in CMS-Reihenfolge.
 */
export function classifyOfflineLevelPriority(
  district: District,
  level: DistrictLevelSummary,
): 1 | 2 | 3 {
  if (level.primaryLevel === false) {
    const primary = getPrimaryLevel(district);
    const primaryProgress = primary
      ? readLevelProgress(levelProgressKey(primary))
      : null;
    const unlockable =
      primaryProgress?.completed === true && primaryProgress.stars >= 2;
    if (isLevelVisibleOnMap(district, level) || unlockable) {
      return 2;
    }
    return 3;
  }

  const primaries = district.levels.filter((l) => l.primaryLevel !== false);
  const currentKey = defaultMapSelectedLevelKey(primaries);
  if (!currentKey || levelProgressKey(level) !== currentKey) {
    return 3;
  }
  const progress = readLevelProgress(levelProgressKey(level));
  if (progress?.completed === true) {
    return 3;
  }
  return 1;
}

/** Ordnet Level nach Priorität und innerhalb einer Gruppe nach CMS-Bezirksreihenfolge. */
export function orderLevelsByOfflinePriority(
  districts: readonly District[],
): OfflinePriorityLevelRef[] {
  const p1: OfflinePriorityLevelRef[] = [];
  const p2: OfflinePriorityLevelRef[] = [];
  const p3: OfflinePriorityLevelRef[] = [];

  for (const district of districts) {
    for (const level of district.levels) {
      const priority = classifyOfflineLevelPriority(district, level);
      const ref: OfflinePriorityLevelRef = { district, level, priority };
      if (priority === 1) {
        p1.push(ref);
      } else if (priority === 2) {
        p2.push(ref);
      } else {
        p3.push(ref);
      }
    }
  }

  return [...p1, ...p2, ...p3];
}

/** Niedrigere Zahl gewinnt (höhere Priorität). */
export function assignUrlPriority(
  urlPriorities: Map<string, OfflineAssetPriority>,
  url: string,
  priority: OfflineAssetPriority,
): void {
  const trimmed = url.trim();
  if (!trimmed) {
    return;
  }
  const prev = urlPriorities.get(trimmed);
  if (prev === undefined || priority < prev) {
    urlPriorities.set(trimmed, priority);
  }
}

export function urlsGroupedByPriority(
  urlPriorities: Map<string, OfflineAssetPriority>,
): [string[], string[], string[], string[]] {
  const buckets: [string[], string[], string[], string[]] = [[], [], [], []];
  for (const [url, priority] of urlPriorities) {
    buckets[priority].push(url);
  }
  return buckets;
}
