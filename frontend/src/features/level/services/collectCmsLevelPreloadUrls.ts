import { resolveStrapiMediaUrl } from "@/api/media";
import { bonusRowsFromPuzzleItems } from "@/domain/levelBonusCategories";
import { puzzleItemsOrEmpty } from "@/api/mappers/enrichDistrictLevel";
import type { DistrictLevelSummary } from "@/types/content";
import type { MissionBonusCatalog } from "@/types/mission";

function pushResolved(set: Set<string>, url: string | null | undefined): void {
  const resolved = resolveStrapiMediaUrl(url);
  if (resolved.trim()) {
    set.add(resolved);
  }
}

export function collectCmsLevelPreloadUrls(
  level: DistrictLevelSummary | null | undefined,
  missionBonusCatalog: MissionBonusCatalog | null | undefined,
): string[] {
  if (!level) {
    return [];
  }

  const set = new Set<string>();
  pushResolved(set, level.previewImageUrl);
  pushResolved(set, level.unhappyMascotUrl);
  pushResolved(set, level.happyMascotUrl);
  pushResolved(set, level.superhappyMascotUrl);
  pushResolved(set, level.mission?.imageUrl);

  const puzzleItems = puzzleItemsOrEmpty(level);
  const bonusRows = bonusRowsFromPuzzleItems(puzzleItems);
  if (missionBonusCatalog) {
    for (const row of bonusRows) {
      const entry = missionBonusCatalog.get(row.id);
      pushResolved(set, entry?.imageUrl ?? null);
    }
  }

  return [...set];
}
