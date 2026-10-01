import type { SerializedPlacedTile } from "@/features/level/session/levelPlaySession";
import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import { localStore } from "@/lib/storage/webStorage";

export type LevelGallerySnapshot = {
  levelKey: string;
  placedTiles: SerializedPlacedTile[];
  updatedAt: number;
};

function storageKey(levelKey: string): string {
  return `${STORAGE_KEYS.levelGallerySnapshotPrefix}${levelKey}`;
}

export function writeGallerySnapshot(
  levelKey: string,
  placedTiles: SerializedPlacedTile[],
): LevelGallerySnapshot | null {
  if (!levelKey.trim()) {
    return null;
  }
  const record: LevelGallerySnapshot = {
    levelKey,
    placedTiles,
    updatedAt: Date.now(),
  };
  return localStore.setJson(storageKey(levelKey), record) ? record : null;
}

export function readGallerySnapshot(
  levelKey: string | null | undefined,
): LevelGallerySnapshot | null {
  if (!levelKey?.trim()) {
    return null;
  }
  return localStore.getJson(storageKey(levelKey), (value) => {
    const parsed = value as LevelGallerySnapshot;
    if (parsed?.levelKey !== levelKey || !Array.isArray(parsed.placedTiles)) {
      return null;
    }
    return parsed;
  });
}

export function clearGallerySnapshot(levelKey: string): void {
  localStore.remove(storageKey(levelKey));
}
