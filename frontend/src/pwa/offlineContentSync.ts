import { fetchDistricts } from "@/api/services/bezirkService";
import { fetchLevelSummaryById } from "@/api/services/levelService";
import { fetchMapPage } from "@/api/services/mapPageService";
import { fetchMissionBonusCatalog } from "@/api/services/missionService";
import { enrichDistrictLevelSummary } from "@/api/mappers/enrichDistrictLevel";
import { collectLevelPreloadUrlsForPlayback } from "@/features/level/services/collectLevelPreloadUrls";
import {
  buildLevelPreloadUrlList,
  clearMissionBonusCatalogCache,
  collectGlobalStrapiMediaUrls,
} from "@/features/level/services/prepareLevelPackage";
import { getLevelBundle } from "@/features/level/services/loadLevelBundle";
import {
  listLevelAssetFolders,
  resolveLevelAssetsFolder,
} from "@/features/level/services/resolveLevelAssetsFolder";
import { preloadLevelAssets } from "@/features/level/services/preloadLevelAssets";
import {
  filterPreloadUrlsForVideoPlayback,
  getWebmAlphaSupported,
} from "@/features/level/utils/videoPlaybackUrl";
import {
  assertOfflineStorageAvailable,
  countOfflineMediaCacheEntries,
} from "@/lib/offlineStorageContext";
import { isBrowserOffline } from "@/pwa/offline";
import {
  assignUrlPriority,
  orderLevelsByOfflinePriority,
  urlsGroupedByPriority,
  type OfflineAssetPriority,
} from "@/pwa/offlineAssetPriority";
import {
  buildCmsMediaFingerprint,
  markBootstrapSuccess,
  readOfflineMediaUrlSet,
  writeCmsMediaFingerprint,
  writeOfflineMediaUrlSet,
} from "@/pwa/offlineBootstrapStorage";
import { diffOfflineMediaUrls } from "@/pwa/offlineMediaUrlDiff";
import {
  deleteCachedMediaUrl,
  invalidateCachedStrapiUploadUrls,
  purgeCachedMediaUrlsNotIn,
} from "@/pwa/offlineMediaCache";
import { waitForServiceWorkerReady } from "@/pwa/serviceWorkerRegistration";
import type { District, DistrictLevelSummary } from "@/types/content";
import { mapWithConcurrency } from "@/utils/mapWithConcurrency";

type OfflineBootstrapPhase =
  | "idle"
  | "global"
  | "districts"
  | "levels"
  | "priority"
  | "background"
  | "done";

export type OfflineBootstrapTrigger =
  | "initial"
  | "version"
  | "cmsFingerprint"
  | "manual";

export type OfflineBootstrapSnapshot = {
  status: "idle" | "running" | "done" | "error";
  phase: OfflineBootstrapPhase;
  loaded: number;
  total: number;
  downloadedBytes: number;
  hadWarnings: boolean;
  priorityReady: boolean;
  message?: string;
};

export type RunOfflineBootstrapOptions = {
  trigger?: OfflineBootstrapTrigger;
};

const IDLE_SNAPSHOT: OfflineBootstrapSnapshot = {
  status: "idle",
  phase: "idle",
  loaded: 0,
  total: 0,
  downloadedBytes: 0,
  hadWarnings: false,
  priorityReady: false,
};

let snapshot: OfflineBootstrapSnapshot = IDLE_SNAPSHOT;
let runPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

const boostUrlQueue: string[] = [];

/** Größe der Vorladegruppen; zwischen den Gruppen Sichtbarkeit und Levelpriorität prüfen. */
const WARM_CHUNK_SIZE = 8;

/** Zählt laufende Levelabrufe; währenddessen wartet das Offline-Vorladen. */
let levelPlayAssetPriorityHold = 0;
const levelPlayAssetPriorityWaiters = new Set<() => void>();

function notify(): void {
  for (const l of listeners) {
    l();
  }
}

function setSnapshot(next: OfflineBootstrapSnapshot): void {
  snapshot = next;
  notify();
}

