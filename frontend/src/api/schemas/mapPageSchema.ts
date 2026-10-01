import { z } from "zod";
import { strapiBlocksSchema } from "./strapiCommon";

export const mapPageResponseSchema = z.object({
  data: z
    .object({
      id: z.number().optional(),
      documentId: z.string().optional(),
      content: strapiBlocksSchema.nullable().optional(),
      usabilityContent: strapiBlocksSchema.nullable().optional(),
      usabilityContentAfterWinning: strapiBlocksSchema.nullable().optional(),
      winningContent: strapiBlocksSchema.nullable().optional(),
    })
    .passthrough()
    .nullable(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
