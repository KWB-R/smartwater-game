import { resolveStrapiMediaUrl } from "@/api/media";
import type { MissionDto } from "@/api/schemas/missionSchema";
import { parseMissionType } from "@/api/schemas/missionSchema";
import { parseStrapiMedia } from "@/api/schemas/strapiCommon";
import type { MissionBonusByType, MissionBonusCatalog } from "@/types/mission";

function mapMissionBonusEntry(
  dto: MissionDto,
): MissionBonusByType | null {
  const type = parseMissionType(dto.type);
  if (!type) {
    return null;
  }
  const title = dto.title?.trim();
  if (!title) {
    return null;
  }
  const image = dto.image ? parseStrapiMedia(dto.image) : null;
  return {
    type,
    title,
    imageUrl: image?.url ? resolveStrapiMediaUrl(image.url) : null,
    imageAlt: image?.alternativeText?.trim() ?? title,
  };
}

export function mapMissionBonusCatalog(
  data: MissionDto[] | null | undefined,
): MissionBonusCatalog {
  const map = new Map<MissionBonusByType["type"], MissionBonusByType>();
  for (const dto of data ?? []) {
    const entry = mapMissionBonusEntry(dto);
    if (!entry) {
      continue;
    }
    map.set(entry.type, entry);
  }
  return map;
}
