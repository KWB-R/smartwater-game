/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { RangeRequestsPlugin } from "workbox-range-requests";
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from "workbox-strategies";
import {
  isStrapiApiPathCachedByPwa,
  isStrapiUploadPath,
  PWA_CACHE,
  PWA_SPA_NAVIGATION_DENYLIST,
  STRAPI_API_NETWORK_TIMEOUT_SECONDS,
} from "./cacheStrategies";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: import("workbox-precaching").PrecacheEntry[];
};

clientsClaim();
void self.skipWaiting();
cleanupOutdatedCaches();

const isDevSw = import.meta.env.DEV === true;

if (isDevSw) {
  /** In der Entwicklung fehlt index.html im Vorabcache; dafür keinen gebundenen Navigationshandler erzeugen. */
  registerRoute(
    ({ request }) => request.mode === "navigate",
    new NetworkOnly(),
  );
  if (self.__WB_MANIFEST.length > 0) {
    precacheAndRoute(self.__WB_MANIFEST);
  }
} else {
  precacheAndRoute(self.__WB_MANIFEST);
  const navigationHandler = createHandlerBoundToURL("/index.html");
  registerRoute(
    new NavigationRoute(navigationHandler, {
      denylist: PWA_SPA_NAVIGATION_DENYLIST,
    }),
  );
}

