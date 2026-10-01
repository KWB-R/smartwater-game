import { StrapiFetchError, strapiFetch } from "@/api/client";
import {
  bezirkDetailResponseSchema,
  bezirksListResponseSchema,
} from "@/api/schemas/bezirkSchema";
import { mapBezirkDto, mapBezirksList } from "@/api/mappers/bezirkMapper";
import type { District } from "@/types/content";
import { toAppError } from "@/api/errors";
import { dedupeInflight } from "@/api/requestDedup";
import { isStrapiConfigured } from "@/lib/env";
import { STRAPI_LEVEL_MASKOTTCHEN_POPULATE } from "@/api/strapiPopulate";

/** image nicht als Beziehung laden: Das Feld existiert am Bezirk nicht und würde HTTP 400 auslösen. */
const BEZIRKS_LIST_PATH = `/bezirks?${STRAPI_LEVEL_MASKOTTCHEN_POPULATE}`;

function bezirkDetailPath(id: string | number): string {
  return `/bezirks/${encodeURIComponent(String(id))}?${STRAPI_LEVEL_MASKOTTCHEN_POPULATE}`;
}

/** Kartenrouten verwenden slug oder bezirkId; die Beziehung deshalb über Filter auflösen. */
function bezirkFilterPath(field: "slug" | "bezirkId", value: string): string {
  const filter = `filters[${field}][$eq]=${encodeURIComponent(value)}`;
  return `/bezirks?${filter}&pagination[pageSize]=1&${STRAPI_LEVEL_MASKOTTCHEN_POPULATE}`;
}

/** Fasst gleichzeitige Abrufe aus Karte, Medienvorbereitung und Menü zusammen. */
export const fetchDistricts = dedupeInflight(
  async function loadDistricts(): Promise<District[]> {
    if (!isStrapiConfigured()) {
      return [];
    }
    try {
      const raw = await strapiFetch<unknown>(BEZIRKS_LIST_PATH);
      const parsed = bezirksListResponseSchema.parse(raw);
      return mapBezirksList(parsed.data ?? []);
    } catch (error) {
      throw toAppError(error);
    }
  },
  () => "districts",
);

async function fetchDistrictByFilter(
  field: "slug" | "bezirkId",
  value: string,
  signal?: AbortSignal,
): Promise<District | null> {
  const raw = await strapiFetch<unknown>(bezirkFilterPath(field, value), {
    signal,
  });
  const parsed = bezirksListResponseSchema.parse(raw);
  const first = parsed.data?.[0];
  return first ? mapBezirkDto(first) : null;
}

async function fetchDistrictByDocumentPath(
  id: string,
  signal?: AbortSignal,
): Promise<District | null> {
  const raw = await strapiFetch<unknown>(bezirkDetailPath(id), { signal });
  const parsed = bezirkDetailResponseSchema.parse(raw);
  if (!parsed.data) return null;
  return mapBezirkDto(parsed.data);
}

/**
 * Löst den Routenparameter zunächst als slug oder bezirkId auf, dann als documentId.
 * Ein lesbarer Slug kann nicht direkt als Strapi-Dokumentpfad verwendet werden.
 */
export async function fetchDistrictById(
  id: string | number,
  signal?: AbortSignal,
): Promise<District | null> {
  if (!isStrapiConfigured()) {
    return null;
  }
  const idStr = String(id).trim();
  if (!idStr) {
    return null;
  }

  try {
    const bySlug = await fetchDistrictByFilter("slug", idStr, signal);
    if (bySlug) {
      return bySlug;
    }
  } catch {
    // Falls der Slug-Filter scheitert, bezirkId oder den Dokumentpfad versuchen.
  }

  try {
    const byBezirkId = await fetchDistrictByFilter("bezirkId", idStr, signal);
    if (byBezirkId) {
      return byBezirkId;
    }
  } catch {
    // Falls der Filter scheitert, den Dokumentpfad versuchen.
  }

  try {
    return await fetchDistrictByDocumentPath(idStr, signal);
  } catch (error) {
    if (error instanceof StrapiFetchError && error.status === 404) {
      return null;
    }
    throw toAppError(error);
  }
}
