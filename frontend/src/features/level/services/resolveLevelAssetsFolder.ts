import { buildSmartwaterAssetsUrlMap } from "@/features/level/services/levelAssetService";
import { normalizeLevelAssetsFolderPath } from "@/domain/normalizeLevelAssetsFolderPath";
import type { District, DistrictLevelSummary } from "@/types/content";

export type LevelAssetsFolderSource = Pick<
  DistrictLevelSummary,
  "id" | "slug" | "assetsFolder"
>;

function folderHasLevelAssets(
  urlMap: Map<string, string>,
  folder: string,
): boolean {
  return (
    urlMap.has(`${folder}/background.webp`) ||
    urlMap.has(`${folder}/config.json`) ||
    [...urlMap.keys()].some((k) => k.startsWith(`${folder}/`))
  );
}

/** Alle Bezirks-/Levelordner, für die mindestens eine Medien-URL bekannt ist. */
export function listLevelAssetFolders(
  urlMap: Map<string, string> = buildSmartwaterAssetsUrlMap(),
): string[] {
  const folders = new Set<string>();
  for (const key of urlMap.keys()) {
    const parts = key.split("/");
    if (parts.length >= 2) {
      folders.add(`${parts[0]}/${parts[1]}`);
    }
  }
  return [...folders]
    .filter((f) => folderHasLevelAssets(urlMap, f))
    .sort((a, b) => a.localeCompare(b, "de"));
}

export function resolveLevelAssetsFolder(
  district: Pick<District, "bezirkId"> | null | undefined,
  level: LevelAssetsFolderSource | null | undefined,
  urlMap: Map<string, string> = buildSmartwaterAssetsUrlMap(),
): string {
  const bezirkId = district?.bezirkId?.trim();
  const slug = level?.slug?.trim();
  const cmsFolder = normalizeLevelAssetsFolderPath(level?.assetsFolder);

  if (cmsFolder) {
    return cmsFolder;
  }

  const candidates: string[] = [];
  if (bezirkId && slug) {
    candidates.push(`${bezirkId}/${slug}`);
  }
  if (bezirkId && level?.id != null) {
    candidates.push(`${bezirkId}/level_${level.id}`);
    candidates.push(`${bezirkId}/level_${String(level.id)}`);
  }

  for (const folder of candidates) {
    if (folderHasLevelAssets(urlMap, folder)) {
      return folder;
    }
  }

  const folders = listLevelAssetFolders(urlMap);
  if (folders.length === 1) {
    return folders[0]!;
  }

  return "";
}