function strapiOriginFromEnv(): string | null {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (apiBase) {
    try {
      const url = new URL(apiBase.replace(/\/$/, ""));
      return url.origin;
    } catch {
      // Bei einem Cachefehler den folgenden Ladepfad verwenden.
    }
  }
  const raw =
    import.meta.env.VITE_STRAPI_BASE_URL ?? import.meta.env.VITE_STRAPI_URL ?? "";
  const trimmed = String(raw).trim().replace(/\/$/, "");
  if (!trimmed) {
    return null;
  }
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

const strapiOrigin = strapiOriginFromEnv();

/** Im PWA-Entwicklungsbetrieb Strapi über den Vite-Proxy unter derselben Origin ansprechen. */
const pwaDevStrapiViaProxy =
  import.meta.env.DEV === true && import.meta.env.VITE_PWA_DEV === "true";

const strapiApiHandler = new NetworkFirst({
  cacheName: PWA_CACHE.strapiApi,
  networkTimeoutSeconds: STRAPI_API_NETWORK_TIMEOUT_SECONDS,
  plugins: [
    new ExpirationPlugin({
      maxEntries: 80,
      maxAgeSeconds: 14 * 24 * 60 * 60,
    }),
  ],
});

const strapiUploadsHandler = new StaleWhileRevalidate({
  cacheName: PWA_CACHE.strapiUploads,
  plugins: [
    new ExpirationPlugin({
      maxEntries: 400,
      maxAgeSeconds: 30 * 24 * 60 * 60,
    }),
  ],
});

if (pwaDevStrapiViaProxy) {
  registerRoute(
    ({ url, request, sameOrigin }) =>
      sameOrigin &&
      isStrapiApiPathCachedByPwa(url.pathname) &&
      request.method === "GET",
    strapiApiHandler,
  );
  registerRoute(
    ({ url, request, sameOrigin }) =>
      sameOrigin &&
      isStrapiUploadPath(url.pathname) &&
      request.method === "GET",
    strapiUploadsHandler,
  );
} else if (strapiOrigin) {
  registerRoute(
    ({ url, request }) =>
      url.origin === strapiOrigin &&
      isStrapiApiPathCachedByPwa(url.pathname) &&
      request.method === "GET",
    strapiApiHandler,
  );
  registerRoute(
    ({ url, request }) =>
      url.origin === strapiOrigin &&
      isStrapiUploadPath(url.pathname) &&
      request.method === "GET",
    strapiUploadsHandler,
  );
}

const rangeRequestsPlugin = new RangeRequestsPlugin();

const appMediaPlugins = [
  new ExpirationPlugin({
    maxEntries: 500,
    maxAgeSeconds: 30 * 24 * 60 * 60,
  }),
];

const appMediaWithRangePlugins = [rangeRequestsPlugin, ...appMediaPlugins];

function isBundledLevelMediaPath(pathname: string): boolean {
  return (
    pathname.startsWith("/assets/") || pathname.startsWith("/src/assets/")
  );
}

/** Erkennt gebündelte Levelmedien auch beim Vorladen über fetch ohne destination. */
registerRoute(
  ({ url, request, sameOrigin }) =>
    sameOrigin &&
    request.method === "GET" &&
    isBundledLevelMediaPath(url.pathname),
  new CacheFirst({
    cacheName: PWA_CACHE.appMedia,
    plugins: appMediaWithRangePlugins,
  }),
);

registerRoute(
  ({ request, sameOrigin }) =>
    sameOrigin &&
    request.method === "GET" &&
    (request.destination === "image" ||
      request.destination === "font" ||
      request.destination === "audio"),
  new CacheFirst({
    cacheName: PWA_CACHE.appMedia,
    plugins: appMediaPlugins,
  }),
);

registerRoute(
  ({ request, sameOrigin }) =>
    sameOrigin && request.method === "GET" && request.destination === "video",
  new CacheFirst({
    cacheName: PWA_CACHE.appMedia,
    plugins: appMediaWithRangePlugins,
  }),
);

registerRoute(
  ({ request, sameOrigin }) => sameOrigin && request.destination === "script",
  new CacheFirst({
    cacheName: "swg-app-scripts-v1",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

type CacheBatchMessage = {
  type: "SW_CACHE_MEDIA_BATCH";
  urls: string[];
  cacheName?: string;
};

function cacheKeysForMediaUrl(absolute: string): (string | Request)[] {
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

async function matchCachedMedia(
  cache: Cache,
  absolute: string,
): Promise<Response | undefined> {
  for (const key of cacheKeysForMediaUrl(absolute)) {
    const hit = await cache.match(key);
    if (hit?.ok) {
      return hit;
    }
  }
  return undefined;
}

async function cacheMediaBatchInSw(
  urls: string[],
  cacheName: string,
): Promise<{ totalBytes: number; cached: number }> {
  const cache = await caches.open(cacheName);
  let totalBytes = 0;
  let cached = 0;

  for (const raw of urls) {
    try {
      const absolute = new URL(raw, self.location.origin).href;
      const isUpload = isStrapiUploadPath(new URL(absolute).pathname);
      if (!isUpload) {
        const existing = await matchCachedMedia(cache, absolute);
        if (existing) {
          const blob = await existing.blob();
          totalBytes += blob.size;
          cached += 1;
          continue;
        }
      }

      const crossOrigin = new URL(absolute).origin !== self.location.origin;
      const credentials: RequestCredentials = crossOrigin ? "omit" : "same-origin";
      const res = await fetch(absolute, {
        method: "GET",
        mode: "cors",
        credentials,
      });
      if (!res.ok) {
        continue;
      }
      const blob = await res.blob();
      totalBytes += blob.size;
      const stored = new Response(blob, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
      await cache.put(absolute, stored.clone());
      await cache.put(
        new Request(absolute, { method: "GET", mode: "cors", credentials }),
        stored.clone(),
      );
      if (!crossOrigin) {
        await cache.put(
          new Request(absolute, {
            method: "GET",
            mode: "no-cors",
            credentials: "same-origin",
          }),
          stored.clone(),
        );
      }
      cached += 1;
    } catch {
      // einzelnes Asset überspringen
    }
  }

  return { totalBytes, cached };
}

self.addEventListener("message", (event) => {
  const data = event.data as CacheBatchMessage | undefined;
  const port = event.ports[0];
  if (!data || data.type !== "SW_CACHE_MEDIA_BATCH" || !port) {
    return;
  }
  const cacheName = data.cacheName ?? PWA_CACHE.appMedia;
  event.waitUntil(
    cacheMediaBatchInSw(data.urls ?? [], cacheName)
      .then(({ totalBytes, cached }) => {
        port.postMessage({ ok: true, totalBytes, cached });
      })
      .catch((err: unknown) => {
        port.postMessage({
          ok: false,
          totalBytes: 0,
          cached: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }),
  );
});
