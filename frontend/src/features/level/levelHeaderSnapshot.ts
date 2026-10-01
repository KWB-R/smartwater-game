import {
  resolveLevelMascotVariant,
  type LevelMascotVariant,
  type LevelPlayPhase,
} from "@/features/level/schwammMascot";

import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import { sessionStore } from "@/lib/storage/webStorage";

type LevelHeaderSnapshotListener = (snapshot: LevelHeaderSnapshot) => void;
const snapshotListeners = new Set<LevelHeaderSnapshotListener>();
/** Stabile Snapshot-Referenzen je Level für useSyncExternalStore. */
const snapshotCache = new Map<string, LevelHeaderSnapshot | null>();

/** Abonniert Headeränderungen und liefert die Funktion zum Abmelden. */
export function subscribeLevelHeaderSnapshot(
  listener: LevelHeaderSnapshotListener,
): () => void {
  snapshotListeners.add(listener);
  return () => {
    snapshotListeners.delete(listener);
  };
}

export function getLevelHeaderSnapshot(
  levelKey: string | null | undefined,
): LevelHeaderSnapshot | null {
  if (!levelKey) {
    return null;
  }
  if (snapshotCache.has(levelKey)) {
    return snapshotCache.get(levelKey) ?? null;
  }
  const snapshot = readLevelHeaderSnapshot(levelKey);
  snapshotCache.set(levelKey, snapshot);
  return snapshot;
}

export type LevelHeaderSnapshot = {
  levelKey: string;
  hasPlayed: boolean;
  phase: LevelPlayPhase;
  displayScore: number;
  maxScore: number;
  /** Anzahl bereits platzierter Puzzle-Items (optional, für Map-Header). */
  placedCount?: number;
  /** Maximal erlaubte Puzzle-Items (maxPuzzleItems) (optional, für Map-Header). */
  maxPuzzleItems?: number;
  draggingTile: boolean;
  placementRewardBlocking: boolean;
  quizFeedback?: boolean;
  puzzleFailed?: boolean;
  mascotVariant: LevelMascotVariant;
  updatedAt: number;
};

function storageKey(levelKey: string): string {
  return `${STORAGE_KEYS.levelHeaderSnapshotPrefix}${levelKey}`;
}

function readLevelHeaderSnapshot(
  levelKey: string | null | undefined,
): LevelHeaderSnapshot | null {
  if (!levelKey) {
    return null;
  }
  return sessionStore.getJson(storageKey(levelKey), (value) => {
    const parsed = value as LevelHeaderSnapshot;
    return parsed?.levelKey === levelKey ? parsed : null;
  });
}

function buildLevelHeaderSnapshot(
  levelKey: string,
  input: Omit<
    LevelHeaderSnapshot,
    "levelKey" | "mascotVariant" | "updatedAt"
  >,
): LevelHeaderSnapshot {
  const mascotInput = {
    hasPlayed: input.hasPlayed,
    phase: input.phase,
    displayScore: input.displayScore,
    maxScore: input.maxScore,
    draggingTile: input.draggingTile,
    placementRewardBlocking: input.placementRewardBlocking,
    quizFeedback: input.quizFeedback,
    puzzleFailed: input.puzzleFailed,
  };
  const mascotVariant = resolveLevelMascotVariant(mascotInput);
  return {
    levelKey,
    ...input,
    mascotVariant,
    updatedAt: Date.now(),
  };
}

export function publishLevelHeaderSnapshot(
  levelKey: string,
  input: Omit<
    LevelHeaderSnapshot,
    "levelKey" | "mascotVariant" | "updatedAt"
  >,
): LevelHeaderSnapshot {
  const snapshot = buildLevelHeaderSnapshot(levelKey, input);
  sessionStore.setJson(storageKey(levelKey), snapshot);
  snapshotCache.set(levelKey, snapshot);
  for (const listener of snapshotListeners) {
    listener(snapshot);
  }
  return snapshot;
}
