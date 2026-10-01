import { getLevelBundleForCms } from "@/features/level/services/loadLevelBundle";
import {
  getLevelAssetUrl,
  toSameOriginAbsoluteAssetUrl,
} from "@/features/level/services/levelAssetUrls";
import type { District, DistrictLevelSummary } from "@/types/content";

export function resolveLevelBackgroundImageUrl(
  district: Pick<District, "bezirkId"> | null | undefined,
  level: DistrictLevelSummary | null,
): string | null {
  if (!level) {
    return null;
  }
  const bundle = getLevelBundleForCms(district ?? null, level);
  const raw = bundle.level.background.url?.trim();
  if (!raw) {
    return null;
  }
  try {
    return getLevelAssetUrl(raw);
  } catch {
    return toSameOriginAbsoluteAssetUrl(raw);
  }
}

/** Hintergrund aus dem geladenen Level, der während des Spiels verfügbar ist. */
export function resolvePlayLevelBackgroundImageUrl(
  backgroundUrl: string | null | undefined,
): string | null {
  const raw = backgroundUrl?.trim();
  if (!raw) {
    return null;
  }
  try {
    return getLevelAssetUrl(raw);
  } catch {
    return toSameOriginAbsoluteAssetUrl(raw);
  }
}
