import { strapiFetch } from "@/api/client";
import { mapLevelFromDto } from "@/api/mappers/bezirkMapper";
import { levelSummarySchema } from "@/api/schemas/bezirkSchema";
import { levelDetailResponseSchema } from "@/api/schemas/levelSchema";
import { STRAPI_LEVEL_DETAIL_POPULATE } from "@/api/strapiPopulate";
import { toAppError } from "@/api/errors";
import { dedupeInflight } from "@/api/requestDedup";
import { isStrapiConfigured } from "@/lib/env";
import type { DistrictLevelSummary } from "@/types/content";
import { z } from "zod";

function levelDetailPath(id: string | number): string {
  return `/levels/${encodeURIComponent(String(id))}?${STRAPI_LEVEL_DETAIL_POPULATE}`;
}

function levelSlugFilterPath(slug: string): string {
  const filter = `filters[slug][$eq]=${encodeURIComponent(slug)}`;
  return `/levels?${filter}&pagination[pageSize]=1&${STRAPI_LEVEL_DETAIL_POPULATE}`;
}

const levelListResponseSchema = z.object({
  data: z.array(levelSummarySchema).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

async function fetchLevelByDocumentPath(
  id: string,
): Promise<DistrictLevelSummary | null> {
  const raw = await strapiFetch<unknown>(levelDetailPath(id));
  const parsed = levelDetailResponseSchema.parse(raw);
  if (!parsed.data) {
    return null;
  }
  return mapLevelFromDto(parsed.data);
}

async function fetchLevelBySlug(
  slug: string,
): Promise<DistrictLevelSummary | null> {
  const raw = await strapiFetch<unknown>(levelSlugFilterPath(slug));
  const parsed = levelListResponseSchema.parse(raw);
  const first = parsed.data?.[0];
  return first ? mapLevelFromDto(first) : null;
}

/** Fasst gleichzeitige Abrufe desselben Level-Slugs oder derselben documentId zusammen. */
export const fetchLevelSummaryById = dedupeInflight(
  async function loadLevelSummaryById(
    id: string | number,
  ): Promise<DistrictLevelSummary | null> {
    if (!isStrapiConfigured()) {
      return null;
    }
    const idStr = String(id).trim();
    if (!idStr) {
      return null;
    }
    try {
      const bySlug = await fetchLevelBySlug(idStr);
      if (bySlug) {
        return bySlug;
      }
    } catch {
      // Falls der Slug-Filter scheitert, den Dokumentpfad versuchen.
    }
    try {
      return await fetchLevelByDocumentPath(idStr);
    } catch (error) {
      throw toAppError(error);
    }
  },
  (id) => String(id),
);
