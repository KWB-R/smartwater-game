import { useMemo } from "react";
import type { District, DistrictLevelSummary, LevelPlacementOrderEntry } from "@/types/content";
import type { PlacedTile } from "@/features/level/logic/levelState";
import {
  comboShareVideoPartIds,
  resolveComboShareVideoPosterUrl,
  resolveComboShareVideoUrl,
} from "@/features/level/services/comboShareVideo";
import { resolveLevelAssetsFolder } from "@/features/level/services/resolveLevelAssetsFolder";
import { getComboVideoBaseUrl } from "@/lib/env";
import { parseShareComboPartIds } from "@/routes/level/params/shareComboSearchParam";

type UseLevelShareStateArgs = {
  locationSearch: string;
  placedTiles: ReadonlyArray<PlacedTile>;
  placementOrder: LevelPlacementOrderEntry[];
  shareScreenActive: boolean;
  district: District | undefined;
  levelSummary: DistrictLevelSummary | null;
  cmsAssetsFolder: string | null | undefined;
};

export function useLevelShareState({
  locationSearch,
  placedTiles,
  placementOrder,
  shareScreenActive,
  district,
  levelSummary,
  cmsAssetsFolder,
}: UseLevelShareStateArgs): {
  levelAssetsFolder: string | null;
  shareComboPartIds: string[];
  comboShareVideoUrl: string | null;
  comboShareVideoPosterUrl: string | null;
  shareFileVideoUrl: string | null;
  shareUsesComboVideo: boolean;
} {
  const levelAssetsFolder = useMemo(
    () => resolveLevelAssetsFolder(district, levelSummary),
    [district, levelSummary],
  );

  const shareComboPartIds = useMemo(() => {
    const fromUrl = parseShareComboPartIds(locationSearch);
    if (fromUrl.length > 0) {
      return fromUrl;
    }
    return comboShareVideoPartIds(placedTiles, placementOrder);
  }, [locationSearch, placedTiles, placementOrder]);

  const comboShareVideoUrl = useMemo(() => {
    const baseUrl = getComboVideoBaseUrl();
    if (!baseUrl) {
      return null;
    }
    return resolveComboShareVideoUrl({
      baseUrl,
      assetsFolder: cmsAssetsFolder ?? levelAssetsFolder,
      partIds: shareComboPartIds,
    });
  }, [shareComboPartIds, cmsAssetsFolder, levelAssetsFolder]);

  const shareUsesComboVideo = shareScreenActive && comboShareVideoUrl != null;

  const comboShareVideoPosterUrl = useMemo(
    () => resolveComboShareVideoPosterUrl(comboShareVideoUrl),
    [comboShareVideoUrl],
  );

  return {
    levelAssetsFolder,
    shareComboPartIds,
    comboShareVideoUrl,
    comboShareVideoPosterUrl,
    shareFileVideoUrl: comboShareVideoUrl,
    shareUsesComboVideo,
  };
}
