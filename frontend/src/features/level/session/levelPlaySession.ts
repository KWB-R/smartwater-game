import type { PlacedTile } from "@/features/level/logic/levelState";
import type { Level, PointMatrix, Vector2 } from "@/features/level/types";
import { findTileById } from "@/features/level/logic/levelPageUtils";
import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import { sessionStore } from "@/lib/storage/webStorage";

export type SerializedPlacedTile = {
  placementKey: string;
  tileId: number;
  position: Vector2;
};

export type LevelPlaySession = {
  levelKey: string;
  levelPoints: PointMatrix;
  placedTiles: SerializedPlacedTile[];
  currentMaxTileCount: number;
  barMaxScore: number;
  quizPoints?: PointMatrix;
  /** Nach dem Quiz: richtige Antwort → Balken auf Maximum. */
  quizAnswerCorrect?: boolean;
  /** Vergleichsansicht mit glücklichem Maskottchen vor dem Quiz. */
  postPlacementCelebration?: "max" | "closeEnough";
};

export function serializePlacedTiles(
  placed: ReadonlyArray<PlacedTile>,
): SerializedPlacedTile[] {
  return placed.map((p) => ({
    placementKey: p.placementKey,
    tileId: p.tile.id,
    position: p.position,
  }));
}

export function deserializePlacedTiles(
  level: Level,
  serialized: SerializedPlacedTile[],
): PlacedTile[] {
  const out: PlacedTile[] = [];
  for (const row of serialized) {
    const tile = findTileById(level, row.tileId);
    if (!tile) {
      continue;
    }
    out.push({
      placementKey: row.placementKey,
      tile,
      position: row.position,
      skipPlacementVideoIntro: true,
    });
  }
  return out;
}

function storageKey(levelKey: string): string {
  return `${STORAGE_KEYS.levelPlaySessionPrefix}${levelKey}`;
}

export function persistLevelPlaySession(
  levelKey: string,
  session: LevelPlaySession,
): void {
  sessionStore.setJson(storageKey(levelKey), session);
}

export function readLevelPlaySession(
  levelKey: string,
): LevelPlaySession | null {
  return sessionStore.getJson(storageKey(levelKey), (value) => {
    const parsed = value as LevelPlaySession;
    return parsed?.levelKey === levelKey ? parsed : null;
  });
}

export function clearLevelPlaySession(levelKey: string): void {
  sessionStore.remove(storageKey(levelKey));
}
