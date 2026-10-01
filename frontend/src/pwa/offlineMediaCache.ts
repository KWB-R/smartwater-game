import { absoluteMediaUrl, cacheKeysForUrl } from "@/pwa/mediaCacheKeys";
import { logError } from "@/lib/logError";
import { PWA_CACHE } from "@/pwa/cacheStrategies";
import { cacheNameForMediaUrl } from "@/pwa/warmMediaCache";
import { revokeOfflineMediaBlobUrlByAbsolute } from "@/pwa/resolveOfflineMediaPlaybackUrl";

/** Legt eine bereits geladene Response im Medien-Cache ab (Fenster-Kontext). */
export async function putOfflineMediaCache(
  url: string,
  response: Response,
): Promise<void> {
  if (!response.ok || typeof caches === "undefined") {
    return;
  }
  const blob = await response.blob();
  const replay = new Response(blob, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  const absolute = absoluteMediaUrl(url);
  revokeOfflineMediaBlobUrlByAbsolute(absolute);
  const cache = await caches.open(cacheNameForMediaUrl(absolute));
  await cache.put(absolute, replay.clone());
  await cache.put(new Request(absolute, { method: "GET" }), replay);
}

/**
 * Entfernt CMS-Uploads aus dem Cache, damit geänderte Inhalte unter derselben URL neu geladen werden.
 */
export async function invalidateCachedStrapiUploadUrls(
  urls: readonly string[],
): Promise<void> {
  if (typeof caches === "undefined" || urls.length === 0) {
    return;
  }
  for (const url of urls) {
    const absolute = absoluteMediaUrl(url);
    if (cacheNameForMediaUrl(absolute) !== PWA_CACHE.strapiUploads) {
      continue;
    }
    await deleteCachedMediaUrl(absolute);
  }
}

/** Entfernt eine Medien-URL aus beiden Caches und gibt eine vorhandene Blob-URL frei. */
export async function deleteCachedMediaUrl(url: string): Promise<void> {
  if (typeof caches === "undefined") {
    return;
  }
  const absolute = absoluteMediaUrl(url);
  revokeOfflineMediaBlobUrlByAbsolute(absolute);
  for (const cacheName of [PWA_CACHE.appMedia, PWA_CACHE.strapiUploads] as const) {
    try {
      const cache = await caches.open(cacheName);
      for (const key of cacheKeysForUrl(absolute)) {
        await cache.delete(key);
      }
    } catch (error) {
      logError("deleteCachedMediaUrl", error);
    }
  }
}

/**
 * Entfernt Einträge aus beiden Mediencaches, deren absolute URL nicht in keep steht.
 */
export async function purgeCachedMediaUrlsNotIn(
  keep: ReadonlySet<string>,
): Promise<number> {
  if (typeof caches === "undefined") {
    return 0;
  }
  const keepAbsolute = new Set<string>();
  for (const url of keep) {
    keepAbsolute.add(absoluteMediaUrl(url));
  }

  let removed = 0;
  const seen = new Set<string>();

  for (const cacheName of [PWA_CACHE.appMedia, PWA_CACHE.strapiUploads] as const) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      for (const request of keys) {
        let absolute: string;
        try {
          absolute = new URL(request.url).href;
        } catch {
          continue;
        }
        if (keepAbsolute.has(absolute) || seen.has(absolute)) {
          continue;
        }
        seen.add(absolute);
        await deleteCachedMediaUrl(absolute);
        removed += 1;
      }
    } catch (error) {
      logError("purgeCachedMediaUrlsNotIn", error);
    }
  }

  return removed;
}
