import { EMPTY_LEVEL_CONFIG } from "@/features/level/config/emptyLevelConfig";
import {
  parseLevelConfigJson,
  type LevelConfigJson,
} from "@/features/level/schemas/levelConfigSchema";
import { normalizeLevelAssetsFolderPath } from "@/domain/normalizeLevelAssetsFolderPath";

function loadConfigJsonModules(): Record<string, unknown> {

  return import.meta.glob("../../../assets/**/config.json", {
    eager: true,
    import: "default",
  }) as Record<string, unknown>;
}

function folderKeyFromConfigModulePath(modulePath: string): string | null {
  const posix = modulePath.split("?")[0].replace(/\\/g, "/");
  const lower = posix.toLowerCase();
  const marker = "/assets/";
  const idx = lower.indexOf(marker);
  if (idx < 0) {
    return null;
  }
  const afterAssets = posix.slice(idx + marker.length);
  if (!afterAssets.endsWith("/config.json")) {
    return null;
  }
  return afterAssets.slice(0, -"/config.json".length).replace(/^\//, "");
}

let cachedByFolder: Map<string, LevelConfigJson> | null = null;

function buildLevelConfigByFolderMap(): Map<string, LevelConfigJson> {
  if (cachedByFolder) {
    return cachedByFolder;
  }
  const map = new Map<string, LevelConfigJson>();
  for (const [modulePath, raw] of Object.entries(loadConfigJsonModules())) {
    const folder = folderKeyFromConfigModulePath(modulePath);
    if (!folder) {
      continue;
    }
    try {
      map.set(folder, parseLevelConfigJson(raw));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(
          `[level] config.json ungültig (${folder}) — übersprungen.`,
          error,
        );
      }
    }
  }
  cachedByFolder = map;
  return map;
}

export function listLevelConfigAssetFolders(): string[] {
  return [...buildLevelConfigByFolderMap().keys()].sort((a, b) =>
    a.localeCompare(b, "de"),
  );
}

export function getLevelConfigForAssetsFolder(
  assetsFolder: string,
): LevelConfigJson | null {
  const folder = normalizeLevelAssetsFolderPath(assetsFolder);
  if (!folder) {
    return null;
  }
  return buildLevelConfigByFolderMap().get(folder) ?? null;
}

export function requireLevelConfigForAssetsFolder(
  assetsFolder: string,
): LevelConfigJson {
  return getLevelConfigForAssetsFolder(assetsFolder) ?? EMPTY_LEVEL_CONFIG;
}
