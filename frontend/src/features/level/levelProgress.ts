import type { DistrictLevelSummary } from "@/types/content";
import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import { localStore, sessionStore } from "@/lib/storage/webStorage";

export type LevelProgress = {
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  /** Volle Platzierungspunktzahl auf dem Missionsbalken. */
  puzzleMaxBarScoreAchieved?: boolean;
  /** Maximalpunktzahl auf dem Missionsbalken einschließlich Quiz. */
  maxBarScoreAchieved?: boolean;
  /** Quiz mindestens einmal richtig beantwortet (Krone auf der Karte). */
  quizPassed?: boolean;
  updatedAt: number;
};

export function levelProgressKey(level: DistrictLevelSummary): string {
  return level.documentId ?? String(level.id);
}

/**
 * Levelrouten verwenden den Slug; Spielstände werden über levelProgressKey mit documentId gespeichert.
 */
export function levelRouteSlug(level: DistrictLevelSummary): string {
  const slug = level.slug?.trim();
  if (slug) {
    return slug;
  }
  return levelProgressKey(level);
}

/** Gleicht den Routenparameter mit slug, documentId oder numerischer id ab. */
export function levelMatchesRouteParam(
  level: DistrictLevelSummary,
  routeParam: string | undefined,
): boolean {
  const param = routeParam?.trim();
  if (!param) {
    return false;
  }
  const slug = level.slug?.trim();
  if (slug && slug === param) {
    return true;
  }
  if (level.documentId && level.documentId === param) {
    return true;
  }
  return String(level.id) === param;
}

function anotherLevelOwnsProgressKey(
  storageKeyCandidate: string,
  level: DistrictLevelSummary,
  allLevels: ReadonlyArray<DistrictLevelSummary>,
): boolean {
  return allLevels.some(
    (other) =>
      other !== level && levelProgressKey(other) === storageKeyCandidate,
  );
}

/** Fortschritt lesen; numerische ID nur, wenn kein anderes Level denselben Storage-Key nutzt. */
export function readLevelProgressForLevel(
  level: DistrictLevelSummary,
  allLevels?: ReadonlyArray<DistrictLevelSummary>,
): LevelProgress | null {
  const primaryKey = levelProgressKey(level);
  const primary = readLevelProgress(primaryKey);
  const idKey = String(level.id);
  const altBlocked =
    allLevels != null &&
    idKey !== primaryKey &&
    anotherLevelOwnsProgressKey(idKey, level, allLevels);
  const alt =
    idKey !== primaryKey && !altBlocked ? readLevelProgress(idKey) : null;

  if (primary != null) {
    return primary;
  }
  if (idKey === primaryKey || altBlocked) {
    return null;
  }
  return alt;
}

/**
 * Wählt das erste noch offene Level in CMS-Reihenfolge.
 * Wenn alle abgeschlossen sind, wird das erste Level gewählt.
 */
export function defaultMapSelectedLevelKey(
  levels: DistrictLevelSummary[],
): string | null {
  const first = levels[0];
  if (!first) {
    return null;
  }
  for (const level of levels) {
    const key = levelProgressKey(level);
    if (!readLevelProgress(key)?.completed) {
      return key;
    }
  }
  return levelProgressKey(first);
}

type LevelProgressListener = (
  levelKey: string,
  progress: LevelProgress,
) => void;
const progressListeners = new Set<LevelProgressListener>();
/** Stabile Snapshot-Referenzen pro Level-Key (useSyncExternalStore). */
const progressSnapshotCache = new Map<string, LevelProgress | null>();

/** Abonniert Fortschrittsänderungen und liefert die Funktion zum Abmelden. */
export function subscribeLevelProgress(
  listener: LevelProgressListener,
): () => void {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

export function getLevelProgressSnapshot(
  levelKey: string | null | undefined,
): LevelProgress | null {
  if (!levelKey) {
    return null;
  }
  if (progressSnapshotCache.has(levelKey)) {
    return progressSnapshotCache.get(levelKey) ?? null;
  }
  const progress = readLevelProgress(levelKey);
  progressSnapshotCache.set(levelKey, progress);
  return progress;
}

function storageKey(levelKey: string): string {
  return `${STORAGE_KEYS.levelProgressPrefix}${levelKey}`;
}

function parseLevelProgress(value: unknown): LevelProgress | null {
  const parsed = value as LevelProgress;
  if (typeof parsed?.completed !== "boolean") {
    return null;
  }
  const stars = parsed.stars;
  if (stars !== 0 && stars !== 1 && stars !== 2 && stars !== 3) {
    return null;
  }
  return parsed;
}

/** Frühere Version nutzte sessionStorage – einmalig übernehmen. */
function migrateLegacySessionProgress(levelKey: string): LevelProgress | null {
  const parsed = sessionStore.getJson(storageKey(levelKey), parseLevelProgress);
  if (!parsed) {
    return null;
  }
  writeLevelProgress(levelKey, {
    completed: parsed.completed,
    stars: parsed.stars,
  });
  sessionStore.remove(storageKey(levelKey));
  return parsed;
}

export function readLevelProgress(
  levelKey: string | null | undefined,
): LevelProgress | null {
  if (!levelKey) {
    return null;
  }
  const stored = localStore.getJson(storageKey(levelKey), parseLevelProgress);
  return stored ?? migrateLegacySessionProgress(levelKey);
}

/**
 * Ein bestandenes Quiz aktiviert die Krone auf Karte und Detailansichten.
 * Die Platzierungspunktzahl allein reicht dafür nicht aus.
 */
export function isMapLevelMaxMarkerProgress(
  progress: LevelProgress | null | undefined,
): boolean {
  return isQuizPassedProgress(progress);
}

export function isPuzzleMaxBarScoreProgress(
  progress: LevelProgress | null | undefined,
): boolean {
  return progress?.puzzleMaxBarScoreAchieved === true;
}

export function isQuizPassedProgress(
  progress: LevelProgress | null | undefined,
): boolean {
  return progress?.quizPassed === true;
}

export function writeLevelProgress(
  levelKey: string,
  progress: Omit<LevelProgress, "updatedAt">,
): LevelProgress {
  const record: LevelProgress = {
    completed: progress.completed,
    stars: progress.stars,
    updatedAt: Date.now(),
  };
  if (progress.puzzleMaxBarScoreAchieved === true) {
    record.puzzleMaxBarScoreAchieved = true;
  }
  if (progress.maxBarScoreAchieved === true) {
    record.maxBarScoreAchieved = true;
  }
  if (progress.quizPassed === true) {
    record.quizPassed = true;
  }
  localStore.setJson(storageKey(levelKey), record);
  progressSnapshotCache.set(levelKey, record);
  for (const listener of progressListeners) {
    listener(levelKey, record);
  }
  return record;
}
