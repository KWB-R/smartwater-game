import { z } from "zod";
import { strapiBlocksSchema } from "./strapiCommon";

export const projektpartnerResponseSchema = z.object({
  data: z
    .object({
      id: z.number().optional(),
      documentId: z.string().optional(),
      collaborateContent: strapiBlocksSchema.nullable().optional(),
      collaborators: z.unknown().optional(),
      fundeByTitle: z.string().nullable().optional(),
      fundedByMedia: z.unknown().optional(),
      fundedByContent: strapiBlocksSchema.nullable().optional(),
    })
    .passthrough()
    .nullable(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
