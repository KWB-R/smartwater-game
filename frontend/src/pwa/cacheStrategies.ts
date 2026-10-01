/** Zentrale Cache-Namen für Fenster und Service Worker. */
export const PWA_CACHE = {
  /** Cacheversion 2 trennt Uploads unter /api/uploads von Inhaltsantworten. */
  strapiApi: "swg-strapi-api-v2",
  strapiUploads: "swg-strapi-uploads-v2",
  appMedia: "swg-app-media-v1",
} as const;

export const STRAPI_API_NETWORK_TIMEOUT_SECONDS = 5;

/**
 * Diese Pfade dürfen keine SPA-Ersatzseite erhalten: Admin, API, Dateien und Vite-interne Routen.
 */
export const PWA_SPA_NAVIGATION_DENYLIST: RegExp[] = [
  /^\/_/,
  /\/[^/?]+\.[^/]+$/,
  /^\/api\//,
  /^\/admin(?:\/|$)/,
  /^\/uploads\//,
];

/**
 * Erkennt CMS-Uploads direkt unter /uploads oder unter dem Proxy-Präfix /api/uploads.
 */
export function isStrapiUploadPath(pathname: string): boolean {
  return (
    pathname.startsWith("/uploads/") || pathname.startsWith("/api/uploads/")
  );
}

/** Erkennt die öffentliche Content-API und nimmt Adminpfade und Uploads aus. */
export function isStrapiApiPathCachedByPwa(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) {
    return false;
  }
  if (pathname === "/api/admin" || pathname.startsWith("/api/admin/")) {
    return false;
  }
  if (isStrapiUploadPath(pathname)) {
    return false;
  }
  return true;
}
