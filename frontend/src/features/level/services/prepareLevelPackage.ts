import { fetchLevelSummaryById } from "@/api/services/levelService";
import { fetchMissionBonusCatalog } from "@/api/services/missionService";
import { resolveStrapiMediaUrl } from "@/api/media";
import { applyPuzzleItemsToLevel } from "@/features/level/logic/applyPuzzleItemsToLevel";
import {
  enrichDistrictLevelSummary,
  puzzleItemsOrEmpty,
} from "@/api/mappers/enrichDistrictLevel";
import { collectLevelPreloadUrlsForPlayback } from "@/features/level/services/collectLevelPreloadUrls";
import { collectCmsLevelPreloadUrls } from "@/features/level/services/collectCmsLevelPreloadUrls";
import { getLevelBundle } from "@/features/level/services/loadLevelBundle";
import {
  preloadLevelAssets,
  type PreloadLevelAssetsProgress,
} from "@/features/level/services/preloadLevelAssets";
import { resolveLevelAssetsFolder } from "@/features/level/services/resolveLevelAssetsFolder";
import {
  beginLevelPlayAssetPriority,
  boostOfflineSyncUrls,
  endLevelPlayAssetPriority,
} from "@/pwa/offlineContentSync";
import type { District, DistrictLevelSummary } from "@/types/content";
import type { MissionBonusCatalog } from "@/types/mission";

let missionCatalogCache: MissionBonusCatalog | null = null;
let missionCatalogPromise: Promise<MissionBonusCatalog> | null = null;

async function getMissionBonusCatalogCached(): Promise<MissionBonusCatalog> {
  if (missionCatalogCache) {
    return missionCatalogCache;
  }
  if (!missionCatalogPromise) {
    missionCatalogPromise = fetchMissionBonusCatalog()
      .then((catalog) => {
        missionCatalogCache = catalog;
        return catalog;
      })
      .finally(() => {
        missionCatalogPromise = null;
      });
  }
  return missionCatalogPromise;
}

export function clearMissionBonusCatalogCache(): void {
  missionCatalogCache = null;
}

export type PrepareLevelPackageInput = {
  levelId: string;
  levelKey: string;
  district?: Pick<District, "bezirkId"> | null;
  fallbackLevel?: DistrictLevelSummary | null;
  assetsFolder?: string;
};

export type PrepareLevelPackageProgress = {
  phase: "cms" | "assets";
  loaded: number;
  total: number;
};

export type PrepareLevelPackageResult = {
  level: DistrictLevelSummary | null;
  urls: string[];
};

export async function buildLevelPreloadUrlList(
  cmsLevel: DistrictLevelSummary,
  district: Pick<District, "bezirkId"> | null | undefined,
  missionCatalog: MissionBonusCatalog,
  assetsFolder?: string,
): Promise<string[]> {
  const folder =
    assetsFolder ??
    resolveLevelAssetsFolder(district ?? null, cmsLevel);
  const bundle = getLevelBundle(folder);
  const puzzleItems = puzzleItemsOrEmpty(cmsLevel);
  const gameLevel = applyPuzzleItemsToLevel(bundle.level, puzzleItems);
  const cmsUrls = collectCmsLevelPreloadUrls(cmsLevel, missionCatalog);
  return collectLevelPreloadUrlsForPlayback(
    gameLevel,
    bundle.endAnimations,
    cmsUrls,
  );
}

export async function prepareLevelPackage(
  input: PrepareLevelPackageInput,
  onProgress?: (progress: PrepareLevelPackageProgress) => void,
): Promise<PrepareLevelPackageResult> {
  // Offline-Vorladen pausieren, damit das aktuelle Level zuerst Bandbreite erhält.
  beginLevelPlayAssetPriority();
  try {
    const levelId = input.levelId.trim();
    onProgress?.({ phase: "cms", loaded: 0, total: 1 });

    let cmsLevel: DistrictLevelSummary | null = null;
    try {
      const fetched = levelId ? await fetchLevelSummaryById(levelId) : null;
      if (fetched) {
        cmsLevel = enrichDistrictLevelSummary(fetched);
      }
    } catch {
      cmsLevel = null;
    }

    if (!cmsLevel && input.fallbackLevel) {
      cmsLevel = enrichDistrictLevelSummary(input.fallbackLevel);
    }

    if (
      cmsLevel &&
      input.fallbackLevel &&
      puzzleItemsOrEmpty(cmsLevel).length === 0 &&
      puzzleItemsOrEmpty(input.fallbackLevel).length > 0
    ) {
      cmsLevel = enrichDistrictLevelSummary({
        ...cmsLevel,
        puzzleItems: puzzleItemsOrEmpty(input.fallbackLevel),
      });
    }

    onProgress?.({ phase: "cms", loaded: 1, total: 1 });

    if (!cmsLevel) {
      return { level: null, urls: [] };
    }

    const missionCatalog = await getMissionBonusCatalogCached();
    const urls = await buildLevelPreloadUrlList(
      cmsLevel,
      input.district,
      missionCatalog,
      input.assetsFolder,
    );

    const assetTotal = urls.length;
    if (assetTotal === 0) {
      onProgress?.({ phase: "assets", loaded: 0, total: 0 });
      return { level: cmsLevel, urls };
    }

    onProgress?.({ phase: "assets", loaded: 0, total: assetTotal });
    // Nach dem Fortsetzen die Medien dieses Levels zuerst laden.
    boostOfflineSyncUrls(urls);
    await preloadLevelAssets(
      urls,
      ({ loaded, total }: PreloadLevelAssetsProgress) => {
        onProgress?.({ phase: "assets", loaded, total });
      },
    );

    return { level: cmsLevel, urls };
  } finally {
    endLevelPlayAssetPriority();
  }
}

export function collectGlobalStrapiMediaUrls(
  districts: {
    imageUrl: string | null;
    levels: DistrictLevelSummary[];
  }[],
  missionCatalog: MissionBonusCatalog,
): string[] {
  const set = new Set<string>();
  const push = (url: string | null | undefined) => {
    const r = resolveStrapiMediaUrl(url);
    if (r.trim()) set.add(r);
  };

  for (const district of districts) {
    push(district.imageUrl);
    for (const level of district.levels) {
      for (const u of collectCmsLevelPreloadUrls(level, missionCatalog)) {
        set.add(u);
      }
    }
  }
  for (const entry of missionCatalog.values()) {
    push(entry.imageUrl);
  }

  return [...set];
}
