import { preloadImageDecode } from "@/features/level/utils/preloadImageDecode";
import {
  filterPreloadUrlsForVideoPlayback,
  getWebmAlphaSupported,
} from "@/features/level/utils/videoPlaybackUrl";
import { warmMediaCacheUrls } from "@/pwa/warmMediaCache";

const VIDEO_EXT = /\.(webm|mov|mp4)(\?|#|$)/i;

function isVideoUrl(url: string): boolean {
  return VIDEO_EXT.test(url.split("?")[0] ?? url);
}

export type PreloadLevelAssetsProgress = {
  loaded: number;
  total: number;
  downloadedBytes: number;
};

/**
 * Lädt Level-Medien parallel (Bilder decodieren, Videos per Fetch cachen).
 * Wartet auf WebM-Alpha-Test, damit dieselben URLs wie im Spiel gewählt werden.
 */
export type PreloadLevelAssetsOptions = {
  concurrency?: number;
  forceRefresh?: boolean;
};

export async function preloadLevelAssets(
  urls: readonly string[],
  onProgress?: (progress: PreloadLevelAssetsProgress) => void,
  options?: PreloadLevelAssetsOptions,
): Promise<void> {
  void options?.concurrency;
  if (urls.length === 0) {
    onProgress?.({ loaded: 0, total: 0, downloadedBytes: 0 });
    return;
  }

  const useWebm = await getWebmAlphaSupported();
  const urlsToLoad = filterPreloadUrlsForVideoPlayback(urls, useWebm);
  const total = urlsToLoad.length;
  if (total === 0) {
    onProgress?.({ loaded: 0, total: 0, downloadedBytes: 0 });
    return;
  }

  let loaded = 0;
  let downloadedBytes = 0;
  const report = () => {
    onProgress?.({ loaded, total, downloadedBytes });
  };
  report();

  const { totalBytes } = await warmMediaCacheUrls(
    urlsToLoad,
    () => {
      loaded += 1;
      report();
    },
    { forceRefresh: options?.forceRefresh === true },
  );

  downloadedBytes = totalBytes;
  if (loaded < total) {
    loaded = total;
  }
  report();

  for (const url of urlsToLoad) {
    if (!isVideoUrl(url)) {
      await preloadImageDecode(url).catch(() => {});
    }
  }
}
