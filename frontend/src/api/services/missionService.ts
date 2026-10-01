import { strapiFetch } from "@/api/client";
import { mapMissionBonusCatalog } from "@/api/mappers/missionMapper";
import { missionsListResponseSchema } from "@/api/schemas/missionSchema";
import { toAppError } from "@/api/errors";
import { isStrapiConfigured } from "@/lib/env";
import type { MissionBonusCatalog } from "@/types/mission";

const MISSIONS_CATALOG_PATH =
  "/missions?populate=image&pagination[pageSize]=50";

export async function fetchMissionBonusCatalog(): Promise<MissionBonusCatalog> {
  if (!isStrapiConfigured()) {
    return new Map();
  }
  try {
    const raw = await strapiFetch<unknown>(MISSIONS_CATALOG_PATH);
    const parsed = missionsListResponseSchema.parse(raw);
    return mapMissionBonusCatalog(parsed.data);
  } catch (error) {
    throw toAppError(error);
  }
}
