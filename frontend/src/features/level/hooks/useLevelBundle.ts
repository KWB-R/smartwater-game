import { useMemo } from "react";

import {
  getLevelBundleForCms,
  getEmptyLevelBundle,
  type LevelBundle,
} from "@/features/level/services/loadLevelBundle";
import type { District, DistrictLevelSummary } from "@/types/content";

export type UseLevelBundleInput = {
  district: Pick<District, "bezirkId"> | null | undefined;
  level: Pick<
    DistrictLevelSummary,
    "id" | "slug" | "assetsFolder" | "documentId"
  > | null | undefined;
};

export function useLevelBundle(input: UseLevelBundleInput): LevelBundle {
  const { district, level } = input;
  const bezirkId = district?.bezirkId ?? "";
  const assetsFolder = level?.assetsFolder ?? "";
  const levelId = level?.id;
  const documentId = level?.documentId ?? "";
  const slug = level?.slug ?? "";
  return useMemo(() => {
    if (!level) {
      return getEmptyLevelBundle();
    }
    return getLevelBundleForCms(district, level);
  }, [district, level, bezirkId, assetsFolder, levelId, documentId, slug]);
}
