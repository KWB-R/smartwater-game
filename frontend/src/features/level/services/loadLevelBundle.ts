import { buildSmartwaterAssetsUrlMap } from "./levelAssetService";
import { getLevelConfigForAssetsFolder } from "@/features/level/services/levelConfigByFolder";
import { normalizeLevelAssetsFolderPath } from "@/domain/normalizeLevelAssetsFolderPath";
import { resolveLevelAssetsFolder, listLevelAssetFolders } from "@/features/level/services/resolveLevelAssetsFolder";
import type { District, DistrictLevelSummary } from "@/types/content";
import type { Level } from "@/features/level/types";
import {
  DESIGN_H,
  DESIGN_W,
} from "@/components/features/level/scene/bridge/designViewRect";
import {
  buildLevelFromConfig,
  getLevelEndAnimationSpecs,
  type LevelEndAnimationSpec,
} from "@/features/level/mappers/levelFromConfig";

export const LEVEL_BACKGROUND_REFERENCE_WIDTH = DESIGN_W;
export const LEVEL_BACKGROUND_REFERENCE_HEIGHT = DESIGN_H;

function levelBundlePresent(
  urlMap: Map<string, string>,
  assetsFolder: string,
): boolean {
  if (!assetsFolder.trim()) {
    return false;
  }
  return (
    urlMap.has(`${assetsFolder}/background.webp`) ||
    [...urlMap.keys()].some((k) => k.startsWith(`${assetsFolder}/`))
  );
}

function formatMissingLevelAssetsDetail(
  urlMap: Map<string, string>,
  folder: string,
): string {
  if (!folder) {
    return "assetsFolder leer — leere URLs.";
  }
  const prefix = `${folder}/`;
  const checked = [`${prefix}background.webp`, `${prefix}config.json`];
  const bezirk = folder.split("/")[0] ?? "";
  const bundledUnderBezirk = bezirk
    ? [
        ...new Set(
          [...urlMap.keys()]
            .filter((k) => k.startsWith(`${bezirk}/`))
            .map((k) => k.split("/").slice(0, 2).join("/")),
        ),
      ].sort((a, b) => a.localeCompare(b, "de"))
    : [];
  let detail = `keine Dateien unter ${prefix} (geprüft: ${checked.join(", ")}) — leere URLs`;
  if (bundledUnderBezirk.length > 0) {
    detail += `; im Bundle vorhanden: ${bundledUnderBezirk.join(", ")}`;
  }
  return detail;
}

type LevelAssetSource = "bundled" | "no-assets";

export type LevelBundle = {
  level: Level;
  assetSource: LevelAssetSource;
  endAnimations: LevelEndAnimationSpec[];
  endAnimation: LevelEndAnimationSpec | null;
};

const emptyFallbackLevel: Level = {
  id: 3,
  name: "",
  address: "",
  geoLocation: [0, 0],
  maskot: {
    default: { id: 301, url: "" },
    winning: { id: 302, url: "" },
    losing: { id: 303, url: "" },
  },
  mission: [],
  maximumTileCount: 0,
  background: { id: 30, url: "" },
  backgroundCenter: { x: DESIGN_W / 2, y: DESIGN_H / 2 },
  pointMinimum: {
    default: 3,
    cooling: 2,
    flooding: 1,
    water: 1,
    biodiversity: 2,
    quality: 1,
  },
  pointMaximum: {
    default: 8,
    cooling: 8,
    flooding: 5,
    water: 5,
    biodiversity: 9,
    quality: 7,
  },
  tiles: [],
  quiz: [],
};

const EMPTY_LEVEL_BUNDLE: LevelBundle = {
  level: emptyFallbackLevel,
  assetSource: "no-assets",
  endAnimations: [],
  endAnimation: null,
};

export function getEmptyLevelBundle(): LevelBundle {
  return EMPTY_LEVEL_BUNDLE;
}

export function getLevelBundle(assetsFolder: string): LevelBundle {
  const folder = normalizeLevelAssetsFolderPath(assetsFolder) ?? "";
  const urlMap = buildSmartwaterAssetsUrlMap();

  if (!levelBundlePresent(urlMap, folder)) {
    if (import.meta.env.DEV && folder) {
      console.info(
        `[level] Level-Assets nicht gefunden (${folder}) — ${formatMissingLevelAssetsDetail(urlMap, folder)}.`,
      );
    }
    return EMPTY_LEVEL_BUNDLE;
  }
  const config = getLevelConfigForAssetsFolder(folder);
  if (!config) {
    if (import.meta.env.DEV) {
      console.warn(`[level] Kein config.json für ${folder}.`);
    }
    return {
      level: emptyFallbackLevel,
      assetSource: "no-assets",
      endAnimations: [],
      endAnimation: null,
    };
  }
  try {
    const endAnimations = getLevelEndAnimationSpecs(urlMap, folder, config);
    return {
      level: buildLevelFromConfig(urlMap, { assetsFolder: folder, config }),
      assetSource: "bundled",
      endAnimations,
      endAnimation: endAnimations[0] ?? null,
    };
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[level] buildLevelFromConfig fehlgeschlagen.", e);
    }
    return {
      level: emptyFallbackLevel,
      assetSource: "no-assets",
      endAnimations: [],
      endAnimation: null,
    };
  }
}

export function getLevelBundleForCms(
  district: Pick<District, "bezirkId"> | null | undefined,
  level:
    | Pick<DistrictLevelSummary, "id" | "slug" | "assetsFolder">
    | null
    | undefined,
): LevelBundle {
  if (!level) {
    return EMPTY_LEVEL_BUNDLE;
  }

  const urlMap = buildSmartwaterAssetsUrlMap();
  const assetsFolder = resolveLevelAssetsFolder(
    district ?? null,
    level ?? null,
    urlMap,
  );

  if (import.meta.env.DEV && !assetsFolder) {
    console.warn(
      "[level] assetsFolder nicht auflösbar — kein CMS-Pfad, Bezirk/Slug passen nicht zum Bundle oder mehrere Level-Ordner.",
      {
        bezirkId: district?.bezirkId ?? null,
        slug: level.slug,
        cmsAssetsFolder: level.assetsFolder,
        bundled: listLevelAssetFolders(urlMap),
      },
    );
  }

  return getLevelBundle(assetsFolder);
}

;
