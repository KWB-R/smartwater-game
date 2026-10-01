import { applyPuzzleItemsToLevel } from "@/features/level/logic/applyPuzzleItemsToLevel";
import { readGallerySnapshot } from "@/features/level/gallery/levelGallerySnapshot";
import {
  galleryComboPartIdsFromSnapshot,
  resolveGalleryComboUrls,
  type GalleryComboUrls,
} from "@/features/level/gallery/resolveGalleryComboUrls";
import { levelProgressKey } from "@/features/level/levelProgress";
import { getLevelBundleForCms } from "@/features/level/services/loadLevelBundle";
import { deserializePlacedTiles } from "@/features/level/session/levelPlaySession";
import type { GalleryEntry } from "@/features/gallery/collectGalleryEntries";

export function getGalleryComboUrlsForEntry(
  entry: GalleryEntry,
): GalleryComboUrls {
  const bundle = getLevelBundleForCms(entry.district, entry.level);
  // Gespeicherte Galeriedaten über documentId lesen, wie beim Schreiben des Snapshots.
  const progressKey = levelProgressKey(entry.level);
  const snapshot = readGallerySnapshot(progressKey);
  if (!snapshot || snapshot.placedTiles.length === 0) {
    return resolveGalleryComboUrls({
      assetsFolder: entry.level.assetsFolder,
      partIds: [],
      endAnimation: bundle.endAnimation,
    });
  }
  const level = applyPuzzleItemsToLevel(
    bundle.level,
    entry.level.puzzleItems,
  );
  const partIds = galleryComboPartIdsFromSnapshot(
    snapshot.placedTiles,
    entry.level.placementOrder,
    (serialized) => deserializePlacedTiles(level, [...serialized]),
  );
  return resolveGalleryComboUrls({
    assetsFolder: entry.level.assetsFolder,
    partIds,
    endAnimation: bundle.endAnimation,
  });
}
