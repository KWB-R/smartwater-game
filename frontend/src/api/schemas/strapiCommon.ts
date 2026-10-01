import { z } from "zod";
import type { StrapiBlock, StrapiMedia } from "@/types/strapi";

export const strapiMediaSchema = z
  .object({
    id: z.number(),
    documentId: z.string().optional(),
    url: z.string(),
    name: z.string().optional(),
    alternativeText: z.string().nullable().optional(),
    caption: z.string().nullable().optional(),
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
    mime: z.string().optional(),
    formats: z
      .record(z.string(), z.object({ url: z.string() }).passthrough())
      .nullable()
      .optional(),
  })
  .passthrough();

export const strapiBlocksSchema = z.array(z.record(z.string(), z.unknown()));

export function parseStrapiMedia(value: unknown): StrapiMedia | null {
  const parsed = strapiMediaSchema.safeParse(value);
  return parsed.success ? (parsed.data as StrapiMedia) : null;
}

export function parseStrapiBlocks(value: unknown): StrapiBlock[] | null {
  if (value == null) return null;
  const parsed = strapiBlocksSchema.safeParse(value);
  return parsed.success ? (parsed.data as StrapiBlock[]) : null;
}

export function unwrapStrapiRelation<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "object" && value !== null && "data" in value) {
    const data = (value as { data: unknown }).data;
    if (data == null) return null;
    return data as T;
  }
  return value as T;
}

export function unwrapStrapiRelationList<T>(value: unknown): T[] {
  const raw = unwrapStrapiRelation<unknown>(value);
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as T[];
  return [];
}

/** Übernimmt Strapi-attributes auf die oberste Ebene für Antworten aus Strapi 4 und 5. */
export function normalizeStrapiDocument<T extends Record<string, unknown>>(
  value: unknown,
): T | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const attributes = record.attributes;
  if (attributes && typeof attributes === "object" && attributes !== null) {

    const { attributes: _attrs, ...rest } = record;
    return { ...rest, ...(attributes as Record<string, unknown>) } as T;
  }
  return record as T;
}

/** Liste von Komponenten oder einer Dynamic Zone, direkt als Array oder unter data. */
export function readStrapiComponentList(value: unknown): unknown[] {
  const unwrapped = unwrapStrapiRelation<unknown>(value);
  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

