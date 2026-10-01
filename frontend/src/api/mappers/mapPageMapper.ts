import { parseStrapiBlocks } from "@/api/schemas/strapiCommon";
import { toStrapiBlocks } from "@/api/types/strapi";
import type { MapPageContent } from "@/types/content";

export function mapMapPageResponse(
  data: {
    content?: unknown;
    usabilityContent?: unknown;
    usabilityContentAfterWinning?: unknown;
    winningContent?: unknown;
  } | null,
): MapPageContent {
  return {
    content: toStrapiBlocks(parseStrapiBlocks(data?.content ?? null)),
    usabilityContent: toStrapiBlocks(
      parseStrapiBlocks(data?.usabilityContent ?? null),
    ),
    usabilityContentAfterWinning: toStrapiBlocks(
      parseStrapiBlocks(data?.usabilityContentAfterWinning ?? null),
    ),
    winningContent: toStrapiBlocks(
      parseStrapiBlocks(data?.winningContent ?? null),
    ),
  };
}
