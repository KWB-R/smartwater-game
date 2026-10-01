import { z } from "zod";
import { strapiBlocksSchema } from "./strapiCommon";

export const homepageSlideSchema = z
  .object({
    id: z.number().optional(),
    documentId: z.string().optional(),
    content: strapiBlocksSchema.nullable().optional(),
    image: z.unknown().optional(),
  })
  .passthrough();

export const homepageResponseSchema = z.object({
  data: z
    .object({
      id: z.number().optional(),
      documentId: z.string().optional(),
      content: strapiBlocksSchema.nullable().optional(),
      slideshow: z.unknown().optional(),
    })
    .passthrough()
    .nullable(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
