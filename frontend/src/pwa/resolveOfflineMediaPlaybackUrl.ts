import { PWA_CACHE } from "@/pwa/cacheStrategies";
import { logError } from "@/lib/logError";

const blobUrlByAbsolute = new Map<string, string>();

function absoluteMediaUrl(src: string): string {
  return new URL(src, typeof window !== "undefined" ? window.location.href : undefined)
    .href;
}

/** Bereits erzeugte Blob-URL oder absolute Medien-URL — ohne await. */
export function resolveMediaPlaybackUrlSync(src: string): string {
  const absolute = absoluteMediaUrl(src);
  if (typeof caches === "undefined") {
    return absolute;
  }
  return blobUrlByAbsolute.get(absolute) ?? absolute;
}

function cacheKeysForUrl(absolute: string): (string | Request)[] {
  return [
    absolute,
    new Request(absolute, { method: "GET" }),
    new Request(absolute, {
      method: "GET",
      mode: "cors",
      credentials: "same-origin",
    }),
    new Request(absolute, {
      method: "GET",
      mode: "no-cors",
      credentials: "same-origin",
    }),
  ];
}

/**
 * Liefert bei vorhandenem Cacheeintrag eine Blob-URL, sonst die absolute Medien-URL.
 * Das vermeidet einen erneuten Netzwerkabruf bereits geladener Medien.
 */
export async function resolveOfflineMediaPlaybackUrl(
  src: string,
): Promise<string> {
  const absolute = absoluteMediaUrl(src);
  if (typeof caches === "undefined") {
    return absolute;
  }
  const cachedBlob = blobUrlByAbsolute.get(absolute);
  if (cachedBlob) {
    return cachedBlob;
  }
  for (const cacheName of [PWA_CACHE.appMedia, PWA_CACHE.strapiUploads] as const) {
    try {
      const cache = await caches.open(cacheName);
      for (const key of cacheKeysForUrl(absolute)) {
        const hit = await cache.match(key);
        if (hit?.ok) {
          const blob = await hit.blob();
          const blobUrl = URL.createObjectURL(blob);
          blobUrlByAbsolute.set(absolute, blobUrl);
          return blobUrl;
        }
      }
    } catch (error) {
      logError("resolveOfflineMediaPlaybackUrl", error);
    }
  }
  return absolute;
}

export function revokeOfflineMediaBlobUrl(src: string | undefined): void {
  if (!src?.startsWith("blob:")) {
    return;
  }
  for (const [absolute, blobUrl] of blobUrlByAbsolute) {
    if (blobUrl === src) {
      URL.revokeObjectURL(blobUrl);
      blobUrlByAbsolute.delete(absolute);
      return;
    }
  }
}

/** Gibt eine Blob-URL vor dem Ersetzen des zugehörigen Cacheeintrags frei. */
export function revokeOfflineMediaBlobUrlByAbsolute(src: string): void {
  const absolute = absoluteMediaUrl(src);
  const blobUrl = blobUrlByAbsolute.get(absolute);
  if (!blobUrl) {
    return;
  }
  URL.revokeObjectURL(blobUrl);
  blobUrlByAbsolute.delete(absolute);
}