export function subscribeOfflineBootstrap(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOfflineBootstrapSnapshot(): OfflineBootstrapSnapshot {
  return snapshot;
}

/**
 * Zieht Medien während eines laufenden Abgleichs vor; ohne Abgleich bleibt der Aufruf wirkungslos.
 */
export function boostOfflineSyncUrls(urls: readonly string[]): void {
  if (!runPromise || urls.length === 0) {
    return;
  }
  for (const url of urls) {
    const trimmed = url.trim();
    if (trimmed) {
      boostUrlQueue.push(trimmed);
    }
  }
}

/**
 * Pausiert das Offline-Vorladen, bis endLevelPlayAssetPriority den Abruf freigibt.
 * Ein Zähler erlaubt mehrere gleichzeitige Levelabrufe; Medien können dabei vorgezogen werden.
 */
export function beginLevelPlayAssetPriority(urls?: readonly string[]): void {
  levelPlayAssetPriorityHold += 1;
  if (urls && urls.length > 0) {
    boostOfflineSyncUrls(urls);
  }
}

/** Gibt eine Pause frei; ohne weitere Halter können die Vorladegruppen fortfahren. */
export function endLevelPlayAssetPriority(): void {
  if (levelPlayAssetPriorityHold <= 0) {
    return;
  }
  levelPlayAssetPriorityHold -= 1;
  if (levelPlayAssetPriorityHold > 0) {
    return;
  }
  for (const wake of levelPlayAssetPriorityWaiters) {
    wake();
  }
  levelPlayAssetPriorityWaiters.clear();
}

/** Meldet für Tests und Entwicklung, ob das Offline-Vorladen zugunsten eines Levels pausiert. */
export function isLevelPlayAssetPriorityHeld(): boolean {
  return levelPlayAssetPriorityHold > 0;
}

function takeBoostUrls(): string[] {
  if (boostUrlQueue.length === 0) {
    return [];
  }
  const taken = [...new Set(boostUrlQueue)];
  boostUrlQueue.length = 0;
  return taken;
}

async function waitWhileDocumentHidden(): Promise<void> {
  if (typeof document === "undefined") {
    return;
  }
  if (document.visibilityState === "visible") {
    return;
  }
  await new Promise<void>((resolve) => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        document.removeEventListener("visibilitychange", onVis);
        resolve();
      }
    };
    document.addEventListener("visibilitychange", onVis);
  });
}

async function waitWhileLevelPlayAssetPriorityHeld(): Promise<void> {
  while (levelPlayAssetPriorityHold > 0) {
    await new Promise<void>((resolve) => {
      levelPlayAssetPriorityWaiters.add(resolve);
    });
  }
}

/** Wartet auf die Freigabe des Offline-Vorladens. */
export async function waitUntilLevelPlayAssetPriorityClear(): Promise<void> {
  await waitWhileLevelPlayAssetPriorityHeld();
}

/** Vor jeder Vorladegruppe auf einen sichtbaren Tab und abgeschlossene Levelabrufe warten. */
async function waitForWarmGate(): Promise<void> {
  await waitWhileDocumentHidden();
  await waitWhileLevelPlayAssetPriorityHeld();
}

function levelFetchId(level: DistrictLevelSummary): string | null {
  const doc = level.documentId?.trim();
  if (doc) return doc;
  if (level.id != null) return String(level.id);
  return null;
}

async function buildPrioritizedMediaUrls(
  districts: District[],
  enrichedLevels: DistrictLevelSummary[],
  missionCatalog: Awaited<ReturnType<typeof fetchMissionBonusCatalog>>,
  useWebmPromise: Promise<boolean>,
): Promise<{
  buckets: [string[], string[], string[], string[]];
  allUrls: string[];
}> {
  const useWebm = await useWebmPromise;
  const urlPriorities = new Map<string, OfflineAssetPriority>();

  for (const url of collectGlobalStrapiMediaUrls(districts, missionCatalog)) {
    assignUrlPriority(urlPriorities, url, 0);
  }

  const enrichedByKey = new Map<string, DistrictLevelSummary>();
  for (const level of enrichedLevels) {
    enrichedByKey.set(level.documentId ?? String(level.id), level);
  }

  const districtsWithEnriched: District[] = districts.map((district) => ({
    ...district,
    levels: district.levels.map(
      (level) =>
        enrichedByKey.get(level.documentId ?? String(level.id)) ?? level,
    ),
  }));

  const coveredFolders = new Set<string>();
  for (const ref of orderLevelsByOfflinePriority(districtsWithEnriched)) {
    const urls = await buildLevelPreloadUrlList(
      ref.level,
      ref.district,
      missionCatalog,
    );
    const folder = resolveLevelAssetsFolder(ref.district, ref.level);
    if (folder) {
      coveredFolders.add(folder);
    }
    for (const url of urls) {
      assignUrlPriority(urlPriorities, url, ref.priority);
    }
  }

  for (const folder of listLevelAssetFolders()) {
    if (coveredFolders.has(folder)) {
      continue;
    }
    const bundle = getLevelBundle(folder);
    for (const url of await collectLevelPreloadUrlsForPlayback(
      bundle.level,
      bundle.endAnimations,
    )) {
      assignUrlPriority(urlPriorities, url, 3);
    }
  }

  const filtered = new Map<string, OfflineAssetPriority>();
  for (const [url, priority] of urlPriorities) {
    const kept = filterPreloadUrlsForVideoPlayback([url], useWebm);
    for (const keptUrl of kept) {
      assignUrlPriority(filtered, keptUrl, priority);
    }
  }

  const buckets = urlsGroupedByPriority(filtered);
  const allUrls = [...buckets[0], ...buckets[1], ...buckets[2], ...buckets[3]];
  return { buckets, allUrls };
}

