import { toStrapiBlocks, type StrapiBlocks } from "@/api/types/strapi";
import { parseStrapiBlocks } from "@/api/schemas/strapiCommon";

export function mapBlocksField(value: unknown): StrapiBlocks | null {
  return toStrapiBlocks(parseStrapiBlocks(value));
}
