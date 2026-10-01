import { isPwaOfflineEnabled } from "@/lib/pwaEnabled";
import { PWA_CACHE } from "@/pwa/cacheStrategies";
import { logError } from "@/lib/logError";

/**
 * Cache API und Service Worker benötigen einen sicheren Kontext.
 * Lokale IP-Adressen erfordern HTTPS; localhost und 127.0.0.1 sind auch über HTTP zulässig.
 */
export function getOfflineStorageBlockedReason(): string | null {
  if (!isPwaOfflineEnabled()) {
    return null;
  }
  if (typeof window === "undefined") {
    return null;
  }
  if (!window.isSecureContext) {
    const host = window.location.host;
    return (
      "Offline-Speicher funktioniert hier nicht (unsichere Verbindung). " +
      "Mit pnpm dev:pwa https://localhost:5173 nutzen — nicht http://" +
      host +
      ". Für andere Geräte im WLAN: pnpm dev:pwa:host und https://… im Browser öffnen."
    );
  }
  if (typeof caches === "undefined") {
    return "Cache API ist in diesem Browser nicht verfügbar.";
  }
  return null;
}

export function assertOfflineStorageAvailable(): void {
  const reason = getOfflineStorageBlockedReason();
  if (reason) {
    throw new Error(reason);
  }
}

/** Zahl der zwischengespeicherten App-Medien und Strapi-Uploads. */
export async function countOfflineMediaCacheEntries(): Promise<number> {
  if (typeof caches === "undefined") {
    return 0;
  }
  let total = 0;
  for (const name of [PWA_CACHE.appMedia, PWA_CACHE.strapiUploads] as const) {
    try {
      const cache = await caches.open(name);
      total += (await cache.keys()).length;
    } catch (error) {
      logError("offlineStorage:cacheCount", error);
    }
  }
  return total;
}