type WarmProgressState = {
  loaded: number;
  total: number;
  downloadedBytes: number;
  hadWarnings: boolean;
  priorityReady: boolean;
};

async function warmUrlChunk(
  urls: readonly string[],
  phase: "priority" | "background",
  state: WarmProgressState,
): Promise<void> {
  if (urls.length === 0) {
    return;
  }

  let lastLoaded = 0;
  let batchBytes = 0;
  await preloadLevelAssets(urls, ({ loaded, downloadedBytes: bytes }) => {
    const delta = loaded - lastLoaded;
    lastLoaded = loaded;
    batchBytes = bytes;
    if (delta > 0) {
      state.loaded = Math.min(state.total, state.loaded + delta);
    }
    setSnapshot({
      status: "running",
      phase,
      loaded: state.loaded,
      total: state.total,
      downloadedBytes: state.downloadedBytes + batchBytes,
      hadWarnings: state.hadWarnings,
      priorityReady: state.priorityReady,
    });
  });
  state.downloadedBytes += batchBytes;
}

/**
 * Lädt Medien in kleinen Gruppen vor und prüft dazwischen Sichtbarkeit und Levelpriorität.
 * Ein neu gestartetes Level kann den Hintergrundabruf dadurch unterbrechen.
 */
async function warmBucket(
  urls: readonly string[],
  phase: "priority" | "background",
  state: WarmProgressState,
): Promise<void> {
  if (urls.length === 0) {
    return;
  }

  for (let i = 0; i < urls.length; i += WARM_CHUNK_SIZE) {
    await waitForWarmGate();
    const chunk = urls.slice(i, i + WARM_CHUNK_SIZE);
    await warmUrlChunk(chunk, phase, state);
  }
}

