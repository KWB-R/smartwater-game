import type { Tile, Spritesheet } from "@/features/level/types";
import {
  getLevelAssetUrl,
  getTileLibraryPreviewMedia,
  isSpritesheet,
} from "@/features/level/services/levelAssetUrls";
import {
  type TilePreviewAssetState,
  useTilePreviewAsset,
} from "./useTilePreviewAsset";

export type TilePreviewMediaState = {
  asset: TilePreviewAssetState;
  previewUrl: string | undefined;
  sprite: Spritesheet | null;
};

export function useTilePreviewMedia(tile: Tile | null): TilePreviewMediaState {
  const previewMedia = tile ? getTileLibraryPreviewMedia(tile) : null;
  const assetUrl = previewMedia ? getLevelAssetUrl(previewMedia.url) : "";
  const asset = useTilePreviewAsset(tile ? assetUrl : "");
  const sprite = previewMedia && isSpritesheet(previewMedia) ? previewMedia : null;
  const previewUrl = asset.blobUrl ?? (asset.error && assetUrl ? assetUrl : undefined);

  return { asset, previewUrl, sprite };
}
