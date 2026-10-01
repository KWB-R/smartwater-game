import { z } from "zod";
import { levelSummarySchema } from "./bezirkSchema";

export const levelDetailResponseSchema = z.object({
  data: levelSummarySchema.nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
