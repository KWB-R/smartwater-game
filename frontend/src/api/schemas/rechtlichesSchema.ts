import { z } from "zod";
import { strapiBlocksSchema } from "./strapiCommon";

export const rechtlichesResponseSchema = z.object({
  data: z
    .object({
      id: z.number().optional(),
      documentId: z.string().optional(),
      title: z.string().nullable().optional(),
      slug: z.string().nullable().optional(),
      content: strapiBlocksSchema.nullable().optional(),
    })
    .passthrough()
    .nullable(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
