import { z } from "zod";
import {
  isLevelBonusCategoryId,
  LEVEL_BONUS_CATEGORY_IDS,
} from "@/domain/levelBonusCategories";
import { strapiMediaSchema } from "./strapiCommon";

const missionTypeSchema = z.enum(LEVEL_BONUS_CATEGORY_IDS);

const missionDtoSchema = z
  .object({
    id: z.number(),
    documentId: z.string().optional(),
    title: z.string(),
    type: z.string(),
    image: strapiMediaSchema.nullable().optional(),
  })
  .passthrough();

export const missionsListResponseSchema = z.object({
  data: z.array(missionDtoSchema).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type MissionDto = z.infer<typeof missionDtoSchema>;

export function parseMissionType(
  value: string,
): z.infer<typeof missionTypeSchema> | null {
  if (!isLevelBonusCategoryId(value)) {
    return null;
  }
  const parsed = missionTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