export async function runFullOfflineBootstrap(
  options: RunOfflineBootstrapOptions = {},
): Promise<void> {
  if (isBrowserOffline()) {
    throw new Error("Offline bootstrap requires a network connection.");
  }
  if (runPromise) {
    return runPromise;
  }

  const trigger = options.trigger ?? "manual";
  const invalidateCmsOverlap =
    trigger === "cmsFingerprint" || trigger === "version";

  runPromise = (async () => {
    let hadWarnings = false;
    boostUrlQueue.length = 0;
    setSnapshot({
      status: "running",
      phase: "global",
      loaded: 0,
      total: 3,
      downloadedBytes: 0,
      hadWarnings: false,
      priorityReady: false,
    });

    try {
      assertOfflineStorageAvailable();
      clearMissionBonusCatalogCache();

      const bumpGlobal = (loaded: number) => {
        setSnapshot({
          status: "running",
          phase: "global",
          loaded,
          total: 3,
          downloadedBytes: 0,
          hadWarnings,
          priorityReady: false,
        });
      };

      let globalCompleted = 0;
      const trackGlobal = <T>(promise: Promise<T>): Promise<T> =>
        promise.then((value) => {
          globalCompleted += 1;
          bumpGlobal(globalCompleted);
          return value;
        });

      bumpGlobal(0);
      const webmAlphaPromise = getWebmAlphaSupported();
      const serviceWorkerPromise = waitForServiceWorkerReady();

      const [, districtsList, missionCatalog] = await Promise.all([
        trackGlobal(fetchMapPage()),
        trackGlobal(fetchDistricts()),
        trackGlobal(fetchMissionBonusCatalog()),
      ]);

      const { activated } = await serviceWorkerPromise;
      if (!activated) {
        hadWarnings = true;
      }

      const districts: District[] = districtsList;

      const levelRefs: { district: District; level: DistrictLevelSummary }[] =
        [];
      for (const district of districts) {
        for (const level of district.levels) {
          levelRefs.push({ district, level });
        }
      }

      setSnapshot({
        status: "running",
        phase: "levels",
        loaded: 0,
        total: Math.max(1, levelRefs.length),
        downloadedBytes: 0,
        hadWarnings,
        priorityReady: false,
      });

      const enrichedLevels = await mapWithConcurrency(
        levelRefs,
        6,
        async ({ level }) => {
          const fetchId = levelFetchId(level);
          try {
            if (fetchId) {
              const full = await fetchLevelSummaryById(fetchId);
              return enrichDistrictLevelSummary(full ?? level);
            }
            return enrichDistrictLevelSummary(level);
          } catch {
            hadWarnings = true;
            return enrichDistrictLevelSummary(level);
          }
        },
        (loaded, total) => {
          setSnapshot({
            status: "running",
            phase: "levels",
            loaded,
            total: Math.max(1, total),
            downloadedBytes: 0,
            hadWarnings,
            priorityReady: false,
          });
        },
      );

      const { buckets, allUrls } = await buildPrioritizedMediaUrls(
        districts,
        enrichedLevels,
        missionCatalog,
        webmAlphaPromise,
      );

      const previousUrls = readOfflineMediaUrlSet();
      const { overlap, removed } = diffOfflineMediaUrls(previousUrls, allUrls);

      for (const url of removed) {
        await deleteCachedMediaUrl(url);
      }
      await purgeCachedMediaUrlsNotIn(new Set(allUrls));

      if (invalidateCmsOverlap && overlap.length > 0) {
        await invalidateCachedStrapiUploadUrls(overlap);
      }

      const mediaTotal = Math.max(1, allUrls.length);
      const state: WarmProgressState = {
        loaded: 0,
        total: mediaTotal,
        downloadedBytes: 0,
        hadWarnings,
        priorityReady: false,
      };

      setSnapshot({
        status: "running",
        phase: "priority",
        loaded: 0,
        total: mediaTotal,
        downloadedBytes: 0,
        hadWarnings,
        priorityReady: false,
      });

      await warmBucket(buckets[0], "priority", state);
      await warmBucket(buckets[1], "priority", state);

      state.priorityReady = true;
      hadWarnings = state.hadWarnings;
      setSnapshot({
        status: "running",
        phase: "background",
        loaded: state.loaded,
        total: state.total,
        downloadedBytes: state.downloadedBytes,
        hadWarnings,
        priorityReady: true,
      });

      const warmed = new Set<string>([...buckets[0], ...buckets[1]]);
      const remaining = [...buckets[2], ...buckets[3]].filter(
        (u) => !warmed.has(u),
      );

      while (remaining.length > 0 || boostUrlQueue.length > 0) {
        await waitForWarmGate();

        const boosted = takeBoostUrls();
        if (boosted.length > 0) {
          const toWarm = boosted.filter((u) => !warmed.has(u));
          await warmUrlChunk(toWarm, "background", state);
          for (const u of boosted) {
            warmed.add(u);
          }
          for (let i = remaining.length - 1; i >= 0; i -= 1) {
            if (warmed.has(remaining[i]!)) {
              remaining.splice(i, 1);
            }
          }
          continue;
        }

        if (remaining.length === 0) {
          break;
        }

        const chunk = remaining.splice(0, WARM_CHUNK_SIZE);
        await warmUrlChunk(chunk, "background", state);
        for (const u of chunk) {
          warmed.add(u);
        }
      }

      const cachedEntries = await countOfflineMediaCacheEntries();
      if (state.downloadedBytes > 0 && cachedEntries === 0) {
        hadWarnings = true;
      }

      writeOfflineMediaUrlSet(allUrls);
      writeCmsMediaFingerprint(
        buildCmsMediaFingerprint(
          collectGlobalStrapiMediaUrls(districts, missionCatalog),
        ),
      );
      markBootstrapSuccess(state.downloadedBytes);
      setSnapshot({
        status: "done",
        phase: "done",
        loaded: mediaTotal,
        total: mediaTotal,
        downloadedBytes: state.downloadedBytes,
        hadWarnings,
        priorityReady: true,
        message:
          hadWarnings && cachedEntries === 0
            ? "Medien wurden geladen, aber nicht im Offline-Speicher abgelegt. HTTPS oder localhost prüfen."
            : undefined,
      });
    } catch (err) {
      let message =
        err instanceof Error
          ? err.message
          : "Offline-Vorbereitung fehlgeschlagen.";
      if (
        err instanceof DOMException &&
        (err.name === "TimeoutError" || err.name === "AbortError")
      ) {
        message =
          "CMS nicht erreichbar (Zeitüberschreitung). Strapi läuft? " +
          "Bei pnpm dev:pwa: VITE_STRAPI_PROXY_TARGET in .env.pwadev prüfen.";
      }
      setSnapshot({
        status: "error",
        phase: "done",
        loaded: 0,
        total: 0,
        downloadedBytes: 0,
        hadWarnings: true,
        priorityReady: false,
        message,
      });
      throw err instanceof Error ? err : new Error(message);
    } finally {
      runPromise = null;
      boostUrlQueue.length = 0;
    }
  })();

  return runPromise;
}

const INSTALLED_PWA_DISPLAY_MODES = [
  "standalone",
  "fullscreen",
  "minimal-ui",
  "window-controls-overlay",
] as const;

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  ) {
    return true;
  }
  return INSTALLED_PWA_DISPLAY_MODES.some((mode) =>
    window.matchMedia(`(display-mode: ${mode})`).matches,
  );
}
