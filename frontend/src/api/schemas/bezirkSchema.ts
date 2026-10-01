import { z } from "zod";
import { strapiBlocksSchema, strapiMediaSchema } from "./strapiCommon";

const maskottchenComponentSchema = z
  .object({
    happy: strapiMediaSchema.nullable().optional(),
    superhappy: strapiMediaSchema.nullable().optional(),
    unhappy: strapiMediaSchema.nullable().optional(),
  })
  .passthrough();

const missionSummarySchema = z
  .object({
    title: z.string().optional(),
    content: strapiBlocksSchema.nullable().optional(),
    image: strapiMediaSchema.nullable().optional(),
  })
  .passthrough();

const mapMarkerPositionSchema = z
  .object({
    x: z.number(),
    y: z.number(),
  })
  .passthrough();

export const levelSummarySchema = z
  .object({
    id: z.number(),
    documentId: z.string().optional(),
    slug: z.string().nullable().optional(),
    name: z.string().optional(),
    primaryLevel: z.boolean().optional(),
    shareable: z.boolean().optional(),
    assetsFolder: z.string().nullable().optional(),
    maxPuzzleItems: z.number().int().positive().nullable().optional(),
    minimumScorePercentage: z
      .number()
      .int()
      .min(1)
      .max(100)
      .nullable()
      .optional(),
    maskottchen: maskottchenComponentSchema.nullable().optional(),
    problemContent: strapiBlocksSchema.nullable().optional(),
    winContent: strapiBlocksSchema.nullable().optional(),
    winningContent: strapiBlocksSchema.nullable().optional(),
    quiz: z.unknown().optional(),
    mission: z.union([missionSummarySchema, z.null()]).optional(),
    puzzleItems: z.array(z.unknown()).optional(),
    mapMarkerPosition: mapMarkerPositionSchema.nullable().optional(),
  })
  .passthrough();

const bezirkSchema = z
  .object({
    id: z.number(),
    documentId: z.string().optional(),
    slug: z.string().nullable().optional(),
    bezirkId: z.string().nullable().optional(),
    name: z.string(),
    description: strapiBlocksSchema.nullable().optional(),
    image: strapiMediaSchema.nullable().optional(),
    namensOffset: mapMarkerPositionSchema.nullable().optional(),
    levels: z.unknown().optional(),
  })
  .passthrough();

export const bezirksListResponseSchema = z.object({
  data: z.array(bezirkSchema).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const bezirkDetailResponseSchema = z.object({
  data: bezirkSchema.nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type BezirkDto = z.infer<typeof bezirkSchema>;
export type LevelSummaryDto = z.infer<typeof levelSummarySchema>;
