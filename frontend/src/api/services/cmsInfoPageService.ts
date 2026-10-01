import { z } from "zod";
import { StrapiFetchError, strapiFetch } from "@/api/client";
import { toAppError } from "@/api/errors";
import { mapBlocksField } from "@/api/mappers/blocksMapper";
import { dedupeInflight } from "@/api/requestDedup";
import { strapiBlocksSchema } from "@/api/schemas/strapiCommon";
import { isStrapiConfigured } from "@/lib/env";
import type { CmsInfoPageContent } from "@/types/content";

const responseSchema = z.object({
  data: z
    .object({
      id: z.number().optional(),
      documentId: z.string().optional(),
      content: strapiBlocksSchema.nullable().optional(),
    })
    .passthrough()
    .nullable(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

/** Die drei Informationsseiten enthalten ausschließlich einen Blocks-Text. */
function createPageLoader(path: string) {
  const empty: CmsInfoPageContent = { content: null };

  return dedupeInflight(async (): Promise<CmsInfoPageContent> => {
    if (!isStrapiConfigured()) return empty;

    try {
      const raw = await strapiFetch<unknown>(path);
      const { data } = responseSchema.parse(raw);
      return { content: mapBlocksField(data?.content ?? null) };
    } catch (error) {
      // Fehlende Inhalte oder Zugriffsrechte führen zur vorgesehenen Ersatzansicht.
      if (
        error instanceof StrapiFetchError &&
        (error.status === 404 || error.status === 403)
      ) {
        return empty;
      }
      throw toAppError(error);
    }
  }, () => path);
}

export const fetchDesktopPage = createPageLoader("/desktoppage");
export const fetchNotFoundPage = createPageLoader("/not-found-page");
export const fetchPlaceholderPage = createPageLoader("/placeholderpage");
