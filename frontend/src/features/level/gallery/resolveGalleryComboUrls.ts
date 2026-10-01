import type { PlacedTile } from "@/features/level/logic/levelState";
import type { LevelEndAnimationSpec } from "@/features/level/mappers/levelFromConfig";
import type { LevelPlacementOrderEntry } from "@/types/content";
import {
  comboShareVideoPartIds,
  resolveComboShareImageUrl,
  resolveComboShareVideoPosterUrl,
  resolveComboShareVideoUrl,
} from "@/features/level/services/comboShareVideo";
import { getComboVideoBaseUrl } from "@/lib/env";
import { resolveShareVideoUrl } from "@/features/level/play/levelPageHelpers";
import type { SerializedPlacedTile } from "@/features/level/session/levelPlaySession";

export type GalleryComboUrls = {
  partIds: string[];
  videoUrl: string | null;
  shareFileVideoUrl: string | null;
  finishedImageUrl: string | null;
};

export function galleryComboPartIdsFromSnapshot(
  placedTiles: ReadonlyArray<SerializedPlacedTile>,
  placementOrder: ReadonlyArray<LevelPlacementOrderEntry>,
  deserialize: (serialized: ReadonlyArray<SerializedPlacedTile>) => PlacedTile[],
): string[] {
  if (placedTiles.length === 0) {
    return [];
  }
  const placed = deserialize(placedTiles);
  return comboShareVideoPartIds(placed, placementOrder);
}

export function resolveGalleryComboUrls(options: {
  assetsFolder: string | null | undefined;
  partIds: ReadonlyArray<string>;
  endAnimation?: LevelEndAnimationSpec | null;
}): GalleryComboUrls {
  const partIds = [...options.partIds];
  const baseUrl = getComboVideoBaseUrl()?.trim() ?? "";

  let comboVideoUrl: string | null = null;
  let shareFileVideoUrl: string | null = null;
  let finishedImageUrl: string | null = null;

  if (baseUrl && partIds.length > 0) {
    comboVideoUrl = resolveComboShareVideoUrl({
      baseUrl,
      assetsFolder: options.assetsFolder,
      partIds,
    });
    shareFileVideoUrl = comboVideoUrl;
    finishedImageUrl =
      resolveComboShareImageUrl({
        baseUrl,
        assetsFolder: options.assetsFolder,
        partIds,
      }) ?? resolveComboShareVideoPosterUrl(comboVideoUrl);
  }

  const videoUrl = resolveShareVideoUrl(comboVideoUrl, options.endAnimation);

  return { partIds, videoUrl, shareFileVideoUrl, finishedImageUrl };
}
