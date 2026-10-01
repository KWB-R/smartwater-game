import { useEffect, useRef } from "react";
import type { LevelBeforeAfterMedia } from "@/features/level/gallery/resolveLevelBeforeAfterMedia";
import { preloadImageDecode } from "@/features/level/utils/preloadImageDecode";
import { warmMediaCacheUrls } from "@/pwa/warmMediaCache";

const VIDEO_EXT = /\.(webm|mov|mp4)(\?|#|$)/i;

function isVideoUrl(url: string): boolean {
  return VIDEO_EXT.test(url.split("?")[0] ?? url);
}

/** Lädt Kombibild, Video und Hintergrund vor dem Quizvergleich in den Cache. */
export function usePreloadLevelBeforeAfterMedia(
  media: LevelBeforeAfterMedia,
  enabled: boolean,
): void {
  const warmedRef = useRef("");

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const urls = [
      media.backgroundImageUrl,
      media.finishedImageUrl,
      media.videoUrl,
    ].filter((u): u is string => Boolean(u?.trim()));
    if (urls.length === 0) {
      return;
    }
    const fingerprint = urls.join("|");
    if (warmedRef.current === fingerprint) {
      return;
    }
    warmedRef.current = fingerprint;

    void warmMediaCacheUrls(urls, () => {}, {});
    for (const url of urls) {
      if (!isVideoUrl(url)) {
        void preloadImageDecode(url).catch(() => {});
      }
    }
  }, [
    enabled,
    media.backgroundImageUrl,
    media.finishedImageUrl,
    media.videoUrl,
  ]);
}
