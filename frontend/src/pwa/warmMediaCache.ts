import { absoluteMediaUrl, cacheKeysForUrl } from "@/pwa/mediaCacheKeys";
import { getStrapiOrigin } from "@/lib/env";
import { isPwaOfflineEnabled } from "@/lib/pwaEnabled";
import { logError } from "@/lib/logError";
import { PWA_CACHE } from "@/pwa/cacheStrategies";

const SW_CACHE_MEDIA_BATCH = "SW_CACHE_MEDIA_BATCH" as const;

/** Gleichzeitige Vorladeaufrufe teilen denselben Abruf je absoluter URL. */
const inFlightByAbsolute = new Map<string, Promise<number>>();

export function cacheNameForMediaUrl(absoluteUrl: string): string {
  try {
    const strapi = getStrapiOrigin()?.replace(/\/$/, "");
    if (strapi) {
      const cmsOrigin = new URL(strapi).origin;
      if (new URL(absoluteUrl).origin === cmsOrigin) {
        return PWA_CACHE.strapiUploads;
      }
    }
  } catch (error) {
    logError("warmMediaCache:origin", error);
  }
  return PWA_CACHE.appMedia;
}

function fetchInitForMediaUrl(absoluteUrl: string): RequestInit {
  if (typeof window === "undefined") {
    return { mode: "cors", credentials: "same-origin" };
  }
  try {
    if (new URL(absoluteUrl).origin !== window.location.origin) {
      return { mode: "cors", credentials: "omit" };
    }
  } catch {
    // Bei einer ungültigen URL die Standardeinstellungen verwenden.
  }
  return { mode: "cors", credentials: "same-origin" };
}

async function matchCachedSize(absolute: string): Promise<number | null> {
  if (typeof caches === "undefined") {
    return null;
  }
  try {
    const cache = await caches.open(cacheNameForMediaUrl(absolute));
    for (const key of cacheKeysForUrl(absolute)) {
      const hit = await cache.match(key);
      if (!hit?.ok) {
        continue;
      }
      const lenHeader = hit.headers.get("content-length");
      if (lenHeader) {
        const n = Number(lenHeader);
        if (Number.isFinite(n) && n >= 0) {
          return n;
        }
      }
      const blob = await hit.blob().catch(() => null);
      return blob?.size ?? 0;
    }
  } catch {
    return null;
  }
  return null;
}

async function putInWindowCache(
  absoluteUrl: string,
  response: Response,
): Promise<void> {
  if (!response.ok || typeof caches === "undefined") {
    return;
  }
  const buffer = await response.arrayBuffer();
  const headers = new Headers(response.headers);
  const body = new Response(buffer, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  const cache = await caches.open(cacheNameForMediaUrl(absoluteUrl));
  await cache.put(absoluteUrl, body.clone());
  await cache.put(new Request(absoluteUrl, { method: "GET" }), body);
}

async function fetchAndPutInWindow(absolute: string): Promise<number> {
  const res = await fetch(absolute, fetchInitForMediaUrl(absolute)).catch(
    () => null,
  );
  if (!res?.ok) {
    return 0;
  }
  await putInWindowCache(absolute, res.clone()).catch(() => {});
  const blob = await res.blob().catch(() => null);
  return blob?.size ?? 0;
}

function warmOneAbsolute(
  absolute: string,
  doFetch: () => Promise<number>,
  forceRefresh = false,
): Promise<number> {
  const existing = inFlightByAbsolute.get(absolute);
  if (existing) {
    return existing;
  }
  const promise = (async () => {
    if (!forceRefresh) {
      const cached = await matchCachedSize(absolute);
      if (cached !== null) {
        return cached;
      }
    }
    return doFetch();
  })().finally(() => {
    inFlightByAbsolute.delete(absolute);
  });
  inFlightByAbsolute.set(absolute, promise);
  return promise;
}

type SwBatchResult = {
  ok: boolean;
  totalBytes: number;
  cached: number;
  error?: string;
};

function postBatchToServiceWorker(
  worker: ServiceWorker,
  urls: readonly string[],
  cacheName: string,
): Promise<SwBatchResult> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(
      () => resolve({ ok: false, totalBytes: 0, cached: 0, error: "timeout" }),
      300_000,
    );
    channel.port1.onmessage = (event: MessageEvent<SwBatchResult>) => {
      window.clearTimeout(timeout);
      resolve(event.data ?? { ok: false, totalBytes: 0, cached: 0 });
    };
    worker.postMessage(
      {
        type: SW_CACHE_MEDIA_BATCH,
        urls: urls.map((u) => absoluteMediaUrl(u)),
        cacheName,
      },
      [channel.port2],
    );
  });
}

async function getActiveServiceWorker(): Promise<ServiceWorker | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }
  const registration = await navigator.serviceWorker.getRegistration();
  const immediate =
    navigator.serviceWorker.controller ?? registration?.active ?? null;
  if (immediate) {
    return immediate;
  }
  await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 8_000);
    }),
  ]);
  return (
    navigator.serviceWorker.controller ??
    registration?.active ??
    (await navigator.serviceWorker.getRegistration())?.active ??
    null
  );
}

const BATCH_SIZE = 6;

export type WarmMediaCacheOptions = {
  /** Lädt trotz vorhandenem Cacheeintrag neu, wenn sich CMS-Inhalte unter derselben URL geändert haben. */
  forceRefresh?: boolean;
};

/**
 * Lädt Medien in den Cache, bevorzugt über den Service Worker.
 * Parallele Abrufe teilen sich eine Anfrage; forceRefresh überspringt vorhandene Cacheeinträge.
 */
export async function warmMediaCacheUrls(
  urls: readonly string[],
  onItemDone?: () => void,
  options?: WarmMediaCacheOptions,
): Promise<{ totalBytes: number }> {
  if (urls.length === 0) {
    return { totalBytes: 0 };
  }

  const forceRefresh = options?.forceRefresh === true;
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const url of urls) {
    const absolute = absoluteMediaUrl(url);
    if (seen.has(absolute)) {
      continue;
    }
    seen.add(absolute);
    unique.push(absolute);
  }

  const byCache = new Map<string, string[]>();
  for (const absolute of unique) {
    const cacheName = cacheNameForMediaUrl(absolute);
    const list = byCache.get(cacheName) ?? [];
    list.push(absolute);
    byCache.set(cacheName, list);
  }

  let totalBytes = 0;
  const worker = isPwaOfflineEnabled() ? await getActiveServiceWorker() : null;

  for (const [cacheName, list] of byCache) {
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      const chunk = list.slice(i, i + BATCH_SIZE);
      const sizes = await Promise.all(
        chunk.map((absolute) =>
          warmOneAbsolute(
            absolute,
            async () => {
              if (worker) {
                const result = await postBatchToServiceWorker(
                  worker,
                  [absolute],
                  cacheName,
                );
                if (result.ok) {
                  return result.totalBytes;
                }
              }
              return fetchAndPutInWindow(absolute);
            },
            forceRefresh,
          ),
        ),
      );
      for (const bytes of sizes) {
        totalBytes += bytes;
        onItemDone?.();
      }
    }
  }

  return { totalBytes };
}
