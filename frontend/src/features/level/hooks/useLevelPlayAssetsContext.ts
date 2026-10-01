import { useMemo } from "react";

import { fetchDistricts } from "@/api/services/bezirkService";
import { pickDistrictLevelSummary } from "@/api/mappers/enrichDistrictLevel";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import {
  findDistrictForLevel,
  findDistrictLevelInList,
} from "@/features/level/services/findDistrictForLevel";
import type { District, DistrictLevelSummary } from "@/types/content";

type Input = {
  introDistrict: District | null | undefined;
  cmsLevel: DistrictLevelSummary | null | undefined;
  introLevel: DistrictLevelSummary | null | undefined;
};

export function useLevelPlayAssetsContext(input: Input): {
  district: District | null;
  level: DistrictLevelSummary | null;
} {
  const districtsResource = useAsyncResource(fetchDistricts, []);
  const districts =
    districtsResource.status === "success" ? districtsResource.data : [];

  return useMemo(() => {
    const baseLevel = input.cmsLevel ?? input.introLevel ?? null;
    if (!baseLevel) {
      return { district: null, level: null };
    }

    const district =
      input.introDistrict?.bezirkId?.trim()
        ? input.introDistrict
        : findDistrictForLevel(districts, baseLevel);

    const fromList =
      district != null
        ? findDistrictLevelInList(district, baseLevel)
        : null;
    const level =
      fromList != null
        ? (pickDistrictLevelSummary(baseLevel, fromList) ?? baseLevel)
        : baseLevel;

    return {
      district: district ?? null,
      level,
    };
  }, [
    input.introDistrict,
    input.cmsLevel,
    input.introLevel,
    districts,
  ]);
}
