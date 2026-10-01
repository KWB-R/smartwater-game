import { placedTilesInCmsOrder } from "@/features/level/mappers/endAnimationPlacement";
import type { PlacedTile } from "@/features/level/logic/levelState";
import { normalizeLevelAssetsFolderPath } from "@/domain/normalizeLevelAssetsFolderPath";
import type { LevelPlacementOrderEntry } from "@/types/content";

const COMBO_FILE_PREFIX = "combo__";
const COMBO_FILE_SUFFIX = ".mp4";
const COMBO_IMAGE_SUFFIX = ".webp";
const COMBO_PART_SEPARATOR = "+";

/** Platzierte `configId`s / `uniqueId`s, alphabetisch (wie vorgefertigte `combo__*.mp4`). */
export function comboShareVideoPartIds(
  placed: ReadonlyArray<PlacedTile>,
  placementOrder: ReadonlyArray<LevelPlacementOrderEntry> = [],
): string[] {
  const ordered = placedTilesInCmsOrder(placed, placementOrder);
  const ids: string[] = [];
  for (const entry of ordered) {
    const id = entry.tile.configId?.trim();
    if (id) {
      ids.push(id);
    }
  }
  return [...ids].sort((a, b) => a.localeCompare(b, "de"));
}

function buildComboShareFileBody(partIds: ReadonlyArray<string>): string | null {
  if (partIds.length === 0) {
    return null;
  }
  const body = partIds
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .join(COMBO_PART_SEPARATOR);
  return body.length > 0 ? body : null;
}

export function buildComboShareVideoFileName(
  partIds: ReadonlyArray<string>,
): string | null {
  const body = buildComboShareFileBody(partIds);
  if (!body) {
    return null;
  }
  return `${COMBO_FILE_PREFIX}${body}${COMBO_FILE_SUFFIX}`;
}

function buildComboShareImageFileName(
  partIds: ReadonlyArray<string>,
): string | null {
  const body = buildComboShareFileBody(partIds);
  if (!body) {
    return null;
  }
  return `${COMBO_FILE_PREFIX}${body}${COMBO_IMAGE_SUFFIX}`;
}

export function resolveComboShareVideoUrl(options: {
  baseUrl: string;
  assetsFolder: string | null | undefined;
  partIds: ReadonlyArray<string>;
}): string | null {
  const base = options.baseUrl.trim().replace(/\/+$/, "");
  if (!base) {
    return null;
  }
  const folder = normalizeLevelAssetsFolderPath(options.assetsFolder);
  if (!folder) {
    return null;
  }
  const fileName = buildComboShareVideoFileName(options.partIds);
  if (!fileName) {
    return null;
  }
  return `${base}/${folder}/${encodeURIComponent(fileName)}`;
}

export function resolveComboShareImageUrl(options: {
  baseUrl: string;
  assetsFolder: string | null | undefined;
  partIds: ReadonlyArray<string>;
}): string | null {
  const base = options.baseUrl.trim().replace(/\/+$/, "");
  if (!base) {
    return null;
  }
  const folder = normalizeLevelAssetsFolderPath(options.assetsFolder);
  if (!folder) {
    return null;
  }
  const fileName = buildComboShareImageFileName(options.partIds);
  if (!fileName) {
    return null;
  }
  return `${base}/${folder}/${encodeURIComponent(fileName)}`;
}

/** Poster zu `combo__….mp4`: gleicher Dateiname, Endung `.webp`. */
export function resolveComboShareVideoPosterUrl(
  videoUrl: string | null | undefined,
): string | null {
  const trimmed = videoUrl?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/\.mp4(\?.*)?$/i, ".webp$1");
}
