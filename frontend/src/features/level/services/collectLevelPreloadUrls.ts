import type { LevelEndAnimationUrls } from "@/features/level/mappers/levelFromConfig";
import { getLevelAssetUrl } from "@/features/level/services/levelAssetUrls";
import type { Level, Tile, TilePlacementVideo } from "@/features/level/types";
import {
  filterPreloadUrlsForVideoPlayback,
  getWebmAlphaSupported,
  pickTransparentVideoPlaybackUrlSync,
  pickTransparentVideoPreloadUrl,
} from "@/features/level/utils/videoPlaybackUrl";

function pushUrl(set: Set<string>, raw: string | null | undefined): void {
  const t = raw?.trim();
  if (!t) return;
  set.add(getLevelAssetUrl(t));
}

function pushTransparentPair(
  set: Set<string>,
  webUrl: string | undefined,
  movUrl: string | undefined,
  useWebm: boolean | null,
): void {
  const web = webUrl?.trim() ? getLevelAssetUrl(webUrl.trim()) : null;
  const mov = movUrl?.trim() ? getLevelAssetUrl(movUrl.trim()) : null;
  const picked =
    useWebm === null
      ? pickTransparentVideoPlaybackUrlSync(web, mov)
      : pickTransparentVideoPreloadUrl(web, mov, useWebm);
  if (picked) set.add(picked);
}

function collectPlacementVideoUrls(
  set: Set<string>,
  pv: TilePlacementVideo,
  useWebm: boolean | null,
): void {
  pushUrl(set, pv.preview.url);
  pushTransparentPair(set, pv.intro?.web.url, pv.intro?.mov.url, useWebm);
  pushTransparentPair(set, pv.loop.web.url, pv.loop.mov.url, useWebm);
}

function walkTile(set: Set<string>, tile: Tile, useWebm: boolean | null): void {
  pushUrl(set, tile.image.url);
  if (tile.helper?.image?.url) {
    pushUrl(set, tile.helper.image.url);
  }
  if (tile.placementVideo) {
    collectPlacementVideoUrls(set, tile.placementVideo, useWebm);
  }
  if (tile.socket?.length) {
    for (const child of tile.socket) {
      walkTile(set, child, useWebm);
    }
  }
}

function collectLevelPreloadUrls(
  level: Level,
  endAnimation: LevelEndAnimationUrls | LevelEndAnimationUrls[] | null,
  extraUrls: readonly string[] = [],
  useWebm: boolean | null = null,
): string[] {
  const set = new Set<string>();

  pushUrl(set, level.background.url);
  pushUrl(set, level.maskot.default.url);
  pushUrl(set, level.maskot.winning.url);
  pushUrl(set, level.maskot.losing.url);

  for (const tile of level.tiles) {
    walkTile(set, tile, useWebm);
  }

  const endList = endAnimation
    ? Array.isArray(endAnimation)
      ? endAnimation
      : [endAnimation]
    : [];
  for (const end of endList) {
    pushTransparentPair(set, end.webUrl, end.movUrl, useWebm);
  }

  for (const raw of extraUrls) {
    pushUrl(set, raw);
  }

  return [...set];
}

/** Wartet auf WebM-Alpha-Test und liefert nur die Playback-Video-URLs (ein Format). */
export async function collectLevelPreloadUrlsForPlayback(
  level: Level,
  endAnimation: LevelEndAnimationUrls | LevelEndAnimationUrls[] | null,
  extraUrls: readonly string[] = [],
): Promise<string[]> {
  const useWebm = await getWebmAlphaSupported();
  const raw = collectLevelPreloadUrls(level, endAnimation, extraUrls, useWebm);
  return filterPreloadUrlsForVideoPlayback(raw, useWebm);
}
